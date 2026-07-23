import { computed, defineComponent, ref, shallowRef } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PrimeVue from 'primevue/config';
import Menu from 'primevue/menu';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { giTiempoPrimeVueOptions } from '@gitiempo/web-config/theme';

import type {
  ReportDateRange,
  ReportGrouping,
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

vi.mock('@/composables/feedback/useToasts', () => ({
  useToasts: () => ({
    errorToast: reportMocks.errorToast,
    infoToast: reportMocks.infoToast,
    successToast: reportMocks.successToast,
  }),
}));

vi.mock('@/lib/report-download', () => ({
  downloadReportExport: reportMocks.downloadReportExport,
}));

vi.mock('@/composables/reports/useReportsData', () => ({
  useReportsData: () => reportMocks.state,
}));

import ReportsView from './ReportsView.vue';

const ReportsTableStub = defineComponent({
  name: 'ReportsTable',
  props: {
    dateRange: { default: null, type: Array },
    filters: { required: true, type: Object },
    grouping: { default: () => ['project'], type: Array },
    loading: { default: false, type: Boolean },
    memberOptions: { default: () => [], type: Array },
    projectOptions: { default: () => [], type: Array },
    rows: { default: () => [], type: Array },
  },
  emits: ['update:filters', 'update:dateRange', 'update:grouping'],
  setup(props, { emit }) {
    return {
      invalidDateRange: [
        new Date('2026-05-03T12:00:00.000Z'),
        new Date('2026-05-02T12:00:00.000Z'),
      ],
      setBillableFilter: () => {
        emit('update:filters', { ...props.filters, billable: 'withBillable' });
      },
      setSearchFilter: () => {
        emit('update:filters', { ...props.filters, global: 'orion' });
      },
      setTableFilters: () => {
        emit('update:filters', {
          ...props.filters,
          memberId: 'member-1',
          projectId: 'project-1',
        });
      },
    };
  },
  template:
    '<div data-testid="reports-table">{{ rows.length }} rows<button data-testid="change-report-grouping" @click="$emit(\'update:grouping\', [\'member\'])">group</button><button data-testid="set-invalid-report-date" @click="$emit(\'update:dateRange\', invalidDateRange)">invalid dates</button><button data-testid="set-table-filters" @click="setTableFilters">table filters</button><button data-testid="set-billable-filter" @click="setBillableFilter">billable filter</button><button data-testid="set-search-filter" @click="setSearchFilter">search filter</button><slot name="actions" /></div>',
});

const ManagementPageSkeletonStub = {
  name: 'ManagementPageSkeleton',
  props: ['variant'],
  template: '<div data-testid="reports-skeleton">{{ variant }}</div>',
};

const reportRow: ReportTableRow = {
  billable: null,
  billableSeconds: 3600,
  billableShare: 0.5,
  entryCount: 2,
  id: 'project-1',
  lastStartedAt: '2026-05-02T10:00:00.000Z',
  memberIds: ['member-1'],
  memberName: 'Alex Admin',
  nonBillableSeconds: 3600,
  projectIds: ['project-1'],
  projectName: 'Project Orion',
  taskId: null,
  taskName: null,
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
    grouping: ref<ReportGrouping>(['project']),
    initialLoaded: ref(!isInitialLoading),
    isEmpty: computed(() => reportRows.value.length === 0),
    isInitialLoading: ref(isInitialLoading),
    loadError: ref(loadError),
    loading: ref(loading),
    memberOptions: computed(() => [{ label: 'Alex Admin', value: 'member-1' }]),
    projectOptions: computed(() => [{ label: 'Project Orion', value: 'project-1' }]),
    projects: shallowRef([]),
    refresh: reportMocks.refresh,
    reportResponse: ref(null),
    rows: reportRows,
    summary: computed(() => ({
      ...summary,
      totalSeconds: rows.reduce((total, row) => total + row.totalSeconds, 0),
    })),
  };
}

async function triggerExport(
  wrapper: ReturnType<typeof mountReportsView>,
  format: 'csv' | 'pdf' = 'csv',
): Promise<void> {
  const items = wrapper.findComponent(Menu).props('model') as {
    command: () => void;
    label: string;
  }[];
  const item = items.find((candidate) =>
    candidate.label.toLowerCase().includes(format),
  );
  item!.command();
  await flushPromises();
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

    expect(wrapper.text()).toContain('Tracked Hours');
    expect(wrapper.text()).toContain('Across 1 member');
    expect(wrapper.text()).toContain('Within PM scope');
    expect(wrapper.text()).toContain('Weekly average');
    expect(wrapper.text()).toContain('2h 00m tracked this period');
    expect(wrapper.get('[data-testid="reports-table"]').text()).toContain('1 rows');
    expect(
      wrapper
        .get('[data-testid="reports-table"]')
        .find('[data-testid="export-reports"]')
        .exists(),
    ).toBe(true);

    await triggerExport(wrapper, 'csv');

    expect(reportMocks.exportCurrentReport).toHaveBeenCalledWith(
      {
        dateRange: null,
        groupBy: ['project'],
        memberId: null,
        projectId: null,
      },
      'csv',
    );
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

    await triggerExport(wrapper, 'csv');

    expect(reportMocks.exportCurrentReport).toHaveBeenCalledWith(
      {
        dateRange: null,
        groupBy: ['project'],
        memberId: null,
        projectId: null,
      },
      'csv',
    );
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

    const exportButton = wrapper.get('[data-testid="export-reports"]');
    expect((exportButton.element as HTMLButtonElement).disabled).toBe(true);

    await triggerExport(wrapper, 'csv');

    expect(reportMocks.exportCurrentReport).not.toHaveBeenCalled();
    expect(reportMocks.downloadReportExport).not.toHaveBeenCalled();
  });

  it('surfaces backend CSV export failures as error toasts', async () => {
    reportMocks.exportCurrentReport.mockRejectedValueOnce(
      new Error('CSV export failed'),
    );

    const wrapper = mountReportsView();
    await flushPromises();

    await triggerExport(wrapper, 'csv');

    expect(reportMocks.downloadReportExport).not.toHaveBeenCalled();
    expect(reportMocks.errorToast).toHaveBeenCalledWith('CSV export failed', {
      error: expect.any(Error),
      logContext: { action: 'export-reports', feature: 'reports' },
    });
  });

  it('feeds header grouping back into report state and export scope', async () => {
    const wrapper = mountReportsView();
    const state = reportMocks.state as ReturnType<typeof createReportState>;
    await flushPromises();

    await wrapper.get('[data-testid="change-report-grouping"]').trigger('click');

    // The header control now drives report state rather than export-only scope.
    expect(state.grouping.value).toEqual(['member']);

    await triggerExport(wrapper, 'csv');

    expect(reportMocks.exportCurrentReport).toHaveBeenCalledWith(
      expect.objectContaining({
        groupBy: ['user'],
        memberId: null,
        projectId: null,
      }),
      'csv',
    );
  });

  it('scopes the CSV export to the table project and member filters under member grouping', async () => {
    const wrapper = mountReportsView();
    await flushPromises();

    // Member grouping is the one where per-row sums are the member's own, so a
    // member-scoped export matches the screen.
    await wrapper.get('[data-testid="change-report-grouping"]').trigger('click');
    await wrapper.get('[data-testid="set-table-filters"]').trigger('click');
    await triggerExport(wrapper, 'csv');

    expect(reportMocks.exportCurrentReport).toHaveBeenCalledWith(
      expect.objectContaining({
        groupBy: ['user'],
        memberId: 'member-1',
        projectId: 'project-1',
      }),
      'csv',
    );
    expect(reportMocks.downloadReportExport).toHaveBeenCalled();
  });

  it('blocks CSV export for a member filter over folded project rows', async () => {
    const wrapper = mountReportsView();
    await flushPromises();

    // Under project grouping the table keeps whole folded rows with everyone's
    // time, while a userId-scoped export would return only that member's
    // entries — the file would silently show a fraction of the on-screen hours.
    await wrapper.get('[data-testid="set-table-filters"]').trigger('click');

    const exportButton = wrapper.get('[data-testid="export-reports"]');
    expect((exportButton.element as HTMLButtonElement).disabled).toBe(true);

    await triggerExport(wrapper, 'csv');

    expect(reportMocks.exportCurrentReport).not.toHaveBeenCalled();
    expect(reportMocks.downloadReportExport).not.toHaveBeenCalled();
  });

  it('blocks CSV export while the table search is active', async () => {
    const wrapper = mountReportsView();
    await flushPromises();

    // The table search matches formatted labels including durations, which the
    // detailed CSV cannot express, and the backend's search means something
    // else, so exporting would disagree with the table either way.
    await wrapper.get('[data-testid="set-search-filter"]').trigger('click');

    const exportButton = wrapper.get('[data-testid="export-reports"]');
    expect((exportButton.element as HTMLButtonElement).disabled).toBe(true);

    await triggerExport(wrapper, 'csv');

    expect(reportMocks.exportCurrentReport).not.toHaveBeenCalled();
  });

  it('blocks CSV export while an unexportable table filter is active', async () => {
    const wrapper = mountReportsView();
    await flushPromises();

    // Hours and billable filter aggregate totals the detailed CSV has no rows
    // for, so exporting would hand back a file that ignores them.
    await wrapper.get('[data-testid="set-billable-filter"]').trigger('click');

    const exportButton = wrapper.get('[data-testid="export-reports"]');
    expect((exportButton.element as HTMLButtonElement).disabled).toBe(true);

    await triggerExport(wrapper, 'csv');

    expect(reportMocks.exportCurrentReport).not.toHaveBeenCalled();
    expect(reportMocks.downloadReportExport).not.toHaveBeenCalled();
  });

  it('exports a PDF through the export menu', async () => {
    reportMocks.exportCurrentReport.mockResolvedValueOnce({
      blob: new Blob(['%PDF-'], { type: 'application/pdf' }),
      filename: 'time-report-2026-05.pdf',
    });

    const wrapper = mountReportsView();
    await flushPromises();

    await triggerExport(wrapper, 'pdf');

    expect(reportMocks.exportCurrentReport).toHaveBeenCalledWith(
      {
        dateRange: null,
        groupBy: ['project'],
        memberId: null,
        projectId: null,
      },
      'pdf',
    );
    expect(reportMocks.downloadReportExport).toHaveBeenCalledWith({
      blob: expect.any(Blob),
      filename: 'time-report-2026-05.pdf',
    });
    expect(reportMocks.successToast).toHaveBeenCalledWith(
      'Exported time-report-2026-05.pdf.',
    );
  });
});
