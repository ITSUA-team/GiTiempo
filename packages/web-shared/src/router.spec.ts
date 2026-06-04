import { WorkspaceRoles, type WorkspaceRole } from "@gitiempo/shared";
import { describe, expect, it } from "vitest";
import { createMemoryHistory, type RouteRecordRaw } from "vue-router";

import {
  createProtectedRouter,
  hasAllowedRole,
  type ProtectedRouterAuthStore,
} from "./router";

const routeNames = {
  dashboard: "dashboard",
  forbidden: "forbidden",
  login: "login",
} as const;

const TestShell = { name: "TestShell" };
const LoginView = { name: "LoginView" };
const DashboardView = { name: "DashboardView" };
const SettingsView = { name: "SettingsView" };
const ForbiddenView = { name: "ForbiddenView" };
const NotFoundView = { name: "NotFoundView" };

interface TestPinia {
  id: string;
}

interface TestAuthStore extends ProtectedRouterAuthStore {
  bootstrapCalls: number;
  isAuthenticated: boolean;
  profile: { role: WorkspaceRole | null } | null;
}

function createAuthStore(options?: {
  isAuthenticated?: boolean;
  role?: WorkspaceRole | null;
}): TestAuthStore {
  return {
    bootstrapCalls: 0,
    isAuthenticated: options?.isAuthenticated ?? false,
    profile:
      options?.role === undefined
        ? null
        : {
            role: options.role,
          },
    async bootstrapSession() {
      this.bootstrapCalls += 1;
    },
  };
}

function createRouterForStore(
  authStore: TestAuthStore,
  options?: {
    protectedRoutes?: RouteRecordRaw[];
    shellMeta?: { allowedRoles?: readonly WorkspaceRole[] };
  },
) {
  const pinia: TestPinia = { id: "test-pinia" };
  let receivedPinia: TestPinia | null = null;
  const router = createProtectedRouter({
    defaultAuthenticatedRoute: { name: routeNames.dashboard },
    history: createMemoryHistory(),
    pinia,
    routeNames,
    routes: {
      protected: options?.protectedRoutes ?? [
        {
          path: "",
          name: routeNames.dashboard,
          component: DashboardView,
        },
        {
          path: "settings",
          name: "settings",
          component: SettingsView,
          meta: {
            allowedRoles: [WorkspaceRoles.Admin],
          },
        },
      ],
      public: [
        {
          path: "/login",
          name: routeNames.login,
          component: LoginView,
          meta: {
            guestOnly: true,
          },
        },
      ],
      standalone: [
        {
          path: "/403",
          name: routeNames.forbidden,
          component: ForbiddenView,
          meta: {
            requiresAuth: true,
          },
        },
        {
          path: "/:pathMatch(.*)*",
          name: "not-found",
          component: NotFoundView,
          meta: {
            requiresAuth: true,
          },
        },
      ],
    },
    shellComponent: TestShell,
    shellMeta: options?.shellMeta,
    useAuthStore(received) {
      receivedPinia = received;

      return authStore;
    },
  });

  return {
    getReceivedPinia: () => receivedPinia,
    pinia,
    router,
  };
}

describe("createProtectedRouter", () => {
  it("assembles app-owned protected routes under the injected shell", () => {
    const authStore = createAuthStore();
    const { router } = createRouterForStore(authStore, {
      shellMeta: {
        allowedRoles: [WorkspaceRoles.Admin, WorkspaceRoles.PM],
      },
    });

    const dashboardRoute = router.resolve("/");
    const settingsRoute = router.resolve("/settings");

    expect(dashboardRoute.name).toBe(routeNames.dashboard);
    expect(dashboardRoute.meta.requiresAuth).toBe(true);
    expect(dashboardRoute.meta.allowedRoles).toEqual([
      WorkspaceRoles.Admin,
      WorkspaceRoles.PM,
    ]);
    expect(dashboardRoute.matched).toHaveLength(2);
    expect(dashboardRoute.matched[0]?.components?.default).toBe(TestShell);
    expect(settingsRoute.meta.allowedRoles).toEqual([WorkspaceRoles.Admin]);
    expect(settingsRoute.matched).toHaveLength(2);
  });

  it("redirects anonymous protected-route visits to login with the destination preserved", async () => {
    const authStore = createAuthStore();
    const { getReceivedPinia, pinia, router } = createRouterForStore(authStore);

    await router.push("/settings?tab=members");
    await router.isReady();

    expect(router.currentRoute.value.name).toBe(routeNames.login);
    expect(router.currentRoute.value.query.redirect).toBe("/settings?tab=members");
    expect(authStore.bootstrapCalls).toBe(2);
    expect(getReceivedPinia()).toBe(pinia);
  });

  it("redirects authenticated guest-only visits to a preserved in-app redirect", async () => {
    const authStore = createAuthStore({
      isAuthenticated: true,
      role: WorkspaceRoles.Admin,
    });
    const { router } = createRouterForStore(authStore);

    await router.push("/login?redirect=%2Fsettings");
    await router.isReady();

    expect(router.currentRoute.value.fullPath).toBe("/settings");
  });

  it("falls back to the default route for invalid authenticated redirect targets", async () => {
    const authStore = createAuthStore({
      isAuthenticated: true,
      role: WorkspaceRoles.Admin,
    });
    const { router } = createRouterForStore(authStore);

    await router.push("/login?redirect=https://example.com/escape");
    await router.isReady();

    expect(router.currentRoute.value.name).toBe(routeNames.dashboard);
  });

  it("preserves valid same-app redirect targets with query strings and hash fragments", async () => {
    const authStore = createAuthStore({
      isAuthenticated: true,
      role: WorkspaceRoles.Admin,
    });
    const { router } = createRouterForStore(authStore);

    await router.push(
      "/login?redirect=%2Fsettings%3Ftab%3Dmembers%23audit-log",
    );
    await router.isReady();

    expect(router.currentRoute.value.fullPath).toBe(
      "/settings?tab=members#audit-log",
    );
  });

  it("rejects protocol-relative authenticated redirect targets", async () => {
    const authStore = createAuthStore({
      isAuthenticated: true,
      role: WorkspaceRoles.Admin,
    });
    const { router } = createRouterForStore(authStore);

    await router.push("/login?redirect=%2F%2Fexample.com%2Fescape");
    await router.isReady();

    expect(router.currentRoute.value.name).toBe(routeNames.dashboard);
  });

  it("rejects repeated authenticated redirect query values", async () => {
    const authStore = createAuthStore({
      isAuthenticated: true,
      role: WorkspaceRoles.Admin,
    });
    const { router } = createRouterForStore(authStore);

    await router.push({
      name: routeNames.login,
      query: { redirect: ["/settings", "/reports"] },
    });
    await router.isReady();

    expect(router.currentRoute.value.name).toBe(routeNames.dashboard);
  });

  it("rejects non-string and malformed authenticated redirect values", async () => {
    const authStore = createAuthStore({
      isAuthenticated: true,
      role: WorkspaceRoles.Admin,
    });
    const { router } = createRouterForStore(authStore);

    await router.push({ name: routeNames.login, query: { redirect: null } });
    await router.isReady();

    expect(router.currentRoute.value.name).toBe(routeNames.dashboard);

    await router.push({
      name: routeNames.login,
      query: { redirect: "/settings\nnext" },
    });
    await router.isReady();

    expect(router.currentRoute.value.name).toBe(routeNames.dashboard);
  });

  it("redirects disallowed roles to the injected forbidden route", async () => {
    const authStore = createAuthStore({
      isAuthenticated: true,
      role: WorkspaceRoles.PM,
    });
    const { router } = createRouterForStore(authStore);

    await router.push("/settings");
    await router.isReady();

    expect(router.currentRoute.value.name).toBe(routeNames.forbidden);
  });

  it("allows protected routes without role metadata for authenticated users", async () => {
    const authStore = createAuthStore({
      isAuthenticated: true,
      role: WorkspaceRoles.Member,
    });
    const { router } = createRouterForStore(authStore);

    await router.push("/");
    await router.isReady();

    expect(router.currentRoute.value.name).toBe(routeNames.dashboard);
  });

  it("keeps shell-owned routes protected when child meta overrides requiresAuth", async () => {
    const authStore = createAuthStore();
    const { router } = createRouterForStore(authStore, {
      protectedRoutes: [
        {
          path: "public-looking",
          name: "public-looking",
          component: DashboardView,
          meta: {
            requiresAuth: false,
          },
        },
      ],
    });

    await router.push("/public-looking");
    await router.isReady();

    expect(router.currentRoute.value.name).toBe(routeNames.login);
    expect(router.currentRoute.value.query.redirect).toBe("/public-looking");
    expect(authStore.bootstrapCalls).toBe(2);
  });
});

describe("hasAllowedRole", () => {
  it("allows unrestricted routes and matching roles", () => {
    expect(hasAllowedRole(undefined, null)).toBe(true);
    expect(hasAllowedRole([WorkspaceRoles.Admin], WorkspaceRoles.Admin)).toBe(true);
  });

  it("denies missing or non-matching roles", () => {
    expect(hasAllowedRole([WorkspaceRoles.Admin], null)).toBe(false);
    expect(hasAllowedRole([WorkspaceRoles.Admin], WorkspaceRoles.PM)).toBe(false);
  });
});
