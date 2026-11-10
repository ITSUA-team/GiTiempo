import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { normalizeEmail } from '../../commons/utils/normalize-email';
import {
  DecodedFirebaseToken,
  FirebaseAdminAuthError,
  FirebaseAdminService,
  FirebaseUserIdentity,
  InvitedFirebaseUser,
  RegisteredFirebaseUser,
} from './firebase-admin.interface';

/**
 * Test-only Firebase adapter. Tokens use `test:<uid>:<email>[:<name>[:<picture>]]`
 * with optional trailing controls: `:provider=<provider>`,
 * repeated `:google-subject=<subject>`, `:verified=false`, `:claim-email=absent`, and
 * `:live-email=absent`.
 */
@Injectable()
export class FakeFirebaseAdminService implements FirebaseAdminService {
  private readonly invitedUsers = new Map<string, InvitedFirebaseUser>();
  private readonly invitedUserEmailsByUid = new Map<string, string>();
  private readonly registeredUsers = new Map<string, RegisteredFirebaseUser>();
  private readonly registeredUserEmailsByUid = new Map<string, string>();
  private readonly alternativeProvidersByUid = new Map<string, Set<string>>();
  private readonly googleProvidersByUid = new Map<
    string,
    { subject: string; email?: string }
  >();
  private readonly usersByUid = new Map<string, FirebaseUserIdentity>();
  private readonly deletedUserUids = new Set<string>();

  async verifyIdToken(idToken: string): Promise<DecodedFirebaseToken> {
    if (typeof idToken !== 'string' || !idToken.startsWith('test:')) {
      throw new UnauthorizedException('Unauthorized');
    }
    const parts = idToken.split(':');
    let signInProvider = 'password';
    let emailVerified = true;
    const googleSubjects: string[] = [];
    let includeClaimEmail = true;
    let includeLiveEmail = true;
    while (parts.length > 3) {
      const trailing = parts.at(-1)!;
      if (trailing.startsWith('provider=')) {
        signInProvider = trailing.slice('provider='.length);
        parts.pop();
        continue;
      }
      if (trailing === 'verified=false') {
        emailVerified = false;
        parts.pop();
        continue;
      }
      if (trailing.startsWith('google-subject=')) {
        const subject = trailing.slice('google-subject='.length);
        if (subject) googleSubjects.unshift(subject);
        parts.pop();
        continue;
      }
      if (trailing === 'claim-email=absent') {
        includeClaimEmail = false;
        parts.pop();
        continue;
      }
      if (trailing === 'live-email=absent') {
        includeLiveEmail = false;
        parts.pop();
        continue;
      }
      break;
    }
    const [, uid, email, name, ...pictureParts] = parts;
    if (!uid || !email) {
      throw new UnauthorizedException('Unauthorized');
    }
    const picture = pictureParts.join(':');
    const normalizedEmail = normalizeEmail(email);
    const existing = this.usersByUid.get(uid);
    if (!existing && !this.deletedUserUids.has(uid)) {
      this.usersByUid.set(uid, {
        uid,
        ...(includeLiveEmail ? { email: normalizedEmail } : {}),
        emailVerified,
        disabled: false,
      });
    }
    if (signInProvider === 'google.com' && googleSubjects[0]) {
      this.googleProvidersByUid.set(uid, {
        subject: googleSubjects[0],
        email: normalizedEmail,
      });
    }
    return {
      uid,
      ...(includeClaimEmail ? { email } : {}),
      ...(name ? { name } : {}),
      ...(picture ? { picture } : {}),
      email_verified: emailVerified,
      signInProvider,
      ...(googleSubjects.length ? { googleSubjects } : {}),
    };
  }

  async assertActiveUserByUid(
    uid: string,
    email: string,
    googleSubject?: string,
  ): Promise<void> {
    const user = await this.getUserByUid(uid);
    const normalizedEmail = normalizeEmail(email);
    const googleProvider = this.googleProvidersByUid.get(uid);
    if (
      !user ||
      user.disabled ||
      (user.email && user.email !== normalizedEmail) ||
      (googleSubject &&
        (!googleProvider ||
          googleProvider.subject !== googleSubject ||
          (googleProvider.email &&
            googleProvider.email !== normalizedEmail))) ||
      (!user.email && !googleSubject)
    ) {
      throw new UnauthorizedException('Unauthorized');
    }
  }

  async getUserByUid(uid: string): Promise<FirebaseUserIdentity | null> {
    const user = this.usersByUid.get(uid);
    return user ? { ...user } : null;
  }

  async createUnclaimedUser(input: {
    uid: string;
    email: string;
  }): Promise<InvitedFirebaseUser> {
    const normalizedEmail = normalizeEmail(input.email);
    const existingEmailForUid = this.invitedUserEmailsByUid.get(input.uid);
    if (existingEmailForUid && existingEmailForUid !== normalizedEmail) {
      throw new FirebaseAdminAuthError(
        'auth/uid-already-exists',
        'Duplicate uid',
      );
    }
    const existing = this.invitedUsers.get(normalizedEmail);
    if (existing) {
      if (existing.uid !== input.uid) {
        throw new FirebaseAdminAuthError(
          'auth/email-already-exists',
          'Duplicate email',
        );
      }
      return { ...existing, isExistingUser: true };
    }
    const user = {
      uid: input.uid,
      email: normalizedEmail,
      isExistingUser: false,
    } satisfies InvitedFirebaseUser;
    this.invitedUsers.set(normalizedEmail, user);
    this.invitedUserEmailsByUid.set(input.uid, normalizedEmail);
    this.deletedUserUids.delete(input.uid);
    this.usersByUid.set(input.uid, {
      uid: input.uid,
      email: normalizedEmail,
      emailVerified: false,
      disabled: false,
    });
    return user;
  }

  async getOrCreateInvitedUserByEmail(
    email: string,
  ): Promise<InvitedFirebaseUser> {
    const normalizedEmail = normalizeEmail(email);
    const existingUser = this.invitedUsers.get(normalizedEmail);
    if (existingUser) {
      return { ...existingUser, isExistingUser: true };
    }

    const createdUser = {
      uid: `fake-firebase-${this.invitedUsers.size + 1}`,
      email: normalizedEmail,
      isExistingUser: false,
    } satisfies InvitedFirebaseUser;
    this.invitedUsers.set(normalizedEmail, createdUser);
    this.invitedUserEmailsByUid.set(createdUser.uid, normalizedEmail);
    this.deletedUserUids.delete(createdUser.uid);
    this.usersByUid.set(createdUser.uid, {
      uid: createdUser.uid,
      email: normalizedEmail,
      emailVerified: false,
      disabled: false,
    });
    return createdUser;
  }

  async createEmailPasswordUser(input: {
    uid?: string;
    email: string;
    password: string;
    displayName: string;
  }): Promise<RegisteredFirebaseUser> {
    const normalizedEmail = normalizeEmail(input.email);

    if (input.password.length < 8) {
      throw new FirebaseAdminAuthError(
        'auth/invalid-password',
        'Weak password',
      );
    }

    const existingUser =
      this.registeredUsers.get(normalizedEmail) ??
      this.invitedUsers.get(normalizedEmail);
    if (existingUser) {
      throw new FirebaseAdminAuthError(
        'auth/email-already-exists',
        'Duplicate email',
      );
    }

    const uid =
      input.uid ??
      `fake-firebase-user-${createHash('sha256')
        .update(normalizedEmail)
        .digest('hex')
        .slice(0, 16)}`;
    const createdUser = {
      uid,
      email: normalizedEmail,
      displayName: input.displayName,
    } satisfies RegisteredFirebaseUser;
    this.registeredUsers.set(normalizedEmail, createdUser);
    this.registeredUserEmailsByUid.set(createdUser.uid, normalizedEmail);
    this.deletedUserUids.delete(createdUser.uid);
    this.usersByUid.set(createdUser.uid, {
      uid: createdUser.uid,
      email: normalizedEmail,
      emailVerified: false,
      disabled: false,
    });

    return createdUser;
  }

  async deleteUser(uid: string): Promise<void> {
    const email = this.registeredUserEmailsByUid.get(uid);
    if (!email) {
      throw new ServiceUnavailableException(
        'Failed to delete Firebase registration user',
      );
    }

    this.registeredUserEmailsByUid.delete(uid);
    this.usersByUid.delete(uid);
    this.deletedUserUids.add(uid);
    this.alternativeProvidersByUid.delete(uid);
    this.googleProvidersByUid.delete(uid);
    this.registeredUsers.delete(email);
  }

  async hasUsableAlternativeLogin(firebaseUid: string): Promise<boolean> {
    const providers = this.alternativeProvidersByUid.get(firebaseUid);
    return (
      (providers?.has('password') ?? true) ||
      providers?.has('google.com') === true
    );
  }

  /** Test helper for provider-specific disconnect eligibility. */
  setAlternativeProviders(
    firebaseUid: string,
    providers: readonly string[],
  ): void {
    this.alternativeProvidersByUid.set(firebaseUid, new Set(providers));
  }

  /** Test helper for simulating Firebase account suspension. */
  setUserDisabled(uid: string, disabled: boolean): void {
    const user = this.usersByUid.get(uid);
    if (!user) return;
    this.usersByUid.set(uid, { ...user, disabled });
  }

  async generatePasswordSetupLink(
    email: string,
    continueUrl: string,
  ): Promise<string> {
    const normalizedEmail = normalizeEmail(email);
    const passwordSetupUrl = new URL(
      'http://localhost:5173/invites/password-setup',
    );
    passwordSetupUrl.searchParams.set('mode', 'resetPassword');
    passwordSetupUrl.searchParams.set(
      'oobCode',
      `fake-reset-${normalizedEmail}`,
    );
    passwordSetupUrl.searchParams.set('continueUrl', continueUrl);

    return passwordSetupUrl.toString();
  }
}
