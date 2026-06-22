/** Narrow subset of Firebase token fields used by the app. */
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

/** Shared contract for the real and test Firebase adapters. */
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

export const FIREBASE_ADMIN = Symbol('FIREBASE_ADMIN');
