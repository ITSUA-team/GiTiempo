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
import { WorkspaceRoles } from '@gitiempo/shared';

import AdminAppShell from '@/components/layout/AdminAppShell.vue';
import { hasAllowedRole } from '@/router/rbac';
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
      allowedRoles: managementRoles,
      requiresAuth: true,
    },
    children: [
      { path: '', name: routeNames.dashboard, component: DashboardView },
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
    !hasAllowedRole(to.meta.allowedRoles, authStore.profile?.role)
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
