/**
 * Minimal subset of Firebase's `DecodedIdToken` that `AuthService`
 * actually reads. Kept narrow so the test fake can match exactly and
 * so we stay insulated from upstream type changes.
 */
export interface DecodedFirebaseToken {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
}

export interface InvitedFirebaseUser {
  uid: string;
  email: string;
  isExistingUser: boolean;
}

/**
 * DI contract for verifying Firebase ID tokens. A real implementation
 * wraps `firebase-admin`; a fake implementation accepts deterministic
 * `test:<uid>:<email>[:<name>]` tokens for `NODE_ENV=test`.
 */
export interface FirebaseAdminService {
  verifyIdToken(idToken: string): Promise<DecodedFirebaseToken>;
  getOrCreateInvitedUserByEmail(email: string): Promise<InvitedFirebaseUser>;
  generatePasswordSetupLink(
    email: string,
    continueUrl: string,
  ): Promise<string>;
}

/** Nest DI token. */
export const FIREBASE_ADMIN = Symbol('FIREBASE_ADMIN');
