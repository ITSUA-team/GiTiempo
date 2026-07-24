import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryHistory } from "vue-router";
import { createPinia, setActivePinia } from "pinia";
import type { CurrentUserWorkspaceMembershipListResponse, UserResponse } from "@gitiempo/shared";

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
import InviteAcceptView from "@/views/InviteAcceptView.vue";
import InvitePasswordSetupView from "@/views/InvitePasswordSetupView.vue";
import NotFoundView from "@/views/NotFoundView.vue";
import RegisterView from "@/views/RegisterView.vue";

type LazyRouteComponent = () => Promise<{ default: unknown }>;

async function expectLazyRouteComponent(
  component: unknown,
  expectedComponent: unknown,
): Promise<void> {
  expect(component).toBeTypeOf("function");

  const loadedComponent = await (component as LazyRouteComponent)();

  expect(loadedComponent.default).toBe(expectedComponent);
}

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
  const workspaceMemberships: CurrentUserWorkspaceMembershipListResponse = {
    items: [
      {
        isCurrent: true,
        role: "member",
        workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
        workspaceName: "Workspace Alpha",
      },
    ],
  };

  return {
    getCurrentUser: async () => currentUser,
    listCurrentUserWorkspaces: async () => workspaceMemberships,
    loginWithFirebaseToken: async () => ({
      accessToken: "access-token",
      accessTokenExpiresIn: 900,
      refreshToken: "refresh-token-next",
    }),
    logoutSession: async () => undefined,
    registerWorkspaceOwner: async () => ({
      accessToken: "registered-access-token",
      accessTokenExpiresIn: 900,
      refreshToken: "registered-refresh-token",
    }),
    refreshSession: async () => {
      throw new Error("no refresh token");
    },
    switchWorkspace: async () => ({
      accessToken: "switched-access-token",
      accessTokenExpiresIn: 900,
      refreshToken: "switched-refresh-token",
    }),
    signInWithEmailPassword: async () => "firebase-email-token",
    signInWithGoogle: async () => "firebase-google-token",
    exchangeGithubSession: async () => ({ accessToken: "github-access-token", accessTokenExpiresIn: 900, refreshToken: "github-refresh-token" }),
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

  it("defines standalone authenticated 403 and 404 routes outside the app shell", async () => {
    const router = createAppRouter({
      history: createMemoryHistory(),
      pinia: createPinia(),
    });

    const forbiddenRoute = router.resolve("/403");
    const notFoundRoute = router.resolve("/missing-page");

    expect(forbiddenRoute.name).toBe(routeNames.forbidden);
    expect(forbiddenRoute.meta.requiresAuth).toBe(true);
    expect(forbiddenRoute.matched).toHaveLength(1);
    await expectLazyRouteComponent(
      forbiddenRoute.matched[0]?.components?.default,
      ForbiddenView,
    );
    expect(notFoundRoute.name).toBe(routeNames.notFound);
    expect(notFoundRoute.meta.requiresAuth).toBe(true);
    expect(notFoundRoute.matched).toHaveLength(1);
    await expectLazyRouteComponent(
      notFoundRoute.matched[0]?.components?.default,
      NotFoundView,
    );
  });

  it("defines the standalone invite accept route outside the app shell", async () => {
    const router = createAppRouter({
      history: createMemoryHistory(),
      pinia: createPinia(),
    });

    const inviteAcceptRoute = router.resolve("/invites/accept?token=invite-token");

    expect(inviteAcceptRoute.name).toBe(routeNames.inviteAccept);
    expect(inviteAcceptRoute.meta.allowAuthenticatedGuestFlow).toBe(true);
    expect(inviteAcceptRoute.matched).toHaveLength(1);
    await expectLazyRouteComponent(
      inviteAcceptRoute.matched[0]?.components?.default,
      InviteAcceptView,
    );
  });

  it("defines the standalone password setup route outside the app shell", async () => {
    const router = createAppRouter({
      history: createMemoryHistory(),
      pinia: createPinia(),
    });

    const passwordSetupRoute = router.resolve(
      "/invites/password-setup?mode=resetPassword&oobCode=test-code",
    );

    expect(passwordSetupRoute.name).toBe(routeNames.invitePasswordSetup);
    expect(passwordSetupRoute.meta.allowAuthenticatedGuestFlow).toBe(true);
    expect(passwordSetupRoute.matched).toHaveLength(1);
    await expectLazyRouteComponent(
      passwordSetupRoute.matched[0]?.components?.default,
      InvitePasswordSetupView,
    );
  });

  it("defines the standalone register route outside the app shell", () => {
    const router = createAppRouter({
      history: createMemoryHistory(),
      pinia: createPinia(),
    });

    const registerRoute = router.resolve("/register");

    expect(registerRoute.name).toBe(routeNames.register);
    expect(registerRoute.meta.guestOnly).toBe(true);
    expect(registerRoute.matched).toHaveLength(1);
    expect(registerRoute.matched[0]?.components?.default).toBe(RegisterView);
  });

  it("keeps login and shell eager while lazy-loading authenticated child views", () => {
    const router = createAppRouter({
      history: createMemoryHistory(),
      pinia: createPinia(),
    });

    const loginRoute = router.resolve("/login");
    const protectedRoutes = [
      "/",
      "/time-entries",
      "/projects",
      "/profile",
    ] as const;

    expect(loginRoute.matched[0]?.components?.default).not.toBeTypeOf("function");

    for (const path of protectedRoutes) {
      const resolved = router.resolve(path);

      expect(resolved.matched).toHaveLength(2);
      expect(resolved.matched[0]?.components?.default).not.toBeTypeOf("function");
      expect(resolved.matched[1]?.components?.default).toBeTypeOf("function");
    }
  });

  it("keeps authenticated users on invite accept routes", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const authStore = useAuthStore(pinia);
    authStore.accessToken = "access-token";
    authStore.bootstrapComplete = true;

    const router = createAppRouter({
      history: createMemoryHistory(),
      pinia,
    });

    await router.push("/invites/accept?token=invite-token");
    await router.isReady();

    expect(router.currentRoute.value.name).toBe(routeNames.inviteAccept);
    expect(router.currentRoute.value.query.token).toBe("invite-token");
  });

  it("redirects authenticated users away from the register route", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const authStore = useAuthStore(pinia);
    authStore.accessToken = "access-token";
    authStore.bootstrapComplete = true;

    const router = createAppRouter({
      history: createMemoryHistory(),
      pinia,
    });

    await router.push("/register?redirect=%2Ftime-entries");
    await router.isReady();

    expect(router.currentRoute.value.fullPath).toBe("/time-entries");
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

    await router.push("/projects");
    await router.isReady();

    const authStore = useAuthStore(pinia);
    expect(router.currentRoute.value.name).toBe(routeNames.login);
    expect(router.currentRoute.value.query.redirect).toBe(
      "/projects",
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

  it("defines the authenticated projects list route without the placeholder detail route", () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const router = createAppRouter({
      history: createMemoryHistory(),
      pinia,
    });

    expect(router.resolve("/projects").name).toBe(routeNames.project);
    expect(router.getRoutes().some((route) => route.path === "/projects/:projectId")).toBe(
      false,
    );
  });
});
