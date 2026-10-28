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
import {
  getFirebaseSignInTokens,
  type AuthRuntime,
  type FirebaseSignInResult,
} from "./runtime";
import { SessionContextChangedError } from "./session-context-changed-error";

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

  let sessionGeneration = 0;

  function changeSessionContext(): void {
    sessionGeneration += 1;
    refreshAccessPromise = null;
  }

  function assertSessionContext(generation: number): void {
    if (generation !== sessionGeneration) {
      throw new SessionContextChangedError();
    }
  }

  const isAuthenticated = computed(() => accessToken.value !== null);

  function applyTokenPair(tokenPair: TokenPairResponse): void {
    accessToken.value = tokenPair.accessToken;
    setRefreshToken(tokenPair.refreshToken);
  }

  function clearSession(): void {
    changeSessionContext();
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
    const generation = sessionGeneration;
    try {
      const nextProfile = await getAuthRuntime().getCurrentUser(nextAccessToken);
      assertSessionContext(generation);
      profile.value = nextProfile;
    } catch (error) {
      assertSessionContext(generation);
      if (error instanceof SessionContextChangedError) throw error;
      profile.value = null;
    }
  }

  async function restoreSessionFromRefreshToken(): Promise<void> {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      clearSession();
      return;
    }

    const generation = sessionGeneration;
    try {
      const tokenPair = await getAuthRuntime().refreshSession(refreshToken);
      assertSessionContext(generation);
      if (getRefreshToken() !== refreshToken) throw new SessionContextChangedError();
      applyTokenPair(tokenPair);
      await loadCurrentUser(tokenPair.accessToken);
    } catch (error) {
      assertSessionContext(generation);
      throw error;
    }
  }

  async function runBootstrapSession(): Promise<void> {
    isBootstrapping.value = true;

    try {
      await restoreSessionFromRefreshToken();
    } catch (error) {
      if (!(error instanceof SessionContextChangedError)) clearSession();
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

    const generation = sessionGeneration;
    try {
      const tokenPair = await getAuthRuntime().refreshSession(refreshToken);
      assertSessionContext(generation);
      if (getRefreshToken() !== refreshToken) throw new SessionContextChangedError();
      applyTokenPair(tokenPair);
      completeBootstrap();

      return tokenPair.accessToken;
    } catch (error) {
      assertSessionContext(generation);
      if (getRefreshToken() !== refreshToken) throw new SessionContextChangedError();
      clearSessionAndCompleteBootstrap();
      throw error;
    }
  }

  function refreshAccessToken(): Promise<string> {
    if (!refreshAccessPromise) {
      const pendingRefresh = refreshStoredAccessToken().finally(() => {
        if (refreshAccessPromise === pendingRefresh) refreshAccessPromise = null;
      });
      refreshAccessPromise = pendingRefresh;
    }
    return refreshAccessPromise;
  }

  async function exchangeFirebaseIdToken(
    signInResult: FirebaseSignInResult,
  ): Promise<void> {
    const { firebaseIdToken, googleIdToken } = getFirebaseSignInTokens(signInResult);
    const generation = sessionGeneration;
    const tokenPair = googleIdToken
      ? await getAuthRuntime().loginWithFirebaseToken(firebaseIdToken, googleIdToken)
      : await getAuthRuntime().loginWithFirebaseToken(firebaseIdToken);
    assertSessionContext(generation);

    await establishSessionFromTokenPair(tokenPair);
  }

  // Backend GitHub sign-in returns a one-time handoff code (not a Firebase
  // token); exchange it for the normal session token pair.
  async function exchangeGithubHandoff(code: string): Promise<void> {
    const generation = sessionGeneration;
    const tokenPair = await getAuthRuntime().exchangeGithubSession(code);
    assertSessionContext(generation);

    await establishSessionFromTokenPair(tokenPair);
  }

  async function establishSessionFromTokenPair(
    tokenPair: TokenPairResponse,
  ): Promise<void> {
    changeSessionContext();
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

    const generation = sessionGeneration;
    const tokenPair = await getAuthRuntime().switchWorkspace(
      currentAccessToken,
      currentRefreshToken,
      workspaceId,
    );
    assertSessionContext(generation);
    changeSessionContext();
    const switchedGeneration = sessionGeneration;
    onSessionContextChanged?.();
    applyTokenPair(tokenPair);
    profile.value = null;

    try {
      const nextProfile = await getAuthRuntime().getCurrentUser(tokenPair.accessToken);
      assertSessionContext(switchedGeneration);
      profile.value = nextProfile;

      return {
        profileReloaded: true,
        profileReloadError: null,
      };
    } catch (profileReloadError) {
      assertSessionContext(switchedGeneration);
      return {
        profileReloaded: false,
        profileReloadError,
      };
    } finally {
      completeBootstrap();
    }
  }

  async function runSubmittingLogin(login: () => Promise<void>): Promise<void> {
    changeSessionContext();
    const generation = sessionGeneration;
    isSubmitting.value = true;

    try {
      await login();
    } catch (error) {
      if (generation === sessionGeneration) clearSessionAndCompleteBootstrap();
      throw error;
    } finally {
      isSubmitting.value = false;
    }
  }

  function loginWithGithubSession(code: string): Promise<void> {
    return runSubmittingLogin(() => exchangeGithubHandoff(code));
  }

  function loginWithFirebaseToken(
    firebaseIdToken: string,
    googleIdToken?: string,
  ): Promise<void> {
    return runSubmittingLogin(() =>
      exchangeFirebaseIdToken({ firebaseIdToken, ...(googleIdToken ? { googleIdToken } : {}) }),
    );
  }

  function loginWithEmailPassword(
    email: string,
    password: string,
  ): Promise<void> {
    return runSubmittingLogin(async () => {
      const generation = sessionGeneration;
      const firebaseIdToken = await getAuthRuntime().signInWithEmailPassword(
        email,
        password,
      );
      assertSessionContext(generation);

      await exchangeFirebaseIdToken(firebaseIdToken);
    });
  }

  function loginWithGoogle(): Promise<void> {
    return runSubmittingLogin(async () => {
      const generation = sessionGeneration;
      const signInResult = await getAuthRuntime().signInWithGoogle();
      assertSessionContext(generation);

      await exchangeFirebaseIdToken(signInResult);
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
    clearSession();
    completeBootstrap();
    const generation = sessionGeneration;

    try {
      if (currentAccessToken && refreshToken) {
        await logoutApiSession(currentAccessToken, refreshToken);
      }
    } finally {
      if (generation === sessionGeneration) await logoutIdentityProvider();
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
