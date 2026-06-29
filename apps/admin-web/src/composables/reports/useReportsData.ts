import {
  computed,
  ref,
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
  useWorkspaceMembersQuery,
} from '@/composables/query';

import {
  deriveReportSummaryView,
  deriveMemberOptions,
  deriveProjectOptions,
  deriveWorkspaceMemberOptions,
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
import {
  adminMembersClient,
  type AdminMembersClient,
} from '@/services/admin-members-client';
import { reportsKeys, type AdminServerStateScope } from '@/lib/query-keys';

interface UseReportsDataOptions {
  accessToken: Ref<string | null> | ComputedRef<string | null>;
  membersClient?: Pick<AdminMembersClient, 'listMembers'>;
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
): ProjectResponse[] {
  return projects.filter(
    (project) => project.isActive && project.totalSeconds > 0,
  );
}

function getReportErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Failed to load reports';

  if (/throttler|too many requests/i.test(message)) {
    return 'Too many report requests. Select a project and shorter date range, then try again.';
  }

  return message;
}

function cloneReportDateRange(dateRange: ReportDateRange): ReportDateRange {
  if (!dateRange) {
    return null;
  }

  const [start, end] = dateRange;

  return [
    start ? new Date(start) : null,
    end ? new Date(end) : null,
  ] as ReportDateRange;
}

export function useReportsData({
  accessToken,
  membersClient = adminMembersClient,
  projectsClient = adminProjectsClient,
  reportsClient = adminReportsClient,
  onError,
  scope,
}: UseReportsDataOptions) {
  const defaultDateRange = getDefaultReportDateRange();
  const selectedProjectId = ref<string | null>(null);
  const selectedMemberId = ref<string | null>(null);
  const dateRange = shallowRef<ReportDateRange>(
    cloneReportDateRange(defaultDateRange),
  );
  const groupBy = ref<ReportSetupFilters['groupBy']>('project');
  const tableReportFilters = shallowRef<ReportSetupFilters>({
    dateRange: cloneReportDateRange(defaultDateRange),
    groupBy: 'user',
    memberId: null,
    projectId: null,
  });
  const currentAction = ref('load-reports');
  const projectsQuery = useAdminProjectsQuery({
    accessToken,
    client: projectsClient,
    scope,
  });
  const isAdminScope = computed(() => scope.value.role === 'admin');
  const membersQuery = useWorkspaceMembersQuery({
    accessToken,
    client: membersClient,
    enabled: isAdminScope,
    scope,
  });
  const exportReportMutation = useExportTimeReportMutation({
    accessToken,
    client: reportsClient,
    scope,
  });
  const projects = computed(() => sortProjects(projectsQuery.data.value ?? []));
  const projectOptions = computed(() => deriveProjectOptions(projects.value));
  const projectMemberOptions = computed(() => deriveMemberOptions(projects.value));
  const workspaceMemberOptions = computed(() =>
    deriveWorkspaceMemberOptions(membersQuery.data.value ?? []),
  );
  const memberOptions = computed(() =>
    isAdminScope.value ? workspaceMemberOptions.value : projectMemberOptions.value,
  );
  const membersLoaded = computed(
    () => !isAdminScope.value || membersQuery.isSuccess.value,
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
    visibleProjects: ProjectListResponse,
  ): Promise<ReportTableRow[]> {
    const targetProjects = getVisibleProjectsForScope(visibleProjects);
    const nextRows: ReportTableRow[] = [];

    for (const project of targetProjects) {
      let page = 1;
      let totalPages = 1;

      while (page <= totalPages) {
        const response = await reportsClient.getTimeReport(
          toTimeReportQuery(
            {
              dateRange: tableReportFilters.value.dateRange,
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
        toTimeReportQuery(tableReportFilters.value, 1, pageLimit),
      ),
    ),
    enabled: computed(
      () =>
        Boolean(accessToken.value) &&
        projectsQuery.isSuccess.value &&
        isReportDateRangeValid(tableReportFilters.value.dateRange),
    ),
    queryFn: () => fetchReportRowsForScope(projects.value),
  });
  const rows = computed(() => reportRowsQuery.data.value ?? []);
  const summary = computed(() => deriveReportSummaryView(rows.value));
  const loading = computed(
    () =>
      projectsQuery.isFetching.value ||
      reportRowsQuery.isFetching.value ||
      (isAdminScope.value && membersQuery.isFetching.value),
  );
  const initialLoaded = computed(
    () =>
      projectsQuery.isSuccess.value &&
      reportRowsQuery.isSuccess.value &&
      membersLoaded.value,
  );
  const loadError = computed(() => {
    const error = projectsQuery.error.value ??
      (isAdminScope.value ? membersQuery.error.value : null) ??
      reportRowsQuery.error.value;

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

  async function refresh(): Promise<void> {
    if (!accessToken.value) {
      return;
    }

    currentAction.value = initialLoaded.value ? 'refresh-reports' : 'load-reports';
    await Promise.all([
      projectsQuery.refetch(),
      isAdminScope.value ? membersQuery.refetch() : Promise.resolve(),
    ]);
    syncSelectedFiltersWithOptions();
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

  watch([projectOptions, memberOptions], syncSelectedFiltersWithOptions);

  watch(
    [projectsQuery.error, membersQuery.error, reportRowsQuery.error],
    ([projectsError, membersError, rowsError]) => {
      const error = projectsError ??
        (isAdminScope.value ? membersError : null) ??
        rowsError;

      if (error) {
        onError?.(getReportErrorMessage(error), error, currentAction.value);
      }
    },
  );
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
