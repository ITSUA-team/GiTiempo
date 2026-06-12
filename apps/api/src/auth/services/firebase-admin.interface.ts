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

export interface RegisteredFirebaseUser {
  uid: string;
  email: string;
  displayName?: string | null;
}

export class FirebaseAdminAuthError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'FirebaseAdminAuthError';
  }
}

/**
 * DI contract for verifying Firebase ID tokens. A real implementation
 * wraps `firebase-admin`; a fake implementation accepts deterministic
 * `test:<uid>:<email>[:<name>]` tokens for `NODE_ENV=test`.
 */
export interface FirebaseAdminService {
  verifyIdToken(idToken: string): Promise<DecodedFirebaseToken>;
  createEmailPasswordUser(input: {
    email: string;
    password: string;
    displayName: string;
  }): Promise<RegisteredFirebaseUser>;
  deleteUser(uid: string): Promise<void>;
  getOrCreateInvitedUserByEmail(email: string): Promise<InvitedFirebaseUser>;
  generatePasswordSetupLink(
    email: string,
    continueUrl: string,
  ): Promise<string>;
}

/** Nest DI token. */
export const FIREBASE_ADMIN = Symbol('FIREBASE_ADMIN');
