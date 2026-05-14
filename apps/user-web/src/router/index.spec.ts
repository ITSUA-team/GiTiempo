import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryHistory } from "vue-router";
import { createPinia, setActivePinia } from "pinia";
import type { UserResponse } from "@gitiempo/shared";

import {
  clearRefreshToken,
  setRefreshToken,
} from "@gitiempo/web-shared/session-storage";
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
    refreshSession: async () => {
      throw new Error("no refresh token");
    },
    signInWithEmailPassword: async () => "firebase-email-token",
    signInWithGoogle: async () => "firebase-google-token",
    signOutIdentityProvider: async () => undefined,
    updateCurrentUser: async (_accessToken, input) => ({
      ...currentUser,
      ...input,
    }),
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

    await router.push("/time-entries");
    await router.isReady();

    expect(router.currentRoute.value.name).toBe(routeNames.login);
    expect(router.currentRoute.value.query.redirect).toBe("/time-entries");
  });

  it("defines 403 and authenticated 404 routes inside the app shell", () => {
    const router = createAppRouter({
      history: createMemoryHistory(),
      pinia: createPinia(),
    });

    const forbiddenRoute = router.resolve("/403");
    const notFoundRoute = router.resolve("/missing-page");

    expect(forbiddenRoute.name).toBe(routeNames.forbidden);
    expect(forbiddenRoute.meta.requiresAuth).toBe(true);
    expect(forbiddenRoute.matched).toHaveLength(2);
    expect(notFoundRoute.name).toBe(routeNames.notFound);
    expect(notFoundRoute.meta.requiresAuth).toBe(true);
    expect(notFoundRoute.matched).toHaveLength(2);
  });

  it("redirects anonymous users from unknown routes to login", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    setAuthRuntimeForTesting(createRuntimeMock());

    const router = createAppRouter({
      history: createMemoryHistory(),
      pinia,
    });

    await router.push("/missing-page");
    await router.isReady();

    expect(router.currentRoute.value.name).toBe(routeNames.login);
    expect(router.currentRoute.value.query.redirect).toBe("/missing-page");
  });

  it("renders the authenticated not-found route after bootstrap succeeds", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    setAuthRuntimeForTesting(
      createRuntimeMock({
        refreshSession: async () => ({
          accessToken: "access-token",
          accessTokenExpiresIn: 900,
          refreshToken: "refresh-token-next",
        }),
      }),
    );
    setRefreshToken("refresh-token");

    const router = createAppRouter({
      history: createMemoryHistory(),
      pinia,
    });

    await router.push("/missing-page");
    await router.isReady();

    expect(router.currentRoute.value.name).toBe(routeNames.notFound);
  });

  it("redirects to login after bootstrap rejects a persisted refresh token", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    setRefreshToken("stale-refresh-token");
    setAuthRuntimeForTesting(
      createRuntimeMock({
        refreshSession: async () => {
          throw new Error("invalid refresh token");
        },
      }),
    );

    const router = createAppRouter({
      history: createMemoryHistory(),
      pinia,
    });

    await router.push("/projects/workspace-alpha");
    await router.isReady();

    const authStore = useAuthStore(pinia);
    expect(router.currentRoute.value.name).toBe(routeNames.login);
    expect(router.currentRoute.value.query.redirect).toBe(
      "/projects/workspace-alpha",
    );
    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.bootstrapComplete).toBe(true);
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

  it("falls back to the default authenticated route for invalid redirect queries", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const authStore = useAuthStore(pinia);
    authStore.accessToken = "access-token";
    authStore.bootstrapComplete = true;

    const router = createAppRouter({
      history: createMemoryHistory(),
      pinia,
    });

    await router.push("/login?redirect=https://example.com/escape");
    await router.isReady();

    expect(router.currentRoute.value.name).toBe(routeNames.dashboard);
  });
});
