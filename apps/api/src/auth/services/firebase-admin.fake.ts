import { Injectable, UnauthorizedException } from '@nestjs/common';
import { normalizeEmail } from '../../commons/utils/normalize-email';
import type {
  DecodedFirebaseToken,
  FirebaseAdminService,
  InvitedFirebaseUser,
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
