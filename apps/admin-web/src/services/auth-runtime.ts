import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import { getFirebaseAuth, hasFirebaseConfig } from "@/lib/firebase";
import {
  loginWithFirebaseToken,
  logoutAuthSession,
  refreshAuthSession,
} from "@/services/auth-client";
import { getCurrentUser } from "@/services/user-client";

export interface AuthRuntime {
  getCurrentUser: typeof getCurrentUser;
  loginWithFirebaseToken: typeof loginWithFirebaseToken;
  logoutSession: typeof logoutAuthSession;
  refreshSession: typeof refreshAuthSession;
  signInWithEmailPassword: typeof signInWithEmailPasswordRuntime;
  signInWithGoogle: typeof signInWithGoogleRuntime;
  signOutIdentityProvider: typeof signOutIdentityProviderRuntime;
}

async function signInWithEmailPasswordRuntime(
  email: string,
  password: string,
): Promise<string> {
  const userCredential = await signInWithEmailAndPassword(
    getFirebaseAuth(),
    email,
    password,
  );

  return userCredential.user.getIdToken();
}

async function signInWithGoogleRuntime(): Promise<string> {
  const provider = new GoogleAuthProvider();
  provider.addScope("profile");
  provider.addScope("email");

  const userCredential = await signInWithPopup(getFirebaseAuth(), provider);

  return userCredential.user.getIdToken();
}

async function signOutIdentityProviderRuntime(): Promise<void> {
  if (!hasFirebaseConfig()) {
    return;
  }

  await signOut(getFirebaseAuth());
}

const defaultAuthRuntime: AuthRuntime = {
  getCurrentUser,
  loginWithFirebaseToken,
  logoutSession: logoutAuthSession,
  refreshSession: refreshAuthSession,
  signInWithEmailPassword: signInWithEmailPasswordRuntime,
  signInWithGoogle: signInWithGoogleRuntime,
  signOutIdentityProvider: signOutIdentityProviderRuntime,
};

let authRuntime: AuthRuntime = defaultAuthRuntime;

export function getAuthRuntime(): AuthRuntime {
  return authRuntime;
}

export function setAuthRuntimeForTesting(runtime: AuthRuntime): void {
  authRuntime = runtime;
}

export function resetAuthRuntimeForTesting(): void {
  authRuntime = defaultAuthRuntime;
}
