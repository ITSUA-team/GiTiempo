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
import { createProtectedRouter } from '@gitiempo/web-shared/router';

import AdminAppShell from '@/components/layout/AdminAppShell.vue';
import { routeNames } from '@/constants/routes';
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

type AdminRouteName = (typeof routeNames)[keyof typeof routeNames];
type AdminNonProductRouteName =
  | typeof routeNames.forbidden
  | typeof routeNames.login
  | typeof routeNames.notFound;
type AdminProductRouteName = Exclude<AdminRouteName, AdminNonProductRouteName>;

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
} as const satisfies Record<AdminProductRouteName, readonly WorkspaceRole[]>;

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
      pageName: 'Dashboard',
    },
  },
  {
    path: 'reports',
    name: routeNames.reports,
    component: ReportsView,
    meta: {
      allowedRoles: adminRouteAllowedRoles[routeNames.reports],
      pageName: 'Reports',
    },
  },
  {
    path: 'invoices',
    name: routeNames.invoices,
    component: InvoicesView,
    meta: {
      allowedRoles: adminRouteAllowedRoles[routeNames.invoices],
      pageName: 'Invoices',
    },
  },
  {
    path: 'members',
    name: routeNames.members,
    component: MembersView,
    meta: {
      allowedRoles: adminRouteAllowedRoles[routeNames.members],
      pageName: 'Members',
    },
  },
  {
    path: 'projects',
    name: routeNames.projects,
    component: ProjectsView,
    meta: {
      allowedRoles: adminRouteAllowedRoles[routeNames.projects],
      pageName: 'Projects',
    },
  },
  {
    path: 'projects/new',
    name: routeNames.addProject,
    component: AddProjectMockView,
    meta: {
      allowedRoles: adminRouteAllowedRoles[routeNames.addProject],
      pageName: 'New Project',
    },
  },
  {
    path: 'settings',
    name: routeNames.settings,
    component: SettingsView,
    meta: {
      allowedRoles: adminRouteAllowedRoles[routeNames.settings],
      pageName: 'Settings',
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
    shellComponent: AdminAppShell,
    shellMeta: {
      allowedRoles: managementRoles,
    },
    useAuthStore,
  });
}

export const router = createAppRouter();

export { routeNames };
