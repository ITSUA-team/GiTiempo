import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryHistory } from "vue-router";
import { createPinia, setActivePinia } from "pinia";
import type { UserResponse } from "@gitiempo/shared";

import { clearRefreshToken } from "@/lib/session-storage";
import { createAppRouter, routeNames } from "@/router";
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
    refreshSession: async () => {
      throw new Error("no refresh token");
    },
    signInWithEmailPassword: async () => "firebase-email-token",
    signInWithGoogle: async () => "firebase-google-token",
    signOutIdentityProvider: async () => undefined,
    ...overrides,
  };
}

describe("app router auth guards", () => {
  beforeEach(() => {
    clearRefreshToken();
    resetAuthRuntimeForTesting();
  });

  it("redirects anonymous users to login and preserves the requested route", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    setAuthRuntimeForTesting(createRuntimeMock());

    const router = createAppRouter({
      history: createMemoryHistory(),
      pinia,
    });

    await router.push("/timer");
    await router.isReady();

    expect(router.currentRoute.value.name).toBe(routeNames.login);
    expect(router.currentRoute.value.query.redirect).toBe("/timer");
  });

  it("redirects authenticated users away from login to the default route", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    setAuthRuntimeForTesting(createRuntimeMock());

    const authStore = useAuthStore(pinia);
    authStore.accessToken = "access-token";
    authStore.bootstrapComplete = true;

    const router = createAppRouter({
      history: createMemoryHistory(),
      pinia,
    });

    await router.push("/login");
    await router.isReady();

    expect(router.currentRoute.value.name).toBe(routeNames.dashboard);
  });

  it("uses preserved redirect query after login state already exists", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const authStore = useAuthStore(pinia);
    authStore.accessToken = "access-token";
    authStore.bootstrapComplete = true;

    const router = createAppRouter({
      history: createMemoryHistory(),
      pinia,
    });

    await router.push("/login?redirect=%2Ftime-entries");
    await router.isReady();

    expect(router.currentRoute.value.fullPath).toBe("/time-entries");
  });
});
