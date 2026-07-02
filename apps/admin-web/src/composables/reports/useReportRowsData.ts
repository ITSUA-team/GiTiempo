import type { ProjectListResponse } from '@gitiempo/shared';
import { useQuery } from '@tanstack/vue-query';
import { computed, type ComputedRef, type Ref } from 'vue';

import {
  deriveReportSummaryView,
  isReportDateRangeValid,
  toReportTableRows,
  toTimeReportQuery,
  type ReportFilterOption,
  type ReportSetupFilters,
  type ReportTableRow,
} from '@/lib/report-view-model';
import { reportsKeys, type AdminServerStateScope } from '@/lib/query-keys';
import type { AdminReportsClient } from '@/services/admin-reports-client';

import {
  getReportErrorMessage,
  getVisibleReportProjectsForScope,
  reportPageLimit,
} from './report-data-helpers';

interface QueryStateRefs {
  error: Ref<unknown> | ComputedRef<unknown>;
  isFetching: Ref<boolean> | ComputedRef<boolean>;
  isSuccess: Ref<boolean> | ComputedRef<boolean>;
}

interface UseReportRowsDataOptions {
  appliedFilters: Ref<ReportSetupFilters> | ComputedRef<ReportSetupFilters>;
  enabled: Ref<boolean> | ComputedRef<boolean>;
  isAdminScope: ComputedRef<boolean>;
  memberOptions: ComputedRef<ReportFilterOption[]>;
  membersLoaded: ComputedRef<boolean>;
  membersQuery: QueryStateRefs;
  projectOptions: ComputedRef<ReportFilterOption[]>;
  projects: ComputedRef<ProjectListResponse>;
  projectsQuery: QueryStateRefs;
  reportsClient: AdminReportsClient;
  scope: Ref<AdminServerStateScope> | ComputedRef<AdminServerStateScope>;
}

export function useReportRowsData({
  appliedFilters,
  enabled,
  isAdminScope,
  memberOptions,
  membersLoaded,
  membersQuery,
  projectOptions,
  projects,
  projectsQuery,
  reportsClient,
  scope,
}: UseReportRowsDataOptions) {
  async function fetchReportRowsForScope(
    visibleProjects: ProjectListResponse,
    filters: ReportSetupFilters,
  ): Promise<ReportTableRow[]> {
    const targetProjects = getVisibleReportProjectsForScope(
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
            reportPageLimit,
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
        toTimeReportQuery(appliedFilters.value, 1, reportPageLimit),
      ),
    ),
    enabled: computed(
      () =>
        enabled.value &&
        projectsQuery.isSuccess.value &&
        isReportDateRangeValid(appliedFilters.value.dateRange),
    ),
    queryFn: () => fetchReportRowsForScope(projects.value, appliedFilters.value),
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

  async function refetchRows(): Promise<void> {
    await reportRowsQuery.refetch();
  }

  return {
    initialLoaded,
    isEmpty,
    isInitialLoading,
    loadError,
    loading,
    refetchRows,
    rows,
    rowsError: reportRowsQuery.error,
    summary,
  };
}
