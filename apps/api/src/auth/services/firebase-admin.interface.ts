/** Narrow subset of Firebase token fields used by the app. */
export interface DecodedFirebaseToken {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
  /** Firebase's trusted `firebase.sign_in_provider` token claim. */
  signInProvider?: string;
}

/** Authoritative Firebase account data used to prove ownership of an identity. */
export interface FirebaseUserIdentity {
  uid: string;
  email?: string;
  emailVerified: boolean;
  disabled: boolean;
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
  getUserByUid(uid: string): Promise<FirebaseUserIdentity | null>;
  assertActiveUserByUid(uid: string, email: string): Promise<void>;
  createEmailPasswordUser(input: {
    uid?: string;
    email: string;
    password: string;
    displayName: string;
  }): Promise<RegisteredFirebaseUser>;
  createUnclaimedUser(input: {
    uid: string;
    email: string;
  }): Promise<InvitedFirebaseUser>;
  deleteUser(uid: string): Promise<void>;
  getOrCreateInvitedUserByEmail(email: string): Promise<InvitedFirebaseUser>;
  generatePasswordSetupLink(
    email: string,
    continueUrl: string,
  ): Promise<string>;
  /** Whether Firebase has a server-verified non-GitHub credential for this user. */
  hasUsableAlternativeLogin(firebaseUid: string): Promise<boolean>;
}

export const FIREBASE_ADMIN = Symbol('FIREBASE_ADMIN');
