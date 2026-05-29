import {
  createMemoryHistory,
  createRouter,
  createWebHistory,
  type RouteLocationNormalized,
  type RouteLocationRaw,
  type RouteRecordRaw,
  type Router,
  type RouterHistory,
} from 'vue-router';
import type { Pinia } from 'pinia';
import {
  WorkspaceRoles,
  type WorkspaceRole,
} from '@gitiempo/shared';

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

type AdminRouteName = (typeof routeNames)[keyof typeof routeNames];

const adminOnlyRoles = [WorkspaceRoles.Admin] as const satisfies readonly WorkspaceRole[];
const adminAndPmRoles = [
  WorkspaceRoles.Admin,
  WorkspaceRoles.PM,
] as const satisfies readonly WorkspaceRole[];

export const adminRouteAllowedRoles = {
  [routeNames.addProject]: adminOnlyRoles,
  [routeNames.dashboard]: adminAndPmRoles,
  [routeNames.invoices]: adminOnlyRoles,
  [routeNames.members]: adminOnlyRoles,
  [routeNames.projects]: adminOnlyRoles,
  [routeNames.reports]: adminAndPmRoles,
  [routeNames.settings]: adminOnlyRoles,
} as const satisfies Partial<Record<AdminRouteName, readonly WorkspaceRole[]>>;

function isRoleAllowed(
  role: WorkspaceRole | null | undefined,
  allowedRoles?: readonly WorkspaceRole[],
): boolean {
  return !allowedRoles || (!!role && allowedRoles.includes(role));
}

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

  return isRoleAllowed(role, allowedRoles);
}

function normalizeRedirectTarget(to: RouteLocationNormalized): string | null {
  const redirect = to.query.redirect;

  return typeof redirect === 'string' && redirect.startsWith('/')
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
    path: '/login',
    name: routeNames.login,
    component: LoginView,
    meta: {
      guestOnly: true,
    },
  },
  {
    path: '/',
    component: AdminAppShell,
    meta: {
      requiresAuth: true,
    },
    children: [
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
    ],
  },
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

function createAppHistory(): RouterHistory {
  return typeof window === 'undefined'
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

  if (
    to.meta.requiresAuth &&
    !isRoleAllowed(authStore.profile?.role, to.meta.allowedRoles)
  ) {
    return { name: routeNames.forbidden };
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
