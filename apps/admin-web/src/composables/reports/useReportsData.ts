import {
  computed,
  nextTick,
  onUnmounted,
  shallowRef,
  watch,
  type ComputedRef,
  type Ref,
} from 'vue';
import { useQuery } from '@tanstack/vue-query';
import type { ProjectListResponse, ProjectResponse } from '@gitiempo/shared';
import {
  useAdminProjectsQuery,
  useExportTimeReportMutation,
} from '@/composables/query';

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
import { reportsKeys, type AdminServerStateScope } from '@/lib/query-keys';

interface UseReportsDataOptions {
  accessToken: Ref<string | null> | ComputedRef<string | null>;
  projectsClient?: Pick<AdminProjectsClient, 'listProjects'>;
  reportsClient?: AdminReportsClient;
  /* eslint-disable no-unused-vars */
  onError?: (message: string, error: unknown, action: string) => void;
  /* eslint-enable no-unused-vars */
  scope: Ref<AdminServerStateScope> | ComputedRef<AdminServerStateScope>;
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
  scope,
}: UseReportsDataOptions) {
  const selectedProjectId = shallowRef<string | null>(null);
  const selectedMemberId = shallowRef<string | null>(null);
  const dateRange = shallowRef<ReportDateRange>(getDefaultReportDateRange());
  const groupBy = shallowRef<ReportSetupFilters['groupBy']>('project');
  const appliedFilters = shallowRef<ReportSetupFilters>({
    dateRange: dateRange.value,
    groupBy: groupBy.value,
    memberId: selectedMemberId.value,
    projectId: selectedProjectId.value,
  });
  const currentAction = shallowRef('load-reports');
  const projectsQuery = useAdminProjectsQuery({
    accessToken,
    client: projectsClient,
    scope,
  });
  const exportReportMutation = useExportTimeReportMutation({
    accessToken,
    client: reportsClient,
    scope,
  });

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const projects = computed(() => sortProjects(projectsQuery.data.value ?? []));
  const projectOptions = computed(() => deriveProjectOptions(projects.value));
  const memberOptions = computed(() => deriveMemberOptions(projects.value));

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
    visibleProjects: ProjectListResponse,
    filters: ReportSetupFilters,
  ): Promise<ReportTableRow[]> {
    const targetProjects = getVisibleProjectsForScope(
      visibleProjects,
      filters.projectId,
    );
    const nextRows: ReportTableRow[] = [];

    for (const project of targetProjects) {
      let page = 1;
      let totalPages = 1;

      while (page <= totalPages) {
        const response = await reportsClient.getTimeReport(
          toTimeReportQuery(
            {
              dateRange: filters.dateRange,
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
      }
    }

    return nextRows;
  }

  const reportRowsQuery = useQuery({
    queryKey: computed(() =>
      reportsKeys.time(
        scope.value,
        toTimeReportQuery(appliedFilters.value, 1, pageLimit),
      ),
    ),
    enabled: computed(
      () =>
        Boolean(accessToken.value) &&
        projectsQuery.isSuccess.value &&
        isReportDateRangeValid(appliedFilters.value.dateRange),
    ),
    queryFn: () => fetchReportRowsForScope(projects.value, appliedFilters.value),
  });
  const rows = computed(() => reportRowsQuery.data.value ?? []);
  const summary = computed(() => deriveReportSummaryView(rows.value));
  const loading = computed(
    () => projectsQuery.isFetching.value || reportRowsQuery.isFetching.value,
  );
  const initialLoaded = computed(
    () => projectsQuery.isSuccess.value && reportRowsQuery.isSuccess.value,
  );
  const loadError = computed(() => {
    const error = projectsQuery.error.value ?? reportRowsQuery.error.value;

    return error ? getReportErrorMessage(error) : null;
  });
  const isInitialLoading = computed(() => loading.value && !initialLoaded.value);
  const isEmpty = computed(
    () =>
      initialLoaded.value &&
      !loading.value &&
      loadError.value === null &&
      rows.value.length === 0,
  );

  function clearDebounceTimer(): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  }

  function applyCurrentFilters(): void {
    if (!isReportDateRangeValid(dateRange.value)) {
      return;
    }

    appliedFilters.value = getCurrentSetupFilters();
  }

  function scheduleReportRefresh(): void {
    if (!initialLoaded.value) {
      return;
    }

    currentAction.value = 'refresh-reports';
    clearDebounceTimer();
    debounceTimer = setTimeout(applyCurrentFilters, 300);
  }

  async function refresh(): Promise<void> {
    if (!accessToken.value) {
      return;
    }

    currentAction.value = initialLoaded.value ? 'refresh-reports' : 'load-reports';
    clearDebounceTimer();
    await projectsQuery.refetch();
    syncSelectedFiltersWithOptions();
    applyCurrentFilters();
    await nextTick();
    await reportRowsQuery.refetch();
  }

  async function exportCurrentReport(
    filters: ReportSetupFilters = getCurrentSetupFilters(),
  ): Promise<ReportsCsvExport | null> {
    const token = accessToken.value;

    if (!token) {
      return null;
    }

    return exportReportMutation.mutateAsync(toTimeReportExportQuery(filters));
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

  watch([projectsQuery.error, reportRowsQuery.error], ([projectsError, rowsError]) => {
    const error = projectsError ?? rowsError;

    if (error) {
      onError?.(getReportErrorMessage(error), error, currentAction.value);
    }
  });

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
