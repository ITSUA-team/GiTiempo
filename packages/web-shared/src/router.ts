import type { WorkspaceRole } from "@gitiempo/shared";
import type { Component } from "vue";
import {
  createMemoryHistory,
  createRouter,
  createWebHistory,
  type RouteLocationNormalized,
  type RouteLocationRaw,
  type RouteRecordRaw,
  type Router,
  type RouterHistory,
} from "vue-router";

type RouteName = string | symbol;

interface AuthStoreAccessor<TPinia, TAuthStore extends ProtectedRouterAuthStore> {
  // eslint-disable-next-line no-unused-vars
  (pinia: TPinia): TAuthStore;
}

interface ProtectedRouteMeta {
  allowedRoles?: readonly WorkspaceRole[];
  guestOnly?: boolean;
  requiresAuth?: boolean;
}

export interface ProtectedRouterAuthStore {
  bootstrapSession(): Promise<void>;
  readonly isAuthenticated: boolean;
  readonly profile?: {
    readonly role?: WorkspaceRole | null;
  } | null;
}

export interface ProtectedRouterRouteNames {
  dashboard: RouteName;
  forbidden: RouteName;
  login: RouteName;
}

export interface ProtectedRouterRoutes {
  protected: RouteRecordRaw[];
  public?: RouteRecordRaw[];
  standalone?: RouteRecordRaw[];
}

export interface CreateProtectedRouterOptions<
  TPinia,
  TAuthStore extends ProtectedRouterAuthStore,
> {
  history?: RouterHistory;
  pinia: TPinia;
  routeNames: ProtectedRouterRouteNames;
  routes: ProtectedRouterRoutes;
  shellComponent: Component;
  shellMeta?: ProtectedRouteMeta;
  useAuthStore: AuthStoreAccessor<TPinia, TAuthStore>;
}

function createAppHistory(): RouterHistory {
  return typeof window === "undefined"
    ? createMemoryHistory()
    : createWebHistory();
}

function getRouteMeta(route: { meta: unknown }): ProtectedRouteMeta {
  return route.meta as ProtectedRouteMeta;
}

function normalizeRedirectTarget(to: RouteLocationNormalized): string | null {
  const redirect = to.query.redirect;

  return typeof redirect === "string" && redirect.startsWith("/")
    ? redirect
    : null;
}

function getDefaultAuthenticatedRoute(
  to: RouteLocationNormalized,
  routeNames: ProtectedRouterRouteNames,
): RouteLocationRaw {
  return normalizeRedirectTarget(to) ?? { name: routeNames.dashboard };
}

export function hasAllowedRole(
  allowedRoles: readonly WorkspaceRole[] | undefined,
  role: WorkspaceRole | null | undefined,
): boolean {
  return allowedRoles === undefined || Boolean(role && allowedRoles.includes(role));
}

async function handleAuthNavigation(
  to: RouteLocationNormalized,
  authStore: ProtectedRouterAuthStore,
  routeNames: ProtectedRouterRouteNames,
): Promise<RouteLocationRaw | undefined> {
  const meta = getRouteMeta(to);
  const requiresAuth = to.matched.some(
    (route) => getRouteMeta(route).requiresAuth === true,
  );

  if (requiresAuth || meta.guestOnly) {
    await authStore.bootstrapSession();
  }

  if (requiresAuth && !authStore.isAuthenticated) {
    return {
      name: routeNames.login,
      query: { redirect: to.fullPath },
    };
  }

  if (meta.guestOnly && authStore.isAuthenticated) {
    return getDefaultAuthenticatedRoute(to, routeNames);
  }

  if (
    requiresAuth &&
    !hasAllowedRole(meta.allowedRoles, authStore.profile?.role)
  ) {
    return { name: routeNames.forbidden };
  }

  return undefined;
}

function createRoutes(
  routes: ProtectedRouterRoutes,
  shellComponent: Component,
  shellMeta: ProtectedRouteMeta | undefined,
): RouteRecordRaw[] {
  return [
    ...(routes.public ?? []),
    {
      path: "/",
      component: shellComponent,
      meta: {
        ...shellMeta,
        requiresAuth: true,
      },
      children: routes.protected,
    },
    ...(routes.standalone ?? []),
  ];
}

export function createProtectedRouter<
  TPinia,
  TAuthStore extends ProtectedRouterAuthStore,
>({
  history,
  pinia,
  routeNames,
  routes,
  shellComponent,
  shellMeta,
  useAuthStore,
}: CreateProtectedRouterOptions<TPinia, TAuthStore>): Router {
  const router = createRouter({
    history: history ?? createAppHistory(),
    routes: createRoutes(routes, shellComponent, shellMeta),
  });

  router.beforeEach(async (to) => {
    return handleAuthNavigation(to, useAuthStore(pinia), routeNames);
  });

  return router;
}
