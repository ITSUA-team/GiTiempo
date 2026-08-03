import type {
  TokenPairResponse,
  UpdateUserInput,
  UserResponse,
} from "@gitiempo/shared";
import { computed, ref, shallowRef } from "vue";

import {
  clearRefreshToken,
  getRefreshToken,
  setRefreshToken,
} from "../session-storage";
import type { AuthRuntime } from "./runtime";

const SESSION_EXPIRED_MESSAGE =
  "Your session has expired. Please sign in again.";

interface AuthSessionCoreOptions {
  getAuthRuntime(): AuthRuntime;
  onClearSession?: () => void;
  onSessionContextChanged?: () => void;
}

export type WorkspaceSwitchSessionResult =
  | {
      profileReloaded: true;
      profileReloadError: null;
    }
  | {
      profileReloaded: false;
      profileReloadError: unknown;
    };

export function createAuthSessionCore({
  getAuthRuntime,
  onClearSession,
  onSessionContextChanged,
}: AuthSessionCoreOptions) {
  const accessToken = ref<string | null>(null);
  const bootstrapComplete = ref(false);
  const isBootstrapping = ref(false);
  const profile = shallowRef<UserResponse | null>(null);
  const isSubmitting = ref(false);

  let bootstrapPromise: Promise<void> | null = null;
  let refreshAccessPromise: Promise<string> | null = null;

  const isAuthenticated = computed(() => accessToken.value !== null);

  function applyTokenPair(tokenPair: TokenPairResponse): void {
    accessToken.value = tokenPair.accessToken;
    setRefreshToken(tokenPair.refreshToken);
  }

  function clearSession(): void {
    accessToken.value = null;
    profile.value = null;
    onClearSession?.();
    clearRefreshToken();
  }

  function completeBootstrap(): void {
    bootstrapComplete.value = true;
  }

  function clearSessionAndCompleteBootstrap(): void {
    clearSession();
    completeBootstrap();
  }

  async function loadCurrentUser(nextAccessToken: string): Promise<void> {
    try {
      profile.value = await getAuthRuntime().getCurrentUser(nextAccessToken);
    } catch {
      profile.value = null;
    }
  }

  async function restoreSessionFromRefreshToken(): Promise<void> {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      clearSession();
      return;
    }

    const tokenPair = await getAuthRuntime().refreshSession(refreshToken);
    applyTokenPair(tokenPair);
    await loadCurrentUser(tokenPair.accessToken);
  }

  async function runBootstrapSession(): Promise<void> {
    isBootstrapping.value = true;

    try {
      await restoreSessionFromRefreshToken();
    } catch {
      clearSession();
    } finally {
      completeBootstrap();
      isBootstrapping.value = false;
      bootstrapPromise = null;
    }
  }

  function bootstrapSession(): Promise<void> {
    if (bootstrapComplete.value) {
      return Promise.resolve();
    }

    bootstrapPromise ??= runBootstrapSession();

    return bootstrapPromise;
  }

  async function refreshStoredAccessToken(): Promise<string> {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      clearSessionAndCompleteBootstrap();
      throw new Error(SESSION_EXPIRED_MESSAGE);
    }

    try {
      const tokenPair = await getAuthRuntime().refreshSession(refreshToken);
      applyTokenPair(tokenPair);
      completeBootstrap();

      return tokenPair.accessToken;
    } catch (error) {
      clearSessionAndCompleteBootstrap();
      throw error;
    }
  }

  async function runAccessTokenRefresh(): Promise<string> {
    try {
      return await refreshStoredAccessToken();
    } finally {
      refreshAccessPromise = null;
    }
  }

  function refreshAccessToken(): Promise<string> {
    refreshAccessPromise ??= runAccessTokenRefresh();

    return refreshAccessPromise;
  }

  async function exchangeFirebaseIdToken(firebaseIdToken: string): Promise<void> {
    const tokenPair = await getAuthRuntime().loginWithFirebaseToken(
      firebaseIdToken,
    );

    await establishSessionFromTokenPair(tokenPair);
  }

  // Backend GitHub sign-in returns a one-time handoff code (not a Firebase
  // token); exchange it for the normal session token pair.
  async function exchangeGithubHandoff(code: string): Promise<void> {
    const tokenPair = await getAuthRuntime().exchangeGithubSession(code);

    await establishSessionFromTokenPair(tokenPair);
  }

  async function establishSessionFromTokenPair(
    tokenPair: TokenPairResponse,
  ): Promise<void> {
    onSessionContextChanged?.();
    applyTokenPair(tokenPair);
    await loadCurrentUser(tokenPair.accessToken);
    completeBootstrap();
  }

  async function switchWorkspace(
    workspaceId: string,
  ): Promise<WorkspaceSwitchSessionResult> {
    const currentAccessToken = accessToken.value;
    const currentRefreshToken = getRefreshToken();

    if (!currentAccessToken || !currentRefreshToken) {
      throw new Error(SESSION_EXPIRED_MESSAGE);
    }

    const tokenPair = await getAuthRuntime().switchWorkspace(
      currentAccessToken,
      currentRefreshToken,
      workspaceId,
    );
    onSessionContextChanged?.();
    applyTokenPair(tokenPair);
    profile.value = null;

    try {
      profile.value = await getAuthRuntime().getCurrentUser(tokenPair.accessToken);

      return {
        profileReloaded: true,
        profileReloadError: null,
      };
    } catch (profileReloadError) {
      return {
        profileReloaded: false,
        profileReloadError,
      };
    } finally {
      completeBootstrap();
    }
  }

  async function runSubmittingLogin(login: () => Promise<void>): Promise<void> {
    isSubmitting.value = true;

    try {
      await login();
    } catch (error) {
      clearSessionAndCompleteBootstrap();
      throw error;
    } finally {
      isSubmitting.value = false;
    }
  }

  function loginWithGithubSession(code: string): Promise<void> {
    return runSubmittingLogin(() => exchangeGithubHandoff(code));
  }

  function loginWithFirebaseToken(firebaseIdToken: string): Promise<void> {
    return runSubmittingLogin(() => exchangeFirebaseIdToken(firebaseIdToken));
  }

  function loginWithEmailPassword(
    email: string,
    password: string,
  ): Promise<void> {
    return runSubmittingLogin(async () => {
      const firebaseIdToken = await getAuthRuntime().signInWithEmailPassword(
        email,
        password,
      );

      await exchangeFirebaseIdToken(firebaseIdToken);
    });
  }

  function loginWithGoogle(): Promise<void> {
    return runSubmittingLogin(async () => {
      const firebaseIdToken = await getAuthRuntime().signInWithGoogle();

      await exchangeFirebaseIdToken(firebaseIdToken);
    });
  }

  async function logoutApiSession(
    currentAccessToken: string,
    refreshToken: string,
  ): Promise<void> {
    try {
      await getAuthRuntime().logoutSession(currentAccessToken, refreshToken);
    } catch {
      // The local client session still needs to be cleared on logout.
    }
  }

  async function logoutIdentityProvider(): Promise<void> {
    try {
      await getAuthRuntime().signOutIdentityProvider();
    } catch {
      // The local API session is the source of truth for access control.
    }
  }

  async function logout(): Promise<void> {
    const refreshToken = getRefreshToken();
    const currentAccessToken = accessToken.value;

    try {
      if (currentAccessToken && refreshToken) {
        await logoutApiSession(currentAccessToken, refreshToken);
      }
    } finally {
      clearSession();
      completeBootstrap();
      await logoutIdentityProvider();
    }
  }

  async function updateProfile(input: UpdateUserInput): Promise<UserResponse> {
    if (!accessToken.value) {
      throw new Error(SESSION_EXPIRED_MESSAGE);
    }

    const nextProfile = await getAuthRuntime().updateCurrentUser(
      accessToken.value,
      input,
    );

    profile.value = nextProfile;

    return nextProfile;
  }

  const baseSession = {
    accessToken,
    bootstrapComplete,
    bootstrapSession,
    establishSessionFromTokenPair,
    isAuthenticated,
    isBootstrapping,
    isSubmitting,
    loginWithEmailPassword,
    loginWithGoogle,
    loginWithGithubSession,
    logout,
    profile,
    refreshAccessToken,
    switchWorkspace,
  };

  return {
    ...baseSession,
    baseSession,
    clearSession,
    loginWithFirebaseToken,
    updateProfile,
  };
}
