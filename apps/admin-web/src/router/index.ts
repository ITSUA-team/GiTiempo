import {
  type RouteRecordRaw,
  type Router,
  type RouterHistory,
} from 'vue-router';
import type { Pinia } from 'pinia';
import { WorkspaceRoles } from '@gitiempo/shared';
import { createProtectedRouter } from '@gitiempo/web-shared/router';

import AdminAppShell from '@/components/layout/AdminAppShell.vue';
import AddProjectMockView from '@/views/AddProjectView.vue';
import DashboardView from '@/views/DashboardView.vue';
import ForbiddenView from '@/views/ForbiddenView.vue';
import InvoicesView from '@/views/InvoicesView.vue';
import LoginView from '@/views/LoginView.vue';
import MembersView from '@/views/MembersView.vue';
import NotFoundView from '@/views/NotFoundView.vue';
import ProjectsView from '@/views/ProjectsView.vue';
import ReportsView from '@/views/ReportsView.vue';
import SettingsView from '@/views/SettingsView.vue';
import { pinia } from '@/stores';
import { useAuthStore } from '@/stores/auth';

export const routeNames = {
  addProject: 'admin-add-project',
  dashboard: 'admin-dashboard',
  forbidden: 'admin-forbidden',
  invoices: 'admin-invoices',
  login: 'admin-login',
  members: 'admin-members',
  notFound: 'admin-not-found',
  projects: 'admin-projects',
  reports: 'admin-reports',
  settings: 'admin-settings',
} as const;

const managementRoles = [WorkspaceRoles.Admin, WorkspaceRoles.PM] as const;
const adminOnlyRoles = [WorkspaceRoles.Admin] as const;

const publicRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: routeNames.login,
    component: LoginView,
    meta: {
      guestOnly: true,
    },
  },
];

const protectedRoutes: RouteRecordRaw[] = [
  {
    path: '',
    name: routeNames.dashboard,
    component: DashboardView,
  },
  {
    path: 'reports',
    name: routeNames.reports,
    component: ReportsView,
  },
  {
    path: 'invoices',
    name: routeNames.invoices,
    component: InvoicesView,
    meta: {
      allowedRoles: adminOnlyRoles,
    },
  },
  {
    path: 'members',
    name: routeNames.members,
    component: MembersView,
    meta: {
      allowedRoles: adminOnlyRoles,
    },
  },
  {
    path: 'projects',
    name: routeNames.projects,
    component: ProjectsView,
    meta: {
      allowedRoles: adminOnlyRoles,
    },
  },
  {
    path: 'projects/new',
    name: routeNames.addProject,
    component: AddProjectMockView,
    meta: {
      allowedRoles: adminOnlyRoles,
    },
  },
  {
    path: 'settings',
    name: routeNames.settings,
    component: SettingsView,
    meta: {
      allowedRoles: adminOnlyRoles,
    },
  },
];

const standaloneRoutes: RouteRecordRaw[] = [
  {
    path: '/403',
    name: routeNames.forbidden,
    component: ForbiddenView,
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/:pathMatch(.*)*',
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
    shellComponent: AdminAppShell,
    shellMeta: {
      allowedRoles: managementRoles,
    },
    useAuthStore,
  });
}

export const router = createAppRouter();
