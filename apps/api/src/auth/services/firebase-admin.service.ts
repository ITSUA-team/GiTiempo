import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type UserRecord } from 'firebase-admin/auth';
import type { Env } from '../../config/env.validation';
import type {
  DecodedFirebaseToken,
  FirebaseAdminService,
  InvitedFirebaseUser,
} from './firebase-admin.interface';

const APP_NAME = 'gitiempo-api';
const PASSWORD_SETUP_QUERY_KEYS = ['mode', 'oobCode'] as const;

/**
 * Production Firebase Admin provider. Lazily initializes a single app
 * instance and verifies ID tokens with `checkRevoked = true`.
 *
 * Any verification failure is translated to `UnauthorizedException`
 * with a generic message so callers cannot leak internal details.
 */
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
      };
    } catch {
      throw new UnauthorizedException('Unauthorized');
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
        throw new Error('Failed to provision invited Firebase user');
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
          throw new Error('Failed to provision invited Firebase user');
        }
      }

      throw new Error('Failed to provision invited Firebase user');
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
      throw new Error('Failed to generate Firebase password setup link');
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
      // Env validation guarantees these in non-test envs, but guard just
      // in case this provider is accidentally instantiated in test mode.
      throw new Error(
        'Firebase Admin credentials are not configured. ' +
          'Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.',
      );
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
}

function isFirebaseAuthError(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}
