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

import AdminAppShell from '@/components/layout/AdminAppShell.vue';
import AddProjectMockView from '@/views/AddProjectView.vue';
import DashboardView from '@/views/DashboardView.vue';
import InvoicesView from '@/views/InvoicesView.vue';
import LoginView from '@/views/LoginView.vue';
import MembersView from '@/views/MembersView.vue';
import ProjectsView from '@/views/ProjectsView.vue';
import ReportsView from '@/views/ReportsView.vue';
import SettingsView from '@/views/SettingsView.vue';
import { pinia } from '@/stores';
import { useAuthStore } from '@/stores/auth';

export const routeNames = {
  addProject: 'admin-add-project',
  dashboard: 'admin-dashboard',
  invoices: 'admin-invoices',
  login: 'admin-login',
  members: 'admin-members',
  projects: 'admin-projects',
  reports: 'admin-reports',
  settings: 'admin-settings',
} as const;

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
      },
      {
        path: 'members',
        name: routeNames.members,
        component: MembersView,
      },
      {
        path: 'projects',
        name: routeNames.projects,
        component: ProjectsView,
      },
      {
        path: 'projects/new',
        name: routeNames.addProject,
        component: AddProjectMockView,
      },
      {
        path: 'settings',
        name: routeNames.settings,
        component: SettingsView,
      },
    ],
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
