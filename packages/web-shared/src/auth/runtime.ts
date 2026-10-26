import {
  GoogleAuthProvider,
  confirmPasswordReset as firebaseConfirmPasswordReset,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  verifyPasswordResetCode as firebaseVerifyPasswordResetCode,
  type Auth,
} from "firebase/auth";

import type { AuthHttpClient } from "./http-client";
import type { CurrentUserClient } from "./current-user-client";


export interface AuthRuntime {
  getCurrentUser: CurrentUserClient["getCurrentUser"];
  listCurrentUserWorkspaces: CurrentUserClient["listCurrentUserWorkspaces"];
  loginWithFirebaseToken: AuthHttpClient["loginWithFirebaseToken"];
  exchangeGithubSession: AuthHttpClient["exchangeGithubSession"];
  logoutSession: AuthHttpClient["logoutAuthSession"];
  registerWorkspaceOwner: AuthHttpClient["registerWorkspaceOwner"];
  refreshSession: AuthHttpClient["refreshAuthSession"];
  switchWorkspace: AuthHttpClient["switchWorkspace"];
  signInWithEmailPassword(email: string, password: string): Promise<string>;
  signInWithGoogle(): Promise<string>;
  signOutIdentityProvider(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  verifyPasswordResetCode(oobCode: string): Promise<string>;
  confirmPasswordReset(oobCode: string, newPassword: string): Promise<void>;
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

  function getResetPasswordContinueUrl(): string {
    const origin =
      typeof window === "undefined" ? "http://localhost" : window.location.origin;

    return `${origin}/auth/reset-password`;
  }

  async function requestPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(getFirebaseAuth(), email, {
      url: getResetPasswordContinueUrl(),
      handleCodeInApp: true,
    });
  }

  async function verifyPasswordResetCode(oobCode: string): Promise<string> {
    return firebaseVerifyPasswordResetCode(getFirebaseAuth(), oobCode);
  }

  async function confirmPasswordReset(
    oobCode: string,
    newPassword: string,
  ): Promise<void> {
    await firebaseConfirmPasswordReset(getFirebaseAuth(), oobCode, newPassword);
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
    requestPasswordReset,
    verifyPasswordResetCode,
    confirmPasswordReset,
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
