import { computed, shallowRef } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PrimeVue from 'primevue/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { giTiempoPrimeVueOptions } from '@gitiempo/web-config/theme';

import {
  createDefaultReportTableFilters,
  deriveReportSummary,
  type ReportDateRange,
  type ReportGroupBy,
  type ReportRow,
} from '@/composables/useReportsData';
import type * as ReportsDataModule from '@/composables/useReportsData';
import { useAuthStore } from '@/stores/auth';

const reportMocks = vi.hoisted(() => ({
  buildRowsForFilters: vi.fn(),
  downloadReportsCsv: vi.fn(() => 'gitiempo-reports-2026-05-13.csv'),
  errorToast: vi.fn(),
  refresh: vi.fn(),
  state: undefined as unknown,
  successToast: vi.fn(),
}));

vi.mock('@/composables/useToasts', () => ({
  useToasts: () => ({
    errorToast: reportMocks.errorToast,
    successToast: reportMocks.successToast,
  }),
}));

vi.mock('@/composables/useReportsData', async (importOriginal) => {
  const actual = await importOriginal<typeof ReportsDataModule>();

  return {
    ...actual,
    downloadReportsCsv: reportMocks.downloadReportsCsv,
    useReportsData: () => reportMocks.state,
  };
});

import ReportsView from './ReportsView.vue';

const ReportsFilterFormStub = {
  name: 'ReportsFilterForm',
  props: [
    'projectId',
    'memberId',
    'dateRange',
    'groupBy',
    'projectOptions',
    'memberOptions',
    'disabled',
  ],
  emits: [
    'update:projectId',
    'update:memberId',
    'update:dateRange',
    'update:groupBy',
  ],
  template:
    '<div data-testid="reports-filter-form"><button data-testid="change-report-project" @click="$emit(\'update:projectId\', \'project-2\')">filters</button></div>',
};

const ReportsTableStub = {
  name: 'ReportsTable',
  props: ['rows', 'loading', 'projectOptions', 'memberOptions', 'filters'],
  template: '<div data-testid="reports-table">{{ rows.length }} rows</div>',
};

const ManagementPageSkeletonStub = {
  name: 'ManagementPageSkeleton',
  props: ['variant'],
  template: '<div data-testid="reports-skeleton">{{ variant }}</div>',
};

const reportRow: ReportRow = {
  billableSeconds: 3600,
  billableShare: 0.5,
  entryCount: 2,
  id: 'project-1',
  memberIds: ['member-1'],
  memberName: 'Alex Admin',
  projectIds: ['project-1'],
  projectName: 'Project Orion',
  totalSeconds: 7200,
};

function createReportState({
  isInitialLoading = false,
  loadError = null,
  loading = false,
  rows = [reportRow],
}: {
  isInitialLoading?: boolean;
  loadError?: string | null;
  loading?: boolean;
  rows?: ReportRow[];
} = {}) {
  const reportRows = shallowRef(rows);

  return {
    dateRange: shallowRef<ReportDateRange>(null),
    entries: shallowRef([]),
    groupBy: shallowRef<ReportGroupBy>('project'),
    initialLoaded: shallowRef(!isInitialLoading),
    isEmpty: computed(() => reportRows.value.length === 0),
    isInitialLoading: shallowRef(isInitialLoading),
    loadError: shallowRef(loadError),
    loading: shallowRef(loading),
    memberOptions: computed(() => [{ label: 'Alex Admin', value: 'member-1' }]),
    projectOptions: computed(() => [{ label: 'Project Orion', value: 'project-1' }]),
    projects: shallowRef([]),
    buildRowsForFilters: reportMocks.buildRowsForFilters,
    refresh: reportMocks.refresh,
    rows: reportRows,
    selectedMemberId: shallowRef<string | null>(null),
    selectedProjectId: shallowRef<string | null>(null),
    summary: computed(() =>
      deriveReportSummary([
        {
          createdAt: '2026-05-01T10:00:00.000Z',
          description: null,
          durationSeconds: 7200,
          endedAt: '2026-05-01T12:00:00.000Z',
          id: '55555555-5555-4555-8555-555555555551',
          isBillable: true,
          project: {
            id: '11111111-1111-4111-8111-111111111111',
            name: 'Project Orion',
          },
          projectId: '11111111-1111-4111-8111-111111111111',
          source: 'manual',
          startedAt: '2026-05-01T10:00:00.000Z',
          task: {
            id: '22222222-2222-4222-8222-222222222222',
            title: 'Implementation',
          },
          taskId: '22222222-2222-4222-8222-222222222222',
          updatedAt: '2026-05-01T12:00:00.000Z',
          user: {
            avatarUrl: null,
            displayName: 'Alex Admin',
            email: 'alex@example.com',
            id: '33333333-3333-4333-8333-333333333333',
          },
          userId: '33333333-3333-4333-8333-333333333333',
          workspaceId: '44444444-4444-4444-8444-444444444444',
        },
      ]),
    ),
    tableFilters: shallowRef(createDefaultReportTableFilters()),
  };
}

function mountReportsView() {
  const pinia = createPinia();
  setActivePinia(pinia);

  const authStore = useAuthStore(pinia);
  authStore.accessToken = 'access-token';

  return mount(ReportsView, {
    global: {
      plugins: [pinia, [PrimeVue, giTiempoPrimeVueOptions]],
      stubs: {
        ManagementPageSkeleton: ManagementPageSkeletonStub,
        ReportsFilterForm: ReportsFilterFormStub,
        ReportsTable: ReportsTableStub,
      },
    },
  });
}

describe('ReportsView', () => {
  beforeEach(() => {
    reportMocks.buildRowsForFilters.mockReset();
    reportMocks.buildRowsForFilters.mockResolvedValue([reportRow]);
    reportMocks.downloadReportsCsv.mockClear();
    reportMocks.errorToast.mockClear();
    reportMocks.refresh.mockClear();
    reportMocks.successToast.mockClear();
    reportMocks.state = createReportState();
  });

  it('shows the reports skeleton during initial load', () => {
    reportMocks.state = createReportState({ isInitialLoading: true, loading: true });

    const wrapper = mountReportsView();

    expect(wrapper.get('[data-testid="reports-skeleton"]').text()).toContain(
      'reports',
    );
    expect(wrapper.text()).not.toContain('Export CSV');
  });

  it('renders request errors separately with a retry action', async () => {
    reportMocks.state = createReportState({ loadError: 'No scope' });

    const wrapper = mountReportsView();

    expect(wrapper.text()).toContain('Failed to load reports');
    expect(wrapper.text()).toContain('No scope');

    await wrapper.get('button').trigger('click');

    expect(reportMocks.refresh).toHaveBeenCalledTimes(1);
  });

  it('renders reports and exports the currently visible rows', async () => {
    const wrapper = mountReportsView();
    await flushPromises();

    expect(wrapper.text()).toContain('Reports');
    expect(wrapper.text()).toContain('Tracked Hours');
    expect(wrapper.get('[data-testid="reports-table"]').text()).toContain('1 rows');

    await wrapper.get('[data-testid="export-reports-csv"]').trigger('click');
    await flushPromises();

    expect(reportMocks.buildRowsForFilters).toHaveBeenCalledWith({
      dateRange: null,
      groupBy: 'project',
      memberId: null,
      projectId: null,
    });
    expect(reportMocks.downloadReportsCsv).toHaveBeenCalledWith([reportRow]);
    expect(reportMocks.successToast).toHaveBeenCalledWith(
      'Exported gitiempo-reports-2026-05-13.csv.',
    );
  });

  it('keeps header report setup changes separate from table data', async () => {
    const wrapper = mountReportsView();
    const state = reportMocks.state as ReturnType<typeof createReportState>;
    await flushPromises();

    await wrapper.get('[data-testid="change-report-project"]').trigger('click');

    expect(state.selectedProjectId.value).toBeNull();
    expect(reportMocks.refresh).not.toHaveBeenCalled();
    expect(wrapper.get('[data-testid="reports-table"]').text()).toContain('1 rows');

    await wrapper.get('[data-testid="export-reports-csv"]').trigger('click');
    await flushPromises();

    expect(reportMocks.buildRowsForFilters).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'project-2' }),
    );
  });
});
