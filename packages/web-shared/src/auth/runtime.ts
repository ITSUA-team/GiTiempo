import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type Auth,
} from "firebase/auth";

import type { AuthHttpClient } from "./http-client";
import type { CurrentUserClient } from "./current-user-client";

/* eslint-disable no-unused-vars */

export interface AuthRuntime {
  getCurrentUser: CurrentUserClient["getCurrentUser"];
  loginWithFirebaseToken: AuthHttpClient["loginWithFirebaseToken"];
  logoutSession: AuthHttpClient["logoutAuthSession"];
  refreshSession: AuthHttpClient["refreshAuthSession"];
  signInWithEmailPassword(email: string, password: string): Promise<string>;
  signInWithGoogle(): Promise<string>;
  signOutIdentityProvider(): Promise<void>;
  updateCurrentUser: CurrentUserClient["updateCurrentUser"];
}

interface DefaultAuthRuntimeOptions {
  authClient: AuthHttpClient;
  currentUserClient: CurrentUserClient;
  getFirebaseAuth(): Auth;
  hasFirebaseConfig(): boolean;
}

export function createDefaultAuthRuntime({
  authClient,
  currentUserClient,
  getFirebaseAuth,
  hasFirebaseConfig,
}: DefaultAuthRuntimeOptions): AuthRuntime {
  async function signInWithEmailPassword(
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

  async function signInWithGoogle(): Promise<string> {
    const provider = new GoogleAuthProvider();
    provider.addScope("profile");
    provider.addScope("email");

    const userCredential = await signInWithPopup(getFirebaseAuth(), provider);

    return userCredential.user.getIdToken();
  }

  async function signOutIdentityProvider(): Promise<void> {
    if (!hasFirebaseConfig()) {
      return;
    }

    await signOut(getFirebaseAuth());
  }

  return {
    getCurrentUser: currentUserClient.getCurrentUser,
    loginWithFirebaseToken: authClient.loginWithFirebaseToken,
    logoutSession: authClient.logoutAuthSession,
    refreshSession: authClient.refreshAuthSession,
    signInWithEmailPassword,
    signInWithGoogle,
    signOutIdentityProvider,
    updateCurrentUser: currentUserClient.updateCurrentUser,
  };
}

export function createAuthRuntimeController(defaultAuthRuntime: AuthRuntime): {
  getAuthRuntime(): AuthRuntime;
  resetAuthRuntimeForTesting(): void;
  setAuthRuntimeForTesting(runtime: AuthRuntime): void;
} {
  /* eslint-enable no-unused-vars */
  let authRuntime = defaultAuthRuntime;

  return {
    getAuthRuntime() {
      return authRuntime;
    },
    resetAuthRuntimeForTesting() {
      authRuntime = defaultAuthRuntime;
    },
    setAuthRuntimeForTesting(runtime) {
      authRuntime = runtime;
    },
  };
}
