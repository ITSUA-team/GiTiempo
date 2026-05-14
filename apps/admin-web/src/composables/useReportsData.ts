import {
  computed,
  onMounted,
  onUnmounted,
  shallowRef,
  watch,
  type ComputedRef,
  type Ref,
} from 'vue';
import type { ProjectListResponse, ProjectResponse } from '@gitiempo/shared';

import {
  deriveReportSummaryView,
  deriveMemberOptions,
  deriveProjectOptions,
  getDefaultReportDateRange,
  isReportDateRangeValid,
  toReportTableRows,
  toTimeReportQuery,
  toTimeReportExportQuery,
  type ReportDateRange,
  type ReportSetupFilters,
  type ReportTableRow,
} from '@/lib/report-view-model';
import {
  adminProjectsClient,
  type AdminProjectsClient,
} from '@/services/admin-projects-client';
import {
  adminReportsClient,
  type AdminReportsClient,
  type ReportsCsvExport,
} from '@/services/admin-reports-client';

interface UseReportsDataOptions {
  accessToken: Ref<string | null> | ComputedRef<string | null>;
  projectsClient?: Pick<AdminProjectsClient, 'listProjects'>;
  reportsClient?: AdminReportsClient;
  /* eslint-disable no-unused-vars */
  onError?: (message: string, error: unknown, action: string) => void;
  /* eslint-enable no-unused-vars */
}

const pageLimit = 100;

function sortProjects(projects: ProjectListResponse): ProjectListResponse {
  return [...projects].sort((a, b) => a.name.localeCompare(b.name));
}

function getVisibleProjectsForScope(
  projects: ProjectListResponse,
  projectId: string | null,
): ProjectResponse[] {
  if (!projectId) {
    return projects.filter(
      (project) => project.isActive && project.totalHours > 0,
    );
  }

  return projects.filter((project) => project.id === projectId);
}

function getReportErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Failed to load reports';

  if (/throttler|too many requests/i.test(message)) {
    return 'Too many report requests. Select a project and shorter date range, then try again.';
  }

  return message;
}

export function useReportsData({
  accessToken,
  projectsClient = adminProjectsClient,
  reportsClient = adminReportsClient,
  onError,
}: UseReportsDataOptions) {
  const projects = shallowRef<ProjectListResponse>([]);
  const reportRows = shallowRef<ReportTableRow[]>([]);
  const selectedProjectId = shallowRef<string | null>(null);
  const selectedMemberId = shallowRef<string | null>(null);
  const dateRange = shallowRef<ReportDateRange>(getDefaultReportDateRange());
  const groupBy = shallowRef<ReportSetupFilters['groupBy']>('project');
  const loading = shallowRef(true);
  const initialLoaded = shallowRef(false);
  const loadError = shallowRef<string | null>(null);

  let requestId = 0;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const projectOptions = computed(() => deriveProjectOptions(projects.value));
  const memberOptions = computed(() => deriveMemberOptions(projects.value));
  const rows = computed(() => reportRows.value);
  const summary = computed(() => deriveReportSummaryView(rows.value));
  const isInitialLoading = computed(() => loading.value && !initialLoaded.value);
  const isEmpty = computed(
    () =>
      initialLoaded.value &&
      !loading.value &&
      loadError.value === null &&
      rows.value.length === 0,
  );

  function getCurrentSetupFilters(): ReportSetupFilters {
    return {
      dateRange: dateRange.value,
      groupBy: groupBy.value,
      memberId: selectedMemberId.value,
      projectId: selectedProjectId.value,
    };
  }

  function syncSelectedFiltersWithOptions(): void {
    if (
      selectedProjectId.value &&
      !projectOptions.value.some(
        (option) => option.value === selectedProjectId.value,
      )
    ) {
      selectedProjectId.value = null;
    }

    if (
      selectedMemberId.value &&
      !memberOptions.value.some((option) => option.value === selectedMemberId.value)
    ) {
      selectedMemberId.value = null;
    }
  }

  async function fetchReportRowsForScope(
    token: string,
    visibleProjects: ProjectListResponse,
    projectId: string | null,
    reportDateRange: ReportDateRange,
  ): Promise<ReportTableRow[]> {
    const targetProjects = getVisibleProjectsForScope(visibleProjects, projectId);
    const nextRows: ReportTableRow[] = [];

    for (const project of targetProjects) {
      let page = 1;
      let totalPages = 1;

      do {
        const response = await reportsClient.getTimeReport(
          token,
          toTimeReportQuery(
            {
              dateRange: reportDateRange,
              groupBy: 'user',
              memberId: null,
              projectId: project.id,
            },
            page,
            pageLimit,
          ),
        );

        nextRows.push(...toReportTableRows(response, {
          memberOptions: memberOptions.value,
          projectOptions: projectOptions.value,
          selectedMemberId: null,
          selectedProjectId: project.id,
        }));
        totalPages = Math.max(1, response.meta.totalPages);
        page += 1;
      } while (page <= totalPages);
    }

    return nextRows;
  }

  async function loadReports({
    action,
    reloadProjects,
    setInitialLoaded,
  }: {
    action: string;
    reloadProjects: boolean;
    setInitialLoaded: boolean;
  }): Promise<void> {
    const token = accessToken.value;

    if (!token) {
      loading.value = false;
      return;
    }

    const currentRequestId = requestId + 1;
    requestId = currentRequestId;

    if (!isReportDateRangeValid(dateRange.value)) {
      loading.value = false;
      loadError.value = null;
      return;
    }

    loading.value = true;
    loadError.value = null;

    try {
      if (reloadProjects) {
        projects.value = sortProjects(await projectsClient.listProjects(token));

        if (currentRequestId !== requestId) {
          return;
        }

        syncSelectedFiltersWithOptions();
      }

      const nextRows = await fetchReportRowsForScope(
        token,
        projects.value,
        selectedProjectId.value,
        dateRange.value,
      );

      if (currentRequestId !== requestId) {
        return;
      }

      reportRows.value = nextRows;
      if (setInitialLoaded) {
        initialLoaded.value = true;
      }
    } catch (error) {
      if (currentRequestId !== requestId) {
        return;
      }

      const message = getReportErrorMessage(error);
      loadError.value = message;
      onError?.(message, error, action);
    } finally {
      if (currentRequestId === requestId) {
        loading.value = false;
      }
    }
  }

  function clearDebounceTimer(): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  }

  function scheduleReportRefresh(): void {
    if (!initialLoaded.value) {
      return;
    }

    clearDebounceTimer();
    debounceTimer = setTimeout(() => {
      void loadReports({
        action: 'refresh-reports',
        reloadProjects: false,
        setInitialLoaded: false,
      });
    }, 300);
  }

  async function refresh(): Promise<void> {
    clearDebounceTimer();
    await loadReports({
      action: initialLoaded.value ? 'refresh-reports' : 'load-reports',
      reloadProjects: true,
      setInitialLoaded: !initialLoaded.value,
    });
  }

  async function exportCurrentReport(
    filters: ReportSetupFilters = getCurrentSetupFilters(),
  ): Promise<ReportsCsvExport | null> {
    const token = accessToken.value;

    if (!token) {
      return null;
    }

    return reportsClient.exportTimeReport(token, toTimeReportExportQuery(filters));
  }

  watch(
    [
      selectedProjectId,
      () => dateRange.value?.[0]?.getTime() ?? null,
      () => dateRange.value?.[1]?.getTime() ?? null,
    ],
    scheduleReportRefresh,
  );

  watch([projectOptions, memberOptions], syncSelectedFiltersWithOptions);

  onMounted(refresh);
  onUnmounted(clearDebounceTimer);

  return {
    dateRange,
    exportCurrentReport,
    groupBy,
    initialLoaded,
    isEmpty,
    isInitialLoading,
    loadError,
    loading,
    memberOptions,
    projectOptions,
    projects,
    refresh,
    rows,
    selectedMemberId,
    selectedProjectId,
    summary,
  };
}
