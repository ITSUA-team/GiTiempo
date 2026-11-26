import { VueQueryPlugin } from '@tanstack/vue-query';
import { clearRefreshToken, setRefreshToken } from '@gitiempo/web-shared/session-storage';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';
import { afterEach, expect, it, vi } from 'vitest';
import { createMemoryHistory } from 'vue-router';

import App from '@/App.vue';
import { queryClient, vueQueryPluginOptions } from '@/query-client';
import { createAppRouter, routeNames } from '@/router';

vi.mock('@/views/DashboardView.vue', () => ({
  default: { template: '<h1>Dashboard</h1>' },
}));

const userId = '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9000';
const adminWorkspace = {
  workspaceId: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001',
  workspaceName: 'Workspace Alpha',
  role: 'admin',
};
const pmWorkspace = {
  workspaceId: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002',
  workspaceName: 'Workspace Beta',
  role: 'pm',
};
const timestamp = '2026-05-01T10:00:00.000Z';
const settingsPath = '/workspace/settings';
const organizationsPath = '/workspace/github/organizations';
const installationsPath = '/workspace/github/installations';
const adminOnlyPaths = [settingsPath, organizationsPath, installationsPath];
const forbiddenMessage = 'Forbidden';

function tokenPair(workspace: typeof adminWorkspace) {
  const payload = btoa(JSON.stringify({
    role: workspace.role,
    sub: userId,
    workspaceId: workspace.workspaceId,
  }));
  return {
    accessToken: `header.${payload}.signature`,
    accessTokenExpiresIn: 900,
    refreshToken: `${workspace.role}-refresh-token`,
  };
}

afterEach(() => {
  queryClient.clear();
  clearRefreshToken();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it('leaves Settings for the admin dashboard without requesting admin data as PM', async () => {
  const adminSession = tokenPair(adminWorkspace);
  const pmSession = tokenPair(pmWorkspace);
  const adminReads: string[] = [];
  const forbiddenPmReads: string[] = [];

  const fetchMock: typeof fetch = async (input, init) => {
    const { pathname } = new URL(String(input), window.location.origin);
    const method = init?.method ?? 'GET';
    const authorization = new Headers(init?.headers).get('authorization');
    const workspace = authorization === `Bearer ${pmSession.accessToken}`
      ? pmWorkspace
      : adminWorkspace;

    if (method === 'GET' && adminOnlyPaths.includes(pathname)) {
      if (workspace === pmWorkspace) {
        forbiddenPmReads.push(pathname);
        return Response.json({
          message: forbiddenMessage,
          error: 'Forbidden',
          statusCode: 403,
        }, { status: 403 });
      }
      if (authorization === `Bearer ${adminSession.accessToken}`) {
        adminReads.push(pathname);
      }
    }

    switch (`${method} ${pathname}`) {
      case 'POST /auth/refresh':
        return Response.json(adminSession);
      case 'POST /auth/switch-workspace':
        expect(authorization).toBe(`Bearer ${adminSession.accessToken}`);
        expect(JSON.parse(String(init?.body))).toMatchObject({ workspaceId: pmWorkspace.workspaceId });
        return Response.json(pmSession);
      case 'GET /users/me':
        return Response.json({
          id: userId,
          avatarUrl: null,
          canViewInvoices: true,
          displayName: 'Workspace User',
          email: 'user@example.test',
          role: workspace.role,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      case 'GET /users/me/workspaces':
        return Response.json({
          items: [adminWorkspace, pmWorkspace].map(item => ({ ...item, isCurrent: item === workspace })),
        });
      case 'GET /workspace':
        return Response.json({
          id: workspace.workspaceId,
          name: workspace.workspaceName,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      case `GET ${settingsPath}`:
        return Response.json({
          id: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9003',
          workspaceId: workspace.workspaceId,
          currency: 'USD',
          defaultHourlyRate: 120,
          timeRoundingStepMinutes: 1,
          timeZone: 'UTC',
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      case `GET ${organizationsPath}`:
      case `GET ${installationsPath}`:
        return Response.json({ items: [] });
      case 'GET /github/connection':
        return Response.json({
          account: null,
          capabilities: { organizationDiscovery: 'authorization_required', personalData: 'authorization_required' },
          disconnect: 'allowed',
          oauth: { missingScopes: [], status: 'not_authorized' },
          status: 'disconnected',
        });
      default:
        throw new Error(`Unexpected request: ${method} ${pathname}`);
    }
  };
  vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));

  setRefreshToken(adminSession.refreshToken);
  const pinia = createPinia();
  const router = createAppRouter({ history: createMemoryHistory(), pinia });
  await router.push({ name: routeNames.settings });
  const wrapper = mount(App, {
    global: {
      directives: { tooltip: {} },
      plugins: [
        pinia,
        router,
        [VueQueryPlugin, vueQueryPluginOptions],
        PrimeVue,
        ToastService,
        ConfirmationService,
      ],
    },
  });

  try {
    await vi.waitFor(() => {
      expect(wrapper.findAll('button').some(button => button.text() === 'Save Settings')).toBe(true);
      expect([...new Set(adminReads)].sort()).toEqual([...adminOnlyPaths].sort());
    });
    expect(document.querySelector('[role="alert"]')).toBeNull();

    await wrapper.get('[data-testid="profile-menu-trigger"]').trigger('click');
    await wrapper.get(`[data-testid="profile-menu-workspace-${pmWorkspace.workspaceId}"]`).trigger('click');

    await vi.waitFor(() => {
      expect(router.currentRoute.value.name).toBe(routeNames.dashboard);
      expect(wrapper.get('h1').text()).toBe('Dashboard');
    });
    await flushPromises();

    expect.soft(forbiddenPmReads.sort(), 'Admin-only GETs with the PM token').toEqual([]);
    const forbiddenToasts = [...document.querySelectorAll('[role="alert"]')]
      .map(alert => alert.textContent?.trim() ?? '')
      .filter(message => message.includes(forbiddenMessage));
    expect.soft(forbiddenToasts, 'Forbidden toasts after switching workspaces').toEqual([]);
  } finally {
    wrapper.unmount();
  }
});
