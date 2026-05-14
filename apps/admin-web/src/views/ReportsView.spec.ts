import { computed, shallowRef } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PrimeVue from 'primevue/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { giTiempoPrimeVueOptions } from '@gitiempo/web-config/theme';
import type { TimeReportGroupBy } from '@gitiempo/shared';

import type {
  ReportDateRange,
  ReportSummaryView,
  ReportTableRow,
} from '@/lib/report-view-model';
import { useAuthStore } from '@/stores/auth';

const reportMocks = vi.hoisted(() => ({
  downloadReportExport: vi.fn(
    (exportResult: { filename: string }) => exportResult.filename,
  ),
  errorToast: vi.fn(),
  exportCurrentReport: vi.fn(),
  infoToast: vi.fn(),
  refresh: vi.fn(),
  state: undefined as unknown,
  successToast: vi.fn(),
}));

vi.mock('@/composables/useToasts', () => ({
  useToasts: () => ({
    errorToast: reportMocks.errorToast,
    infoToast: reportMocks.infoToast,
    successToast: reportMocks.successToast,
  }),
}));

vi.mock('@/lib/report-download', () => ({
  downloadReportExport: reportMocks.downloadReportExport,
}));

vi.mock('@/composables/useReportsData', () => ({
  useReportsData: () => reportMocks.state,
}));

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
  setup() {
    return {
      invalidDateRange: [
        new Date('2026-05-03T12:00:00.000Z'),
        new Date('2026-05-02T12:00:00.000Z'),
      ],
    };
  },
  template:
    '<div data-testid="reports-filter-form"><button data-testid="change-report-project" @click="$emit(\'update:projectId\', \'project-2\')">filters</button><button data-testid="change-report-member" @click="$emit(\'update:memberId\', \'member-2\')">member</button><button data-testid="change-report-group-by" @click="$emit(\'update:groupBy\', \'user\')">group</button><button data-testid="set-invalid-report-date" @click="$emit(\'update:dateRange\', invalidDateRange)">invalid dates</button></div>',
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

const reportRow: ReportTableRow = {
  billableSeconds: 3600,
  billableShare: 0.5,
  entryCount: 2,
  groupBy: 'project',
  id: 'project-1',
  memberIds: ['member-1'],
  memberName: 'Alex Admin',
  nonBillableSeconds: 3600,
  projectIds: ['project-1'],
  projectName: 'Project Orion',
  totalSeconds: 7200,
};

const summary: ReportSummaryView = {
  avgPerMemberSeconds: 7200,
  billableSeconds: 3600,
  billableShare: 0.5,
  entryCount: 2,
  memberCount: 1,
  nonBillableSeconds: 3600,
  topProjectName: 'Project Orion',
  topProjectSeconds: 7200,
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
  rows?: ReportTableRow[];
} = {}) {
  const reportRows = shallowRef(rows);

  return {
    dateRange: shallowRef<ReportDateRange>(null),
    exportCurrentReport: reportMocks.exportCurrentReport,
    getFilteredRows: vi.fn(),
    groupBy: shallowRef<TimeReportGroupBy>('project'),
    initialLoaded: shallowRef(!isInitialLoading),
    isEmpty: computed(() => reportRows.value.length === 0),
    isInitialLoading: shallowRef(isInitialLoading),
    loadError: shallowRef(loadError),
    loading: shallowRef(loading),
    memberOptions: computed(() => [{ label: 'Alex Admin', value: 'member-1' }]),
    projectOptions: computed(() => [{ label: 'Project Orion', value: 'project-1' }]),
    projects: shallowRef([]),
    refresh: reportMocks.refresh,
    reportResponse: shallowRef(null),
    rows: reportRows,
    selectedMemberId: shallowRef<string | null>(null),
    selectedProjectId: shallowRef<string | null>(null),
    summary: computed(() => ({
      ...summary,
      totalSeconds: rows.reduce((total, row) => total + row.totalSeconds, 0),
    })),
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
    reportMocks.downloadReportExport.mockClear();
    reportMocks.errorToast.mockClear();
    reportMocks.exportCurrentReport.mockReset();
    reportMocks.exportCurrentReport.mockResolvedValue({
      blob: new Blob(['csv'], { type: 'text/csv' }),
      filename: 'time-report-2026-05.csv',
    });
    reportMocks.infoToast.mockClear();
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

  it('renders API-backed reports and exports through the backend CSV result', async () => {
    const wrapper = mountReportsView();
    await flushPromises();

    expect(wrapper.text()).toContain('Reports');
    expect(wrapper.text()).toContain('Tracked Hours');
    expect(wrapper.text()).toContain('Across 1 member');
    expect(wrapper.text()).toContain('Within PM scope');
    expect(wrapper.text()).toContain('Weekly average');
    expect(wrapper.text()).toContain('2h 00m tracked this period');
    expect(wrapper.get('[data-testid="reports-table"]').text()).toContain('1 rows');

    await wrapper.get('[data-testid="export-reports-csv"]').trigger('click');
    await flushPromises();

    expect(reportMocks.exportCurrentReport).toHaveBeenCalledWith({
      dateRange: null,
      groupBy: 'project',
      memberId: null,
      projectId: null,
    });
    expect(reportMocks.downloadReportExport).toHaveBeenCalledWith({
      blob: expect.any(Blob),
      filename: 'time-report-2026-05.csv',
    });
    expect(reportMocks.successToast).toHaveBeenCalledWith(
      'Exported time-report-2026-05.csv.',
    );
  });

  it('exports through the backend even when the loaded report has no rows', async () => {
    reportMocks.state = createReportState({ rows: [] });
    reportMocks.exportCurrentReport.mockResolvedValueOnce({
      blob: new Blob(['Group By,Project\n'], { type: 'text/csv' }),
      filename: 'time-report-empty.csv',
    });

    const wrapper = mountReportsView();
    await flushPromises();

    await wrapper.get('[data-testid="export-reports-csv"]').trigger('click');
    await flushPromises();

    expect(reportMocks.exportCurrentReport).toHaveBeenCalledWith({
      dateRange: null,
      groupBy: 'project',
      memberId: null,
      projectId: null,
    });
    expect(reportMocks.downloadReportExport).toHaveBeenCalledWith({
      blob: expect.any(Blob),
      filename: 'time-report-empty.csv',
    });
    expect(reportMocks.successToast).toHaveBeenCalledWith(
      'Exported time-report-empty.csv.',
    );
    expect(reportMocks.infoToast).not.toHaveBeenCalled();
  });

  it('blocks CSV export when the report date range is invalid', async () => {
    const wrapper = mountReportsView();
    await flushPromises();

    await wrapper.get('[data-testid="set-invalid-report-date"]').trigger('click');

    const exportButton = wrapper.get('[data-testid="export-reports-csv"]');
    expect((exportButton.element as HTMLButtonElement).disabled).toBe(true);

    await exportButton.trigger('click');
    await flushPromises();

    expect(reportMocks.exportCurrentReport).not.toHaveBeenCalled();
    expect(reportMocks.downloadReportExport).not.toHaveBeenCalled();
  });

  it('surfaces backend CSV export failures as error toasts', async () => {
    reportMocks.exportCurrentReport.mockRejectedValueOnce(
      new Error('CSV export failed'),
    );

    const wrapper = mountReportsView();
    await flushPromises();

    await wrapper.get('[data-testid="export-reports-csv"]').trigger('click');
    await flushPromises();

    expect(reportMocks.downloadReportExport).not.toHaveBeenCalled();
    expect(reportMocks.errorToast).toHaveBeenCalledWith('CSV export failed', {
      error: expect.any(Error),
      logContext: { action: 'export-reports', feature: 'reports' },
    });
  });

  it('keeps header setup controls as export scope instead of table state', async () => {
    const wrapper = mountReportsView();
    const state = reportMocks.state as ReturnType<typeof createReportState>;
    await flushPromises();

    await wrapper.get('[data-testid="change-report-project"]').trigger('click');
    await wrapper.get('[data-testid="change-report-member"]').trigger('click');
    await wrapper.get('[data-testid="change-report-group-by"]').trigger('click');

    expect(state.selectedProjectId.value).toBeNull();
    expect(state.selectedMemberId.value).toBeNull();
    expect(state.groupBy.value).toBe('project');
    expect(wrapper.get('[data-testid="reports-table"]').text()).toContain('1 rows');

    await wrapper.get('[data-testid="export-reports-csv"]').trigger('click');
    await flushPromises();

    expect(reportMocks.exportCurrentReport).toHaveBeenCalledWith(
      expect.objectContaining({
        groupBy: 'user',
        memberId: 'member-2',
        projectId: 'project-2',
      }),
    );
  });
});
