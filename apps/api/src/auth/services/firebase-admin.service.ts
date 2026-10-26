import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type UserRecord } from 'firebase-admin/auth';
import type { Env } from '../../config/env.validation';
import type {
  DecodedFirebaseToken,
  FirebaseAdminService,
  FirebaseUserIdentity,
  InvitedFirebaseUser,
  RegisteredFirebaseUser,
} from './firebase-admin.interface';
import { FirebaseAdminAuthError } from './firebase-admin.interface';

const APP_NAME = 'gitiempo-api';
const PASSWORD_SETUP_QUERY_KEYS = ['mode', 'oobCode'] as const;

/** Firebase Admin adapter for non-test environments. */
@Injectable()
export class RealFirebaseAdminService implements FirebaseAdminService {
  private app: App | null = null;

  constructor(private readonly config: ConfigService<Env, true>) {}

  async verifyIdToken(idToken: string): Promise<DecodedFirebaseToken> {
    const app = this.getApp();
    try {
      const decoded = await getAuth(app).verifyIdToken(idToken, true);
      return {
        uid: decoded.uid,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
        email_verified: decoded.email_verified,
        signInProvider: decoded.firebase?.sign_in_provider,
      };
    } catch {
      throw new UnauthorizedException('Unauthorized');
    }
  }

  async assertActiveUserByUid(uid: string, email: string): Promise<void> {
    try {
      const user = await this.getUserByUid(uid);
      if (
        !user ||
        user.uid !== uid ||
        user.disabled ||
        user.email?.trim().toLowerCase() !== email.trim().toLowerCase()
      ) {
        throw new UnauthorizedException('Unauthorized');
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Unauthorized');
    }
  }

  async getUserByUid(uid: string): Promise<FirebaseUserIdentity | null> {
    try {
      const user = await getAuth(this.getApp()).getUser(uid);
      return {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        disabled: user.disabled,
      };
    } catch (error) {
      if (isFirebaseAuthError(error, 'auth/user-not-found')) return null;
      throw new ServiceUnavailableException('Failed to lookup Firebase user');
    }
  }

  async createEmailPasswordUser(input: {
    uid?: string;
    email: string;
    password: string;
    displayName: string;
  }): Promise<RegisteredFirebaseUser> {
    try {
      const user = await getAuth(this.getApp()).createUser({
        uid: input.uid,
        displayName: input.displayName,
        email: input.email,
        emailVerified: false,
        password: input.password,
      });

      return {
        uid: user.uid,
        email: user.email ?? input.email,
        displayName: user.displayName ?? input.displayName,
      };
    } catch (error) {
      throw this.toFirebaseAdminAuthError(
        error,
        'Failed to provision Firebase registration user',
      );
    }
  }

  async deleteUser(uid: string): Promise<void> {
    try {
      await getAuth(this.getApp()).deleteUser(uid);
    } catch {
      throw new ServiceUnavailableException(
        'Failed to delete Firebase registration user',
      );
    }
  }

  async hasUsableAlternativeLogin(firebaseUid: string): Promise<boolean> {
    try {
      const user = await getAuth(this.getApp()).getUser(firebaseUid);
      if (user.uid !== firebaseUid || user.disabled) return false;
      return user.providerData.some(
        (provider) =>
          (provider.providerId === 'password' && Boolean(provider.email)) ||
          (provider.providerId === 'google.com' && Boolean(provider.uid)),
      );
    } catch {
      throw new ServiceUnavailableException(
        'Failed to verify Firebase sign-in providers',
      );
    }
  }

  async getOrCreateInvitedUserByEmail(
    email: string,
  ): Promise<InvitedFirebaseUser> {
    const auth = getAuth(this.getApp());

    try {
      const user = await auth.getUserByEmail(email);
      return this.toInvitedUser(user, true);
    } catch (error) {
      if (!isFirebaseAuthError(error, 'auth/user-not-found')) {
        throw new ServiceUnavailableException(
          'Failed to provision invited Firebase user',
        );
      }
    }

    try {
      const user = await auth.createUser({ email, emailVerified: false });
      return this.toInvitedUser(user, false);
    } catch (error) {
      if (isFirebaseAuthError(error, 'auth/email-already-exists')) {
        try {
          const user = await auth.getUserByEmail(email);
          return this.toInvitedUser(user, true);
        } catch {
          throw new ServiceUnavailableException(
            'Failed to provision invited Firebase user',
          );
        }
      }

      throw new ServiceUnavailableException(
        'Failed to provision invited Firebase user',
      );
    }
  }

  async createUnclaimedUser(input: {
    uid: string;
    email: string;
  }): Promise<InvitedFirebaseUser> {
    try {
      const user = await getAuth(this.getApp()).createUser({
        uid: input.uid,
        email: input.email,
        emailVerified: false,
      });
      return this.toInvitedUser(user, false);
    } catch (error) {
      if (isFirebaseAuthError(error, 'auth/uid-already-exists')) {
        try {
          const existing = await getAuth(this.getApp()).getUser(input.uid);
          if (
            !existing.disabled &&
            existing.email?.trim().toLowerCase() ===
              input.email.trim().toLowerCase()
          ) {
            return this.toInvitedUser(existing, true);
          }
        } catch {
          // Fall through to the opaque provisioning failure below.
        }
      }
      throw this.toFirebaseAdminAuthError(
        error,
        'Failed to provision Firebase identity',
      );
    }
  }

  async generatePasswordSetupLink(
    email: string,
    continueUrl: string,
  ): Promise<string> {
    try {
      const resetLink = await getAuth(this.getApp()).generatePasswordResetLink(
        email,
        { url: continueUrl },
      );

      return this.buildPasswordSetupUrl(resetLink, continueUrl);
    } catch {
      throw new ServiceUnavailableException(
        'Failed to generate Firebase password setup link',
      );
    }
  }

  private buildPasswordSetupUrl(
    resetLink: string,
    continueUrl: string,
  ): string {
    const firebaseActionUrl = new URL(resetLink);
    const passwordSetupUrl = new URL(
      '/invites/password-setup',
      this.getUserSpaUrl(),
    );

    for (const key of PASSWORD_SETUP_QUERY_KEYS) {
      const value = firebaseActionUrl.searchParams.get(key);
      if (value) {
        passwordSetupUrl.searchParams.set(key, value);
      }
    }

    const inviteReturnUrl =
      firebaseActionUrl.searchParams.get('continueUrl') ?? continueUrl;
    passwordSetupUrl.searchParams.set('continueUrl', inviteReturnUrl);

    return passwordSetupUrl.toString();
  }

  private getUserSpaUrl(): string {
    return this.config.get('USER_SPA_URL', { infer: true });
  }

  private getApp(): App {
    if (this.app) return this.app;
    const existing = getApps().find((a) => a.name === APP_NAME);
    if (existing) {
      this.app = existing;
      return existing;
    }
    const projectId = this.config.get('FIREBASE_PROJECT_ID', { infer: true });
    const clientEmail = this.config.get('FIREBASE_CLIENT_EMAIL', {
      infer: true,
    });
    const privateKey = this.config.get('FIREBASE_PRIVATE_KEY', {
      infer: true,
    });
    if (!projectId || !clientEmail || !privateKey) {
      throw new ServiceUnavailableException(
        'Firebase Admin credentials are not configured. ' +
          'Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.',
      );
    }
    // firebase-admin reads FIREBASE_AUTH_EMULATOR_HOST from process.env at
    // initialization time. @nestjs/config may not propagate unknown keys to
    // process.env, so set it explicitly from the validated config.
    const emulatorHost = this.config.get('FIREBASE_AUTH_EMULATOR_HOST', {
      infer: true,
    });
    if (emulatorHost) {
      process.env.FIREBASE_AUTH_EMULATOR_HOST = emulatorHost;
    }
    this.app = initializeApp(
      {
        credential: cert({ projectId, clientEmail, privateKey }),
      },
      APP_NAME,
    );
    return this.app;
  }

  private toInvitedUser(
    user: UserRecord,
    isExistingUser: boolean,
  ): InvitedFirebaseUser {
    return {
      uid: user.uid,
      email: user.email ?? '',
      isExistingUser,
    };
  }

  private toFirebaseAdminAuthError(
    error: unknown,
    fallbackMessage: string,
  ): FirebaseAdminAuthError {
    const code =
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof error.code === 'string'
        ? error.code
        : 'auth/internal-error';

    return new FirebaseAdminAuthError(code, fallbackMessage);
  }
}

function isFirebaseAuthError(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}
