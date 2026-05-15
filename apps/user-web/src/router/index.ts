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
import type { Pinia } from "pinia";

import AppShell from "@/components/layout/AppShell.vue";
import DashboardView from "@/views/DashboardView.vue";
import ForbiddenView from "@/views/ForbiddenView.vue";
import LoginView from "@/views/LoginView.vue";
import NotFoundView from "@/views/NotFoundView.vue";
import ProfileView from "@/views/ProfileView.vue";
import ProjectView from "@/views/ProjectView.vue";
import TimeEntriesView from "@/views/TimeEntriesView.vue";
import { pinia } from "@/stores";
import { useAuthStore } from "@/stores/auth";

export const routeNames = {
  dashboard: "dashboard",
  forbidden: "forbidden",
  login: "login",
  notFound: "not-found",
  profile: "profile",
  project: "project",
  timeEntries: "time-entries",
} as const;

function normalizeRedirectTarget(to: RouteLocationNormalized): string | null {
  const redirect = to.query.redirect;

  return typeof redirect === "string" && redirect.startsWith("/")
    ? redirect
    : null;
}

function getDefaultAuthenticatedRoute(
  to: RouteLocationNormalized,
): RouteLocationRaw {
  return normalizeRedirectTarget(to) ?? { name: routeNames.dashboard };
}

const routes: RouteRecordRaw[] = [
  {
    path: "/login",
    name: routeNames.login,
    component: LoginView,
    meta: {
      guestOnly: true,
    },
  },
  {
    path: "/",
    component: AppShell,
    meta: {
      requiresAuth: true,
    },
    children: [
      {
        path: "",
        name: routeNames.dashboard,
        component: DashboardView,
      },
      {
        path: "time-entries",
        name: routeNames.timeEntries,
        component: TimeEntriesView,
      },
      {
        path: "projects/:projectId",
        name: routeNames.project,
        component: ProjectView,
      },
      {
        path: "profile",
        name: routeNames.profile,
        component: ProfileView,
      },
    ],
  },
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
    name: routeNames.notFound,
    component: NotFoundView,
    meta: {
      requiresAuth: true,
    },
  },
];

function createAppHistory(): RouterHistory {
  return typeof window === "undefined"
    ? createMemoryHistory()
    : createWebHistory();
}

async function handleAuthNavigation(
  to: RouteLocationNormalized,
  authStore: ReturnType<typeof useAuthStore>,
): Promise<RouteLocationRaw | undefined> {
  if (to.meta.requiresAuth || to.meta.guestOnly) {
    await authStore.bootstrapSession();
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return {
      name: routeNames.login,
      query: { redirect: to.fullPath },
    };
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return getDefaultAuthenticatedRoute(to);
  }

  return undefined;
}

export function createAppRouter(options?: {
  history?: RouterHistory;
  pinia?: Pinia;
}): Router {
  const appPinia = options?.pinia ?? pinia;
  const router = createRouter({
    history: options?.history ?? createAppHistory(),
    routes,
  });

  router.beforeEach(async (to) => {
    return handleAuthNavigation(to, useAuthStore(appPinia));
  });

  return router;
}

export const router = createAppRouter();
