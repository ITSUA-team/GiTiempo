import {
  type RouteRecordRaw,
  type Router,
  type RouterHistory,
} from "vue-router";
import type { Pinia } from "pinia";
import { createProtectedRouter } from "@gitiempo/web-shared/router";

import AppShell from "@/components/layout/AppShell.vue";
import LoginView from "@/views/LoginView.vue";
import { pinia } from "@/stores";
import { useAuthStore } from "@/stores/auth";

const DashboardView = () => import("@/views/DashboardView.vue");
const ForbiddenView = () => import("@/views/ForbiddenView.vue");
const InviteAcceptView = () => import("@/views/InviteAcceptView.vue");
const InvitePasswordSetupView = () =>
  import("@/views/InvitePasswordSetupView.vue");
const NotFoundView = () => import("@/views/NotFoundView.vue");
const ProfileView = () => import("@/views/ProfileView.vue");
const ProjectView = () => import("@/views/ProjectView.vue");
const TimeEntriesView = () => import("@/views/TimeEntriesView.vue");

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
    meta: {
      pageName: "Dashboard",
    },
  },
  {
    path: "time-entries",
    name: routeNames.timeEntries,
    component: TimeEntriesView,
    meta: {
      pageName: "Time Entries",
    },
  },
  {
    path: "projects",
    name: routeNames.project,
    component: ProjectView,
    meta: {
      pageName: "Projects",
    },
  },
  {
    path: "profile",
    name: routeNames.profile,
    component: ProfileView,
    meta: {
      pageName: "Profile",
    },
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
    defaultAuthenticatedRoute: { name: routeNames.dashboard },
    history: options?.history,
    pinia: appPinia,
    routeNames: {
      forbidden: routeNames.forbidden,
      login: routeNames.login,
    },
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
