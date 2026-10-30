import type { ProjectListResponse } from '@gitiempo/shared';
import { useQuery } from '@tanstack/vue-query';
import {
  computed,
  shallowRef,
  watch,
  type ComputedRef,
  type Ref,
} from 'vue';

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

const REPORT_ROWS_STALE_TIME_MS = 30_000;
const REPORT_ROWS_GC_TIME_MS = 5 * 60_000;

function hasSameReportVisibilityScope(
  previousKey: readonly unknown[],
  nextScope: AdminServerStateScope,
  nextProjectIds: readonly string[],
): boolean {
  const visibilityKey = reportsKeys.visibility(nextScope, nextProjectIds);
  return JSON.stringify(previousKey.slice(0, visibilityKey.length)) === JSON.stringify(visibilityKey);
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
  /**
   * Every grouping path loops the same visible projects so they share one scope. The
   * backend only filters inactive projects for PMs, so a single unscoped request
   * would let admins see time the loop hides, and summary totals would shift
   * purely from changing the grouping path.
   */
  async function fetchReportRowsForScope(
    visibleProjects: ProjectListResponse,
    filters: ReportSetupFilters,
  ): Promise<ReportTableRow[]> {
    const targetProjects = getVisibleReportProjectsForScope(
      visibleProjects,
      filters.projectId,
      isAdminScope.value,
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
              // Always the finest granularity the API offers: every grouping
              // path the builder can configure is a fold of these leaves.
              groupBy: ['project', 'user', 'task'],
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

  const visibleProjectIds = computed(() =>
    getVisibleReportProjectsForScope(
      projects.value,
      appliedFilters.value.projectId,
      isAdminScope.value,
    ).map((project) => project.id),
  );
  const visibilityScopeKey = computed(() =>
    JSON.stringify(reportsKeys.visibility(scope.value, visibleProjectIds.value)),
  );
  const reportRowsKey = computed(() =>
      reportsKeys.time(
        scope.value,
        toTimeReportQuery(appliedFilters.value, 1, reportPageLimit),
        visibleProjectIds.value,
      ),
  );
  const lastStartedFetch = shallowRef<{ key: string } | null>(null);
  const reportRowsQuery = useQuery({
    queryKey: reportRowsKey,
    gcTime: REPORT_ROWS_GC_TIME_MS,
    staleTime: REPORT_ROWS_STALE_TIME_MS,
    enabled: computed(
      () =>
        enabled.value &&
        projectsQuery.isSuccess.value &&
        isReportDateRangeValid(appliedFilters.value.dateRange),
    ),
    queryFn: ({ queryKey }) => {
      lastStartedFetch.value = { key: JSON.stringify(queryKey) };
      return fetchReportRowsForScope(projects.value, appliedFilters.value);
    },
    placeholderData: (previousData, previousQuery) =>
      previousQuery && hasSameReportVisibilityScope(
        previousQuery.queryKey,
        scope.value,
        visibleProjectIds.value,
      )
        ? previousData
        : undefined,
  });
  const lastCommittedRows = shallowRef<ReportTableRow[] | undefined>(undefined);
  const lastCommittedVisibilityScopeKey = shallowRef<string | null>(null);

  watch(
    [
      () => reportRowsQuery.data.value,
      () => reportRowsQuery.isPlaceholderData.value,
      visibilityScopeKey,
    ],
    ([data, isPlaceholderData, nextVisibilityScopeKey]) => {
      if (data !== undefined && !isPlaceholderData) {
        lastCommittedRows.value = data;
        lastCommittedVisibilityScopeKey.value = nextVisibilityScopeKey;
      }
    },
    { immediate: true },
  );

  const hasCommittedRowsForVisibilityScope = computed(
    () =>
      lastCommittedRows.value !== undefined &&
      lastCommittedVisibilityScopeKey.value === visibilityScopeKey.value,
  );
  const isUsingCommittedRowsFallback = computed(
    () =>
      reportRowsQuery.data.value === undefined &&
      hasCommittedRowsForVisibilityScope.value &&
      (reportRowsQuery.isFetching.value || reportRowsQuery.error.value !== null),
  );
  // Grouping is presentation over the loaded leaf rows: the table folds these
  // into the configured tree, so changing the path never refetches.
  const rows = computed(
    () =>
      reportRowsQuery.data.value ??
      (hasCommittedRowsForVisibilityScope.value ? lastCommittedRows.value : []) ??
      [],
  );
  const hasRetainedRows = computed(
    () =>
      hasCommittedRowsForVisibilityScope.value ||
      reportRowsQuery.data.value !== undefined,
  );
  const isShowingPreviousRows = computed(
    () =>
      reportRowsQuery.isPlaceholderData.value ||
      isUsingCommittedRowsFallback.value,
  );
  const summary = computed(() => deriveReportSummaryView(rows.value));
  const loading = computed(
    () =>
      projectsQuery.isFetching.value ||
      reportRowsQuery.isFetching.value ||
      (isAdminScope.value && membersQuery.isFetching.value),
  );
  const initialLoaded = computed(
    () =>
      hasRetainedRows.value &&
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
    await reportRowsQuery.refetch({ cancelRefetch: false });
  }

  return {
    initialLoaded,
    hasRetainedRows,
    isShowingPreviousRows,
    key: reportRowsKey,
    lastStartedFetch,
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
