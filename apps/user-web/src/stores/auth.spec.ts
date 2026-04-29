import { beforeEach, describe, expect, it } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import type { UserResponse } from "@gitiempo/shared";

import {
  clearRefreshToken,
  getRefreshToken,
  setRefreshToken,
} from "@gitiempo/web-shared/session-storage";
import {
  resetAuthRuntimeForTesting,
  setAuthRuntimeForTesting,
  type AuthRuntime,
} from "@/services/auth-runtime";
import { useAuthStore } from "@/stores/auth";

function createRuntimeMock(overrides?: Partial<AuthRuntime>): AuthRuntime {
  const currentUser: UserResponse = {
    avatarUrl: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    displayName: "Alexey Tsukanov",
    email: "alexey@example.com",
    id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
    role: "member",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  return {
    getCurrentUser: async () => currentUser,
    loginWithFirebaseToken: async () => ({
      accessToken: "access-token",
      accessTokenExpiresIn: 900,
      refreshToken: "refresh-token-next",
    }),
    logoutSession: async () => undefined,
    refreshSession: async () => ({
      accessToken: "restored-access-token",
      accessTokenExpiresIn: 900,
      refreshToken: "restored-refresh-token",
    }),
    signInWithEmailPassword: async () => "firebase-email-token",
    signInWithGoogle: async () => "firebase-google-token",
    signOutIdentityProvider: async () => undefined,
    ...overrides,
  };
}

describe("useAuthStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    clearRefreshToken();
    resetAuthRuntimeForTesting();
  });

  it("restores a session from refresh token during bootstrap", async () => {
    setRefreshToken("persisted-refresh-token");
    setAuthRuntimeForTesting(createRuntimeMock());

    const authStore = useAuthStore();

    await authStore.bootstrapSession();

    expect(authStore.isAuthenticated).toBe(true);
    expect(authStore.accessToken).toBe("restored-access-token");
    expect(getRefreshToken()).toBe("restored-refresh-token");
    expect(authStore.bootstrapComplete).toBe(true);
    expect(authStore.displayName).toBe("Alexey Tsukanov");
  });

  it("stays in guest state when bootstrap starts without a persisted refresh token", async () => {
    let refreshCalls = 0;
    setAuthRuntimeForTesting(
      createRuntimeMock({
        refreshSession: async () => {
          refreshCalls += 1;
          throw new Error("refresh should not run without a token");
        },
      }),
    );

    const authStore = useAuthStore();

    await authStore.bootstrapSession();

    expect(refreshCalls).toBe(0);
    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.profile).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(authStore.bootstrapComplete).toBe(true);
  });

  it("clears invalid refresh token during bootstrap fallback", async () => {
    setRefreshToken("persisted-refresh-token");
    setAuthRuntimeForTesting(
      createRuntimeMock({
        refreshSession: async () => {
          throw new Error("invalid refresh token");
        },
      }),
    );

    const authStore = useAuthStore();

    await authStore.bootstrapSession();

    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.accessToken).toBeNull();
    expect(authStore.profile).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(authStore.bootstrapComplete).toBe(true);
  });

  it("logs in with email/password and persists rotated token pair", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());

    const authStore = useAuthStore();

    await authStore.loginWithEmailPassword("alex@example.com", "password123");

    expect(authStore.isAuthenticated).toBe(true);
    expect(authStore.accessToken).toBe("access-token");
    expect(getRefreshToken()).toBe("refresh-token-next");
    expect(authStore.bootstrapComplete).toBe(true);
    expect(authStore.profile?.email).toBe("alexey@example.com");
  });

  it("clears stale local session state when login exchange fails", async () => {
    setRefreshToken("stale-refresh-token");
    setAuthRuntimeForTesting(
      createRuntimeMock({
        loginWithFirebaseToken: async () => {
          throw new Error("login exchange failed");
        },
      }),
    );

    const authStore = useAuthStore();
    authStore.accessToken = "stale-access-token";
    authStore.profile = {
      avatarUrl: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      displayName: "Stale User",
      email: "stale@example.com",
      id: "stale-user-id",
      role: "member",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    await expect(
      authStore.loginWithEmailPassword("alex@example.com", "password123"),
    ).rejects.toThrow("login exchange failed");

    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.accessToken).toBeNull();
    expect(authStore.profile).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(authStore.bootstrapComplete).toBe(true);
    expect(authStore.isSubmitting).toBe(false);
  });

  it("logs in with Google and persists the token pair", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());

    const authStore = useAuthStore();

    await authStore.loginWithGoogle();

    expect(authStore.isAuthenticated).toBe(true);
    expect(authStore.accessToken).toBe("access-token");
    expect(getRefreshToken()).toBe("refresh-token-next");
    expect(authStore.profile?.email).toBe("alexey@example.com");
    expect(authStore.bootstrapComplete).toBe(true);
  });

  it("clears stale local session state when Google login fails", async () => {
    setRefreshToken("stale-refresh-token");
    setAuthRuntimeForTesting(
      createRuntimeMock({
        signInWithGoogle: async () => {
          throw new Error("google sign in failed");
        },
      }),
    );

    const authStore = useAuthStore();
    authStore.accessToken = "stale-access-token";
    authStore.profile = {
      avatarUrl: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      displayName: "Stale User",
      email: "stale@example.com",
      id: "stale-user-id",
      role: "member",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    await expect(authStore.loginWithGoogle()).rejects.toThrow(
      "google sign in failed",
    );

    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.accessToken).toBeNull();
    expect(authStore.profile).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(authStore.bootstrapComplete).toBe(true);
    expect(authStore.isSubmitting).toBe(false);
  });

  it("clears tokens on logout when API logout succeeds", async () => {
    let logoutCalls = 0;
    setRefreshToken("persisted-refresh-token");
    setAuthRuntimeForTesting(
      createRuntimeMock({
        logoutSession: async () => {
          logoutCalls += 1;
        },
      }),
    );

    const authStore = useAuthStore();
    authStore.accessToken = "current-access-token";

    await authStore.logout();

    expect(logoutCalls).toBe(1);
    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.accessToken).toBeNull();
    expect(authStore.profile).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(authStore.bootstrapComplete).toBe(true);
  });

  it("clears tokens on logout even when API logout fails", async () => {
    setRefreshToken("persisted-refresh-token");
    setAuthRuntimeForTesting(
      createRuntimeMock({
        logoutSession: async () => {
          throw new Error("logout failed");
        },
      }),
    );

    const authStore = useAuthStore();
    authStore.accessToken = "current-access-token";

    await authStore.logout();

    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.accessToken).toBeNull();
    expect(authStore.profile).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(authStore.bootstrapComplete).toBe(true);
  });
});
