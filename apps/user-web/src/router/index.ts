import {
  type RouteRecordRaw,
  type Router,
  type RouterHistory,
} from "vue-router";
import type { Pinia } from "pinia";
import { createProtectedRouter } from "@gitiempo/web-shared/router";

import AppShell from "@/components/layout/AppShell.vue";
import DashboardView from "@/views/DashboardView.vue";
import ForbiddenView from "@/views/ForbiddenView.vue";
import InviteAcceptView from "@/views/InviteAcceptView.vue";
import InvitePasswordSetupView from "@/views/InvitePasswordSetupView.vue";
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
  inviteAccept: "invite-accept",
  invitePasswordSetup: "invite-password-setup",
  login: "login",
  notFound: "not-found",
  profile: "profile",
  project: "project",
  timeEntries: "time-entries",
} as const;

const publicRoutes: RouteRecordRaw[] = [
  {
    path: "/invites/accept",
    name: routeNames.inviteAccept,
    component: InviteAcceptView,
    meta: {
      allowAuthenticatedGuestFlow: true,
    },
  },
  {
    path: "/invites/password-setup",
    name: routeNames.invitePasswordSetup,
    component: InvitePasswordSetupView,
    meta: {
      allowAuthenticatedGuestFlow: true,
    },
  },
  {
    path: "/login",
    name: routeNames.login,
    component: LoginView,
    meta: {
      guestOnly: true,
    },
  },
];

const protectedRoutes: RouteRecordRaw[] = [
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
    path: "projects",
    name: routeNames.project,
    component: ProjectView,
  },
  {
    path: "profile",
    name: routeNames.profile,
    component: ProfileView,
  },
];

const standaloneRoutes: RouteRecordRaw[] = [
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

export function createAppRouter(options?: {
  history?: RouterHistory;
  pinia?: Pinia;
}): Router {
  const appPinia = options?.pinia ?? pinia;

  return createProtectedRouter({
    history: options?.history,
    pinia: appPinia,
    routeNames,
    routes: {
      protected: protectedRoutes,
      public: publicRoutes,
      standalone: standaloneRoutes,
    },
    shellComponent: AppShell,
    useAuthStore,
  });
}

export const router = createAppRouter();
