import { shallowRef } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PrimeVue from 'primevue/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { giTiempoPrimeVueOptions } from '@gitiempo/web-config/theme';

import type {
  AdminDashboardActivityRow,
  AdminDashboardStatCard,
} from '@/lib/admin-dashboard-view-model';
import { useAuthStore } from '@/stores/auth';

const dashboardMocks = vi.hoisted(() => ({
  errorToast: vi.fn(),
  options: undefined as unknown as {
    accessToken: { value: string | null };
    onError?: CallableFunction;
  },
  refresh: vi.fn(),
  state: undefined as unknown,
}));

vi.mock('@/composables/useAdminDashboardPage', () => ({
  useAdminDashboardPage: (options: typeof dashboardMocks.options) => {
    dashboardMocks.options = options;
    return dashboardMocks.state;
  },
}));

vi.mock('@/composables/useToasts', () => ({
  useToasts: () => ({
    errorToast: dashboardMocks.errorToast,
  }),
}));

import DashboardView from './DashboardView.vue';

const stats: AdminDashboardStatCard[] = [
  { description: '1 tracked today', label: 'Active Members', value: 2 },
  { description: 'Across all projects', label: 'Hours This Week', value: '2h' },
  { description: 'Awaiting acceptance', label: 'Pending Invites', value: 1 },
  { description: '1 added this month', label: 'Active Projects', value: 3 },
];

const activityRows: AdminDashboardActivityRow[] = [
  {
    activity: 'Alex Admin was active in the workspace',
    id: 'member:1:last-active',
    occurredAt: '2026-05-13T11:58:00.000Z',
    timeLabel: '2 min ago',
    timestamp: new Date('2026-05-13T11:58:00.000Z').getTime(),
    type: 'member',
    typeLabel: 'Member',
  },
];

function createDashboardState({
  isInitialLoading = false,
  loadError = null,
  loading = false,
}: {
  isInitialLoading?: boolean;
  loadError?: string | null;
  loading?: boolean;
} = {}) {
  return {
    activityRows: shallowRef(activityRows),
    isInitialLoading: shallowRef(isInitialLoading),
    loadError: shallowRef(loadError),
    loading: shallowRef(loading),
    refresh: dashboardMocks.refresh,
    stats: shallowRef(stats),
  };
}

const DashboardPageSkeletonStub = {
  name: 'DashboardPageSkeleton',
  template: '<div data-testid="dashboard-skeleton" />',
};

const DashboardRecentActivityTableStub = {
  name: 'DashboardRecentActivityTable',
  props: ['rows'],
  template: '<div data-testid="activity-table">{{ rows.length }} rows</div>',
};

function mountDashboardView() {
  const pinia = createPinia();
  setActivePinia(pinia);

  const authStore = useAuthStore(pinia);
  authStore.accessToken = 'access-token';

  return mount(DashboardView, {
    global: {
      plugins: [pinia, [PrimeVue, giTiempoPrimeVueOptions]],
      stubs: {
        DashboardPageSkeleton: DashboardPageSkeletonStub,
        DashboardRecentActivityTable: DashboardRecentActivityTableStub,
      },
    },
  });
}

describe('DashboardView', () => {
  beforeEach(() => {
    dashboardMocks.errorToast.mockClear();
    dashboardMocks.refresh.mockClear();
    dashboardMocks.state = createDashboardState();
  });

  it('renders the page skeleton during the first dashboard load', () => {
    dashboardMocks.state = createDashboardState({
      isInitialLoading: true,
      loading: true,
    });

    const wrapper = mountDashboardView();

    expect(wrapper.find('[data-testid="dashboard-skeleton"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('Workspace overview with key metrics');
  });

  it('renders request failures separately with retry', async () => {
    dashboardMocks.state = createDashboardState({ loadError: 'No scope' });

    const wrapper = mountDashboardView();

    expect(wrapper.text()).toContain('Failed to load dashboard');
    expect(wrapper.text()).toContain('No scope');

    await wrapper.get('button').trigger('click');

    expect(dashboardMocks.refresh).toHaveBeenCalledTimes(1);
  });

  it('renders the dashboard header, four stat cards, and activity table', () => {
    const wrapper = mountDashboardView();

    expect(wrapper.text()).toContain('Dashboard');
    expect(wrapper.text()).toContain(
      'Workspace overview with key metrics and recent activity.',
    );
    expect(wrapper.text()).toContain('Active Members');
    expect(wrapper.text()).toContain('Hours This Week');
    expect(wrapper.text()).toContain('Pending Invites');
    expect(wrapper.text()).toContain('Active Projects');
    expect(wrapper.get('[data-testid="activity-table"]').text()).toContain('1 rows');
  });

  it('passes auth token state and dashboard load failures to standard error toasts', () => {
    mountDashboardView();

    expect(dashboardMocks.options.accessToken.value).toBe('access-token');

    const error = new Error('No scope');
    dashboardMocks.options.onError?.('No scope', error, 'load-dashboard');

    expect(dashboardMocks.errorToast).toHaveBeenCalledWith('No scope', {
      error,
      logContext: { action: 'load-dashboard', feature: 'dashboard' },
    });
  });
});
