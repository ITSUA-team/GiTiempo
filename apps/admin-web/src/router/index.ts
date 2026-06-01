import {
  type RouteRecordRaw,
  type Router,
  type RouterHistory,
} from 'vue-router';
import type { Pinia } from 'pinia';
import {
  WorkspaceRoles,
  type WorkspaceRole,
} from '@gitiempo/shared';
import {
  createProtectedRouter,
  hasAllowedRole,
} from '@gitiempo/web-shared/router';

import AdminAppShell from '@/components/layout/AdminAppShell.vue';
import LoginView from '@/views/LoginView.vue';
import { pinia } from '@/stores';
import { useAuthStore } from '@/stores/auth';

const AddProjectMockView = () => import('@/views/AddProjectView.vue');
const DashboardView = () => import('@/views/DashboardView.vue');
const ForbiddenView = () => import('@/views/ForbiddenView.vue');
const InvoicesView = () => import('@/views/InvoicesView.vue');
const MembersView = () => import('@/views/MembersView.vue');
const NotFoundView = () => import('@/views/NotFoundView.vue');
const ProjectsView = () => import('@/views/ProjectsView.vue');
const ReportsView = () => import('@/views/ReportsView.vue');
const SettingsView = () => import('@/views/SettingsView.vue');

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

type AdminRouteName = (typeof routeNames)[keyof typeof routeNames];

const adminOnlyRoles = [
  WorkspaceRoles.Admin,
] as const satisfies readonly WorkspaceRole[];
const managementRoles = [
  WorkspaceRoles.Admin,
  WorkspaceRoles.PM,
] as const satisfies readonly WorkspaceRole[];

export const adminRouteAllowedRoles = {
  [routeNames.addProject]: adminOnlyRoles,
  [routeNames.dashboard]: managementRoles,
  [routeNames.invoices]: adminOnlyRoles,
  [routeNames.members]: adminOnlyRoles,
  [routeNames.projects]: adminOnlyRoles,
  [routeNames.reports]: managementRoles,
  [routeNames.settings]: adminOnlyRoles,
} as const satisfies Partial<Record<AdminRouteName, readonly WorkspaceRole[]>>;

export function canAccessAdminRoute(
  role: WorkspaceRole | null | undefined,
  routeName: string | symbol | null | undefined,
): boolean {
  if (typeof routeName !== 'string') {
    return true;
  }

  const allowedRoles = adminRouteAllowedRoles[
    routeName as keyof typeof adminRouteAllowedRoles
  ];

  return hasAllowedRole(allowedRoles, role);
}

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
    meta: {
      allowedRoles: adminRouteAllowedRoles[routeNames.dashboard],
    },
  },
  {
    path: 'reports',
    name: routeNames.reports,
    component: ReportsView,
    meta: {
      allowedRoles: adminRouteAllowedRoles[routeNames.reports],
    },
  },
  {
    path: 'invoices',
    name: routeNames.invoices,
    component: InvoicesView,
    meta: {
      allowedRoles: adminRouteAllowedRoles[routeNames.invoices],
    },
  },
  {
    path: 'members',
    name: routeNames.members,
    component: MembersView,
    meta: {
      allowedRoles: adminRouteAllowedRoles[routeNames.members],
    },
  },
  {
    path: 'projects',
    name: routeNames.projects,
    component: ProjectsView,
    meta: {
      allowedRoles: adminRouteAllowedRoles[routeNames.projects],
    },
  },
  {
    path: 'projects/new',
    name: routeNames.addProject,
    component: AddProjectMockView,
    meta: {
      allowedRoles: adminRouteAllowedRoles[routeNames.addProject],
    },
  },
  {
    path: 'settings',
    name: routeNames.settings,
    component: SettingsView,
    meta: {
      allowedRoles: adminRouteAllowedRoles[routeNames.settings],
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
