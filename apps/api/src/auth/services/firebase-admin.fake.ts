import { Injectable, UnauthorizedException } from '@nestjs/common';
import type {
  DecodedFirebaseToken,
  FirebaseAdminService,
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
}
