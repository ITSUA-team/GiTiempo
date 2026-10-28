import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type Auth,
} from "firebase/auth";

import type { AuthHttpClient } from "./http-client";
import type { CurrentUserClient } from "./current-user-client";

export type FirebaseSignInResult =
  | string
  | {
      firebaseIdToken: string;
      googleIdToken?: string;
    };

export function getFirebaseSignInTokens(result: FirebaseSignInResult): {
  firebaseIdToken: string;
  googleIdToken?: string;
} {
  return typeof result === "string" ? { firebaseIdToken: result } : result;
}

export interface AuthRuntime {
  getCurrentUser: CurrentUserClient["getCurrentUser"];
  listCurrentUserWorkspaces: CurrentUserClient["listCurrentUserWorkspaces"];
  loginWithFirebaseToken: AuthHttpClient["loginWithFirebaseToken"];
  exchangeGithubSession: AuthHttpClient["exchangeGithubSession"];
  logoutSession: AuthHttpClient["logoutAuthSession"];
  registerWorkspaceOwner: AuthHttpClient["registerWorkspaceOwner"];
  refreshSession: AuthHttpClient["refreshAuthSession"];
  switchWorkspace: AuthHttpClient["switchWorkspace"];
  signInWithEmailPassword(
    email: string,
    password: string,
  ): Promise<string>;
  signInWithGoogle(): Promise<FirebaseSignInResult>;
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

  async function signInWithGoogle(): Promise<FirebaseSignInResult> {
    const provider = new GoogleAuthProvider();
    provider.addScope("profile");
    provider.addScope("email");

    const userCredential = await signInWithPopup(getFirebaseAuth(), provider);

    const credential = GoogleAuthProvider.credentialFromResult(userCredential);

    return {
      firebaseIdToken: await userCredential.user.getIdToken(),
      ...(credential?.idToken ? { googleIdToken: credential.idToken } : {}),
    };
  }

  async function signOutIdentityProvider(): Promise<void> {
    if (!hasFirebaseConfig()) {
      return;
    }

    await signOut(getFirebaseAuth());
  }

  return {
    getCurrentUser: currentUserClient.getCurrentUser,
    listCurrentUserWorkspaces: currentUserClient.listCurrentUserWorkspaces,
    loginWithFirebaseToken: authClient.loginWithFirebaseToken,
    exchangeGithubSession: authClient.exchangeGithubSession,
    logoutSession: authClient.logoutAuthSession,
    registerWorkspaceOwner: authClient.registerWorkspaceOwner,
    refreshSession: authClient.refreshAuthSession,
    switchWorkspace: authClient.switchWorkspace,
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
