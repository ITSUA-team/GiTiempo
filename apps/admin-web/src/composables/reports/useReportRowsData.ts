import type { ProjectListResponse } from '@gitiempo/shared';
import { useQuery } from '@tanstack/vue-query';
import { computed, type ComputedRef, type Ref } from 'vue';

import {
  deriveReportSummaryView,
  isReportDateRangeValid,
  toReportTableRows,
  toTimeReportQuery,
  type ReportFilterOption,
  type ReportGrouping,
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
  grouping: Ref<ReportGrouping>;
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
  grouping,
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
   * The member grouping answers "how did each member spend time on projects", so
   * it keeps the per-project rows and only leads with the member instead.
   */
  function sortRowsByMember(rows: ReportTableRow[]): ReportTableRow[] {
    return [...rows].sort(
      (a, b) =>
        (a.memberName ?? '').localeCompare(b.memberName ?? '') ||
        (a.projectName ?? '').localeCompare(b.projectName ?? ''),
    );
  }

  /**
   * Fold member rows into one row per project. Done client-side because
   * `groupBy: 'project'` returns `user: null` and carries no member count, so
   * the count of contributors can only come from member-level rows.
   */
  function foldRowsByProject(rows: ReportTableRow[]): ReportTableRow[] {
    const byProject = new Map<string, ReportTableRow>();

    for (const row of rows) {
      const projectKey = row.projectIds[0] ?? row.projectName ?? row.id;
      const folded = byProject.get(projectKey);

      if (!folded) {
        byProject.set(projectKey, {
          ...row,
          groupBy: 'project',
          id: `project:${projectKey}`,
          memberIds: [...row.memberIds],
          memberName: null,
        });
        continue;
      }

      for (const memberId of row.memberIds) {
        if (!folded.memberIds.includes(memberId)) {
          folded.memberIds.push(memberId);
        }
      }

      folded.billableSeconds += row.billableSeconds;
      folded.entryCount += row.entryCount;
      folded.nonBillableSeconds += row.nonBillableSeconds;
      folded.totalSeconds += row.totalSeconds;
      folded.billableShare =
        folded.totalSeconds > 0
          ? folded.billableSeconds / folded.totalSeconds
          : null;
    }

    return [...byProject.values()].sort((a, b) =>
      (a.projectName ?? '').localeCompare(b.projectName ?? ''),
    );
  }

  /**
   * Both groupings loop the same visible projects so they share one scope. The
   * backend only filters inactive projects for PMs, so a single unscoped request
   * would let admins see time the loop hides, and summary totals would shift
   * purely from switching grouping.
   */
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
              // Always the finest granularity the API offers: `member` orders
              // these rows, `project` folds them and counts contributors.
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
  // Grouping is presentation over the loaded member rows, so switching it
  // regroups instantly instead of refetching the same data.
  const rows = computed(() => {
    const memberRows = reportRowsQuery.data.value ?? [];

    return grouping.value === 'member'
      ? sortRowsByMember(memberRows)
      : foldRowsByProject(memberRows);
  });
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
