import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryHistory } from "vue-router";
import { createPinia, setActivePinia } from "pinia";
import {
  WorkspaceRoles,
  type UserResponse,
  type WorkspaceRole,
} from "@gitiempo/shared";

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
import ForbiddenView from "@/views/ForbiddenView.vue";
import NotFoundView from "@/views/NotFoundView.vue";

function createRuntimeMock(overrides?: Partial<AuthRuntime>): AuthRuntime {
  const currentUser: UserResponse = {
    avatarUrl: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    displayName: "Admin User",
    email: "admin@example.com",
    id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
    role: "admin",
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

function setAuthenticatedUser(
  pinia: ReturnType<typeof createPinia>,
  role: WorkspaceRole = WorkspaceRoles.Admin,
): ReturnType<typeof useAuthStore> {
  const authStore = useAuthStore(pinia);
  authStore.accessToken = `${role}-access-token`;
  authStore.bootstrapComplete = true;
  authStore.profile = {
    avatarUrl: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    displayName: "Admin User",
    email: `${role}@example.com`,
    id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
    role,
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  return authStore;
}

describe("admin router", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    clearRefreshToken();
    resetAuthRuntimeForTesting();
  });

  it("defines the documented admin route inventory", () => {
    const router = createAppRouter({
      history: createMemoryHistory(),
      pinia: createPinia(),
    });

    expect(router.hasRoute(routeNames.login)).toBe(true);
    expect(router.hasRoute(routeNames.dashboard)).toBe(true);
    expect(router.hasRoute(routeNames.reports)).toBe(true);
    expect(router.hasRoute(routeNames.invoices)).toBe(true);
    expect(router.hasRoute(routeNames.members)).toBe(true);
    expect(router.hasRoute(routeNames.addProject)).toBe(true);
    expect(router.hasRoute(routeNames.forbidden)).toBe(true);
    expect(router.hasRoute(routeNames.notFound)).toBe(true);
    expect(router.hasRoute(routeNames.projects)).toBe(true);
    expect(router.hasRoute(routeNames.settings)).toBe(true);
  });

  it("mounts documented admin product pages inside the shell while keeping standalone error routes outside it", () => {
    const router = createAppRouter({
      history: createMemoryHistory(),
      pinia: createPinia(),
    });

    const protectedRoutes = [
      {
        allowedRoles: [WorkspaceRoles.Admin, WorkspaceRoles.PM],
        path: "/",
        name: routeNames.dashboard,
      },
      {
        allowedRoles: [WorkspaceRoles.Admin, WorkspaceRoles.PM],
        path: "/reports",
        name: routeNames.reports,
      },
      {
        allowedRoles: [WorkspaceRoles.Admin],
        path: "/invoices",
        name: routeNames.invoices,
      },
      {
        allowedRoles: [WorkspaceRoles.Admin],
        path: "/members",
        name: routeNames.members,
      },
      {
        allowedRoles: [WorkspaceRoles.Admin],
        path: "/projects",
        name: routeNames.projects,
      },
      {
        allowedRoles: [WorkspaceRoles.Admin],
        path: "/projects/new",
        name: routeNames.addProject,
      },
      {
        allowedRoles: [WorkspaceRoles.Admin],
        path: "/settings",
        name: routeNames.settings,
      },
    ] as const;

    for (const route of protectedRoutes) {
      const resolved = router.resolve(route.path);

      expect(resolved.name).toBe(route.name);
      expect(resolved.meta.requiresAuth).toBe(true);
      expect(resolved.meta.guestOnly).toBeUndefined();
      expect(resolved.meta.allowedRoles).toEqual(route.allowedRoles);
      expect(resolved.matched).toHaveLength(2);
      expect(resolved.matched[0]?.path).toBe("/");
      expect(resolved.matched[0]?.meta.requiresAuth).toBe(true);
      expect(resolved.matched[1]?.name).toBe(route.name);
    }

    const forbiddenRoute = router.resolve("/403");

    expect(forbiddenRoute.name).toBe(routeNames.forbidden);
    expect(forbiddenRoute.meta.requiresAuth).toBe(true);
    expect(forbiddenRoute.meta.guestOnly).toBeUndefined();
    expect(forbiddenRoute.matched).toHaveLength(1);
    expect(forbiddenRoute.matched[0]?.components?.default).toBe(ForbiddenView);

    const notFoundRoute = router.resolve("/missing-page");

    expect(notFoundRoute.name).toBe(routeNames.notFound);
    expect(notFoundRoute.meta.requiresAuth).toBe(true);
    expect(notFoundRoute.meta.guestOnly).toBeUndefined();
    expect(notFoundRoute.matched).toHaveLength(1);
    expect(notFoundRoute.matched[0]?.components?.default).toBe(NotFoundView);

    const loginRoute = router.resolve("/login");

    expect(loginRoute.name).toBe(routeNames.login);
    expect(loginRoute.meta.guestOnly).toBe(true);
    expect(loginRoute.meta.requiresAuth).toBeUndefined();
    expect(loginRoute.matched).toHaveLength(1);
    expect(loginRoute.matched[0]?.path).toBe("/login");
  });

  it("redirects anonymous users to login and preserves the requested route", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    setAuthRuntimeForTesting(createRuntimeMock());
    const router = createAppRouter({
      history: createMemoryHistory(),
      pinia,
    });

    await router.push("/reports");
    await router.isReady();

    expect(router.currentRoute.value.name).toBe(routeNames.login);
    expect(router.currentRoute.value.query.redirect).toBe("/reports");
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
    setRefreshToken("refresh-token");
    setAuthRuntimeForTesting(
      createRuntimeMock({
        refreshSession: async () => ({
          accessToken: "access-token",
          accessTokenExpiresIn: 900,
          refreshToken: "refresh-token-next",
        }),
      }),
    );
    const router = createAppRouter({
      history: createMemoryHistory(),
      pinia,
    });

    await router.push("/missing-page");
    await router.isReady();

    expect(router.currentRoute.value.name).toBe(routeNames.notFound);
  });

  it("allows PM users to navigate to PM-safe routes and denies admin-only routes", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    setAuthenticatedUser(pinia, WorkspaceRoles.PM);
    const router = createAppRouter({
      history: createMemoryHistory(),
      pinia,
    });

    await router.push("/reports");
    await router.isReady();

    expect(router.currentRoute.value.name).toBe(routeNames.reports);

    await router.push("/members");
    await router.isReady();

    expect(router.currentRoute.value.name).toBe(routeNames.forbidden);
    expect(router.currentRoute.value.matched).toHaveLength(1);
  });

  it("redirects member users from admin product routes to the standalone forbidden route", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    setAuthenticatedUser(pinia, WorkspaceRoles.Member);
    const router = createAppRouter({
      history: createMemoryHistory(),
      pinia,
    });

    await router.push("/");
    await router.isReady();

    expect(router.currentRoute.value.name).toBe(routeNames.forbidden);
    expect(router.currentRoute.value.matched[0]?.components?.default).toBe(
      ForbiddenView,
    );
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

    await router.push("/projects");
    await router.isReady();

    const authStore = useAuthStore(pinia);
    expect(router.currentRoute.value.name).toBe(routeNames.login);
    expect(router.currentRoute.value.query.redirect).toBe("/projects");
    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.bootstrapComplete).toBe(true);
  });

  it("redirects authenticated users away from login to the default route", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    setAuthenticatedUser(pinia);

    const router = createAppRouter({
      history: createMemoryHistory(),
      pinia,
    });

    await router.push("/login");
    await router.isReady();

    expect(router.currentRoute.value.name).toBe(routeNames.dashboard);
  });

  it("resumes a valid preserved redirect for authenticated login visits", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    setAuthenticatedUser(pinia);

    const router = createAppRouter({
      history: createMemoryHistory(),
      pinia,
    });

    await router.push("/login?redirect=%2Fsettings");
    await router.isReady();

    expect(router.currentRoute.value.fullPath).toBe("/settings");
  });

  it("falls back to the default authenticated route for invalid redirect queries", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    setAuthenticatedUser(pinia);

    const router = createAppRouter({
      history: createMemoryHistory(),
      pinia,
    });

    await router.push("/login?redirect=https://example.com/escape");
    await router.isReady();

    expect(router.currentRoute.value.name).toBe(routeNames.dashboard);
  });
});
