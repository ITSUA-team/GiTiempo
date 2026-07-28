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
  exportReportPdf: vi.fn(),
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
        emit('update:filters', { ...props.filters, billable: 'gte8' });
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
    '<div data-testid="reports-table">{{ rows.length }} rows<button data-testid="change-report-grouping" @click="$emit(\'update:grouping\', [\'member\'])">group</button><button data-testid="set-invalid-report-date" @click="$emit(\'update:dateRange\', invalidDateRange)">invalid dates</button><button data-testid="set-table-filters" @click="setTableFilters">table filters</button><button data-testid="set-billable-filter" @click="setBillableFilter">billable filter</button><slot name="actions" /></div>',
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
    exportReportPdf: reportMocks.exportReportPdf,
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
    rows: reportRows,
    summary: computed(() => ({
      ...summary,
      totalSeconds: rows.reduce((total, row) => total + row.totalSeconds, 0),
    })),
  };
}

function lastDownloadedBlob(): Blob {
  const call = reportMocks.downloadReportExport.mock.calls.at(-1);
  return (call?.[0] as unknown as { blob: Blob }).blob;
}

async function triggerExport(
  wrapper: ReturnType<typeof mountReportsView>,
  format: 'csv' | 'pdf' = 'csv',
): Promise<void> {
  // The page renders more than one Menu (export, saved-report overflow), so
  // pick by content rather than position.
  const item = wrapper
    .findAllComponents(Menu)
    .flatMap(
      (menu) =>
        menu.props('model') as { command: () => void; label: string }[],
    )
    .find((candidate) => candidate.label.toLowerCase().includes(format));
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
    reportMocks.exportReportPdf.mockReset();
    reportMocks.exportReportPdf.mockResolvedValue(
      new Blob(['%PDF-'], { type: 'application/pdf' }),
    );
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
    expect(wrapper.text()).not.toContain('Export as CSV');
  });

  it('renders request errors separately with a retry action', async () => {
    reportMocks.state = createReportState({ loadError: 'No scope' });

    const wrapper = mountReportsView();

    expect(wrapper.text()).toContain('Failed to load reports');
    expect(wrapper.text()).toContain('No scope');

    await wrapper.get('button').trigger('click');

    expect(reportMocks.refresh).toHaveBeenCalledTimes(1);
  });

  it('exports a CSV built from the on-screen tree without hitting the backend', async () => {
    const wrapper = mountReportsView();
    await flushPromises();

    expect(wrapper.text()).toContain('Tracked Hours');
    expect(wrapper.text()).toContain('Across 1 member');
    expect(wrapper.text()).toContain('2h 00m tracked this period');
    expect(wrapper.get('[data-testid="reports-table"]').text()).toContain('1 rows');

    await triggerExport(wrapper, 'csv');

    // CSV never reaches the backend — it is serialised from the on-screen tree.
    expect(reportMocks.exportReportPdf).not.toHaveBeenCalled();
    expect(reportMocks.downloadReportExport).toHaveBeenCalledWith({
      blob: expect.any(Blob),
      filename: 'time-report.csv',
    });
    expect(lastDownloadedBlob().type).toBe('text/csv;charset=utf-8');
    expect(reportMocks.successToast).toHaveBeenCalledWith(
      'Exported time-report.csv.',
    );
  });

  it('exports a CSV even when the loaded report has no rows', async () => {
    reportMocks.state = createReportState({ rows: [] });

    const wrapper = mountReportsView();
    await flushPromises();

    await triggerExport(wrapper, 'csv');

    expect(reportMocks.downloadReportExport).toHaveBeenCalledWith({
      blob: expect.any(Blob),
      filename: 'time-report.csv',
    });
    expect(lastDownloadedBlob().type).toBe('text/csv;charset=utf-8');
    expect(reportMocks.successToast).toHaveBeenCalledWith(
      'Exported time-report.csv.',
    );
    expect(reportMocks.infoToast).not.toHaveBeenCalled();
  });

  it('renders a PDF from the on-screen document through the export menu', async () => {
    const wrapper = mountReportsView();
    await flushPromises();

    await triggerExport(wrapper, 'pdf');

    // The server only styles the document the view builds from the screen.
    expect(reportMocks.exportReportPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        columns: ['NAME', 'HOURS', 'BILLABLE', 'BILL %'],
        masthead: { tag: 'TIME REPORT', wordmark: 'GiTiempo' },
        title: 'Time report',
      }),
    );
    expect(reportMocks.downloadReportExport).toHaveBeenCalledWith({
      blob: expect.any(Blob),
      filename: 'time-report.pdf',
    });
    expect(lastDownloadedBlob().type).toBe('application/pdf');
    expect(reportMocks.successToast).toHaveBeenCalledWith(
      'Exported time-report.pdf.',
    );
  });

  it('blocks export while the report date range is invalid', async () => {
    const wrapper = mountReportsView();
    await flushPromises();

    await wrapper.get('[data-testid="set-invalid-report-date"]').trigger('click');

    const exportButton = wrapper.get('[data-testid="export-reports"]');
    expect((exportButton.element as HTMLButtonElement).disabled).toBe(true);

    await triggerExport(wrapper, 'csv');

    expect(reportMocks.downloadReportExport).not.toHaveBeenCalled();
    expect(reportMocks.exportReportPdf).not.toHaveBeenCalled();
  });

  it('surfaces PDF export failures as error toasts', async () => {
    reportMocks.exportReportPdf.mockRejectedValueOnce(
      new Error('PDF export failed'),
    );

    const wrapper = mountReportsView();
    await flushPromises();

    await triggerExport(wrapper, 'pdf');

    expect(reportMocks.downloadReportExport).not.toHaveBeenCalled();
    expect(reportMocks.errorToast).toHaveBeenCalledWith('PDF export failed', {
      error: expect.any(Error),
      logContext: { action: 'export-reports', feature: 'reports' },
    });
  });

  it('feeds header grouping back into report state and reflects it in the export', async () => {
    const wrapper = mountReportsView();
    const state = reportMocks.state as ReturnType<typeof createReportState>;
    await flushPromises();

    await wrapper.get('[data-testid="change-report-grouping"]').trigger('click');

    // The header control drives report state, which the export mirrors.
    expect(state.grouping.value).toEqual(['member']);

    await triggerExport(wrapper, 'pdf');

    expect(reportMocks.exportReportPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.stringContaining('Grouping: Member'),
      }),
    );
  });

  it('applies an aggregate table filter to the export instead of blocking it', async () => {
    const wrapper = mountReportsView();
    await flushPromises();

    // The billable-hours filter used to block export; now it flows into the
    // file so the export matches the filtered screen.
    await wrapper.get('[data-testid="set-billable-filter"]').trigger('click');

    const exportButton = wrapper.get('[data-testid="export-reports"]');
    expect((exportButton.element as HTMLButtonElement).disabled).toBe(false);

    await triggerExport(wrapper, 'csv');

    expect(reportMocks.downloadReportExport).toHaveBeenCalledWith({
      blob: expect.any(Blob),
      filename: 'time-report.csv',
    });
  });
});
