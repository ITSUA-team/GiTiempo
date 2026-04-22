import { defineStore } from "pinia";
import { computed, shallowRef } from "vue";
import type { TokenPairResponse } from "@gitiempo/shared";

import {
  clearRefreshToken,
  getRefreshToken,
  setRefreshToken,
} from "@/lib/session-storage";
import { getAuthRuntime } from "@/services/auth-runtime";

function applyTokenPair(
  accessToken: { value: string | null },
  tokenPair: TokenPairResponse,
): void {
  accessToken.value = tokenPair.accessToken;
  setRefreshToken(tokenPair.refreshToken);
}

export const useAuthStore = defineStore("auth", () => {
  const accessToken = shallowRef<string | null>(null);
  const bootstrapComplete = shallowRef(false);
  const isBootstrapping = shallowRef(false);
  const isSubmitting = shallowRef(false);

  let bootstrapPromise: Promise<void> | null = null;

  const isAuthenticated = computed(() => accessToken.value !== null);

  function clearSession(): void {
    accessToken.value = null;
    clearRefreshToken();
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
        applyTokenPair(accessToken, tokenPair);
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
      const tokenPair =
        await getAuthRuntime().loginWithFirebaseToken(firebaseIdToken);

      applyTokenPair(accessToken, tokenPair);
      bootstrapComplete.value = true;
    } finally {
      isSubmitting.value = false;
    }
  }

  async function loginWithGoogle(): Promise<void> {
    isSubmitting.value = true;

    try {
      const firebaseIdToken = await getAuthRuntime().signInWithGoogle();
      const tokenPair =
        await getAuthRuntime().loginWithFirebaseToken(firebaseIdToken);

      applyTokenPair(accessToken, tokenPair);
      bootstrapComplete.value = true;
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
          await getAuthRuntime().logoutSession(
            currentAccessToken,
            refreshToken,
          );
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

  return {
    accessToken,
    bootstrapComplete,
    bootstrapSession,
    isAuthenticated,
    isBootstrapping,
    isSubmitting,
    loginWithEmailPassword,
    loginWithGoogle,
    logout,
  };
});
