import type {
  TokenPairResponse,
  UpdateUserInput,
  UserResponse,
} from "@gitiempo/shared";
import { computed, shallowRef } from "vue";

import {
  clearRefreshToken,
  getRefreshToken,
  setRefreshToken,
} from "../session-storage";
import type { AuthRuntime } from "./runtime";

interface AuthSessionCoreOptions {
  getAuthRuntime(): AuthRuntime;
  onClearSession?: () => void;
}

export function createAuthSessionCore({
  getAuthRuntime,
  onClearSession,
}: AuthSessionCoreOptions) {
  const accessToken = shallowRef<string | null>(null);
  const bootstrapComplete = shallowRef(false);
  const isBootstrapping = shallowRef(false);
  const profile = shallowRef<UserResponse | null>(null);
  const isSubmitting = shallowRef(false);

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

  async function loadCurrentUser(nextAccessToken: string): Promise<void> {
    try {
      profile.value = await getAuthRuntime().getCurrentUser(nextAccessToken);
    } catch {
      profile.value = null;
    }
  }

  async function bootstrapSession(): Promise<void> {
    if (bootstrapComplete.value) {
      return;
    }

    if (bootstrapPromise) {
      return bootstrapPromise;
    }

    bootstrapPromise = (async () => {
      isBootstrapping.value = true;

      try {
        const refreshToken = getRefreshToken();

        if (!refreshToken) {
          clearSession();
          return;
        }

        const tokenPair = await getAuthRuntime().refreshSession(refreshToken);
        applyTokenPair(tokenPair);
        await loadCurrentUser(tokenPair.accessToken);
      } catch {
        clearSession();
      } finally {
        bootstrapComplete.value = true;
        isBootstrapping.value = false;
        bootstrapPromise = null;
      }
    })();

    return bootstrapPromise;
  }

  async function refreshAccessToken(): Promise<string> {
    if (refreshAccessPromise) {
      return refreshAccessPromise;
    }

    refreshAccessPromise = (async () => {
      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        clearSession();
        bootstrapComplete.value = true;
        throw new Error("Your session has expired. Please sign in again.");
      }

      try {
        const tokenPair = await getAuthRuntime().refreshSession(refreshToken);
        applyTokenPair(tokenPair);
        bootstrapComplete.value = true;

        return tokenPair.accessToken;
      } catch (error) {
        clearSession();
        bootstrapComplete.value = true;
        throw error;
      }
    })().finally(() => {
      refreshAccessPromise = null;
    });

    return refreshAccessPromise;
  }

  async function loginWithFirebaseIdToken(firebaseIdToken: string): Promise<void> {
    const tokenPair = await getAuthRuntime().loginWithFirebaseToken(firebaseIdToken);

    applyTokenPair(tokenPair);
    await loadCurrentUser(tokenPair.accessToken);
    bootstrapComplete.value = true;
  }

  async function loginWithFirebaseToken(firebaseIdToken: string): Promise<void> {
    isSubmitting.value = true;

    try {
      await loginWithFirebaseIdToken(firebaseIdToken);
    } catch (error) {
      clearSession();
      bootstrapComplete.value = true;
      throw error;
    } finally {
      isSubmitting.value = false;
    }
  }

  async function loginWithEmailPassword(
    email: string,
    password: string,
  ): Promise<void> {
    isSubmitting.value = true;

    try {
      const firebaseIdToken = await getAuthRuntime().signInWithEmailPassword(
        email,
        password,
      );

      await loginWithFirebaseIdToken(firebaseIdToken);
    } catch (error) {
      clearSession();
      bootstrapComplete.value = true;
      throw error;
    } finally {
      isSubmitting.value = false;
    }
  }

  async function loginWithGoogle(): Promise<void> {
    isSubmitting.value = true;

    try {
      const firebaseIdToken = await getAuthRuntime().signInWithGoogle();

      await loginWithFirebaseIdToken(firebaseIdToken);
    } catch (error) {
      clearSession();
      bootstrapComplete.value = true;
      throw error;
    } finally {
      isSubmitting.value = false;
    }
  }

  async function logout(): Promise<void> {
    const refreshToken = getRefreshToken();
    const currentAccessToken = accessToken.value;

    try {
      if (currentAccessToken && refreshToken) {
        try {
          await getAuthRuntime().logoutSession(currentAccessToken, refreshToken);
        } catch {
          // The local client session still needs to be cleared on logout.
        }
      }
    } finally {
      clearSession();
      bootstrapComplete.value = true;

      try {
        await getAuthRuntime().signOutIdentityProvider();
      } catch {
        // The local API session is the source of truth for access control.
      }
    }
  }

  async function updateProfile(input: UpdateUserInput): Promise<UserResponse> {
    if (!accessToken.value) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    const nextProfile = await getAuthRuntime().updateCurrentUser(
      accessToken.value,
      input,
    );

    profile.value = nextProfile;

    return nextProfile;
  }

  return {
    accessToken,
    bootstrapComplete,
    bootstrapSession,
    clearSession,
    isAuthenticated,
    isBootstrapping,
    isSubmitting,
    loginWithFirebaseToken,
    loginWithEmailPassword,
    loginWithGoogle,
    logout,
    profile,
    refreshAccessToken,
    updateProfile,
  };
}
