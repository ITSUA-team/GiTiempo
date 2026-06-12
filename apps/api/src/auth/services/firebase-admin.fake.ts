import { Injectable, UnauthorizedException } from '@nestjs/common';
import { normalizeEmail } from '../../commons/utils/normalize-email';
import {
  DecodedFirebaseToken,
  FirebaseAdminAuthError,
  FirebaseAdminService,
  InvitedFirebaseUser,
  RegisteredFirebaseUser,
} from './firebase-admin.interface';

/**
 * Test-only fake that accepts tokens of the form:
 *
 *   `test:<uid>:<email>[:<name>]`
 *
 * Anything else is rejected with `UnauthorizedException`. Bound in place
 * of the real provider when `NODE_ENV === 'test'` so e2e runs do not
 * need real Firebase credentials.
 *
 * The returned object shape matches the subset of `DecodedIdToken` that
 * `AuthService` and `UsersService.upsertFromFirebase` consume.
 */
@Injectable()
export class FakeFirebaseAdminService implements FirebaseAdminService {
  private readonly invitedUsers = new Map<string, InvitedFirebaseUser>();
  private readonly registeredUsers = new Map<string, RegisteredFirebaseUser>();
  private readonly registeredUserEmailsByUid = new Map<string, string>();

  async verifyIdToken(idToken: string): Promise<DecodedFirebaseToken> {
    if (typeof idToken !== 'string' || !idToken.startsWith('test:')) {
      throw new UnauthorizedException('Unauthorized');
    }
    const [, uid, email, name] = idToken.split(':');
    if (!uid || !email) {
      throw new UnauthorizedException('Unauthorized');
    }
    return {
      uid,
      email,
      ...(name ? { name } : {}),
      email_verified: true,
    };
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
    return createdUser;
  }

  async createEmailPasswordUser(input: {
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

    const createdUser = {
      uid: `fake-firebase-user-${this.registeredUsers.size + 1}`,
      email: normalizedEmail,
      displayName: input.displayName,
    } satisfies RegisteredFirebaseUser;
    this.registeredUsers.set(normalizedEmail, createdUser);
    this.registeredUserEmailsByUid.set(createdUser.uid, normalizedEmail);

    return createdUser;
  }

  async deleteUser(uid: string): Promise<void> {
    const email = this.registeredUserEmailsByUid.get(uid);
    if (!email) {
      throw new Error('Failed to delete Firebase registration user');
    }

    this.registeredUserEmailsByUid.delete(uid);
    this.registeredUsers.delete(email);
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
