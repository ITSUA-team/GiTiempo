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
