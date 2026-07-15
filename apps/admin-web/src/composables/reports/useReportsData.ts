import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';
import {
  useAdminProjectsQuery,
  useWorkspaceMembersQuery,
} from '@/composables/query';

import {
  adminProjectsClient,
  type AdminProjectsClient,
} from '@/services/admin-projects-client';
import {
  adminReportsClient,
  type AdminReportsClient,
} from '@/services/admin-reports-client';
import {
  adminMembersClient,
  type AdminMembersClient,
} from '@/services/admin-members-client';
import type { AdminServerStateScope } from '@/lib/query-keys';
import type { ReportSetupFilters } from '@/lib/report-view-model';

import { useReportExport } from './useReportExport';
import { useReportFilters } from './useReportFilters';
import { useReportLoadErrorNotifications } from './useReportLoadErrorNotifications';
import { useReportOptions } from './useReportOptions';
import { useReportRefreshDebounce } from './useReportRefreshDebounce';
import { useReportRowsData } from './useReportRowsData';

interface UseReportsDataOptions {
  enabled: Ref<boolean> | ComputedRef<boolean>;
  membersClient?: Pick<AdminMembersClient, 'listMembers'>;
  projectsClient?: Pick<AdminProjectsClient, 'listProjects'>;
  reportsClient?: AdminReportsClient;
  onError?: (message: string, error: unknown, action: string) => void;
  scope: Ref<AdminServerStateScope> | ComputedRef<AdminServerStateScope>;
}

export function useReportsData({
  enabled,
  membersClient = adminMembersClient,
  projectsClient = adminProjectsClient,
  reportsClient = adminReportsClient,
  onError,
  scope,
}: UseReportsDataOptions) {
  const currentAction = ref('load-reports');
  const filters = useReportFilters();
  const projectsQuery = useAdminProjectsQuery({
    client: projectsClient,
    enabled,
    scope,
  });
  const isAdminScope = computed(() => scope.value.role === 'admin');
  const membersQuery = useWorkspaceMembersQuery({
    client: membersClient,
    enabled: computed(() => enabled.value && isAdminScope.value),
    scope,
  });
  const reportOptions = useReportOptions({
    isAdminScope,
    members: computed(() => membersQuery.data.value ?? []),
    projects: computed(() => projectsQuery.data.value ?? []),
    selectedMemberId: filters.selectedMemberId,
    selectedProjectId: filters.selectedProjectId,
  });
  const membersLoaded = computed(
    () => !isAdminScope.value || membersQuery.isSuccess.value,
  );
  const rowsData = useReportRowsData({
    appliedFilters: filters.appliedFilters,
    enabled,
    grouping: filters.grouping,
    isAdminScope,
    memberOptions: reportOptions.memberOptions,
    membersLoaded,
    membersQuery,
    projectOptions: reportOptions.projectOptions,
    projects: reportOptions.projects,
    projectsQuery,
    reportsClient,
    scope,
  });
  const reportExport = useReportExport({
    enabled,
    reportsClient,
    scope,
  });

  // selectedProjectId is inert scope state: the reports UI no longer exposes a
  // project setup control. Grouping is absent by design — it regroups loaded
  // rows and needs no refetch.
  useReportRefreshDebounce({
    applyCurrentFilters: filters.applyCurrentFilters,
    dateRange: filters.dateRange,
    initialLoaded: rowsData.initialLoaded,
    onRefreshScheduled() {
      currentAction.value = 'refresh-reports';
    },
    selectedProjectId: filters.selectedProjectId,
  });

  useReportLoadErrorNotifications({
    currentAction,
    isAdminScope,
    membersError: membersQuery.error,
    onError,
    projectsError: projectsQuery.error,
    rowsError: rowsData.rowsError,
  });

  async function refresh(): Promise<void> {
    if (!enabled.value) {
      return;
    }

    currentAction.value = rowsData.initialLoaded.value ? 'refresh-reports' : 'load-reports';
    await Promise.all([
      projectsQuery.refetch(),
      isAdminScope.value ? membersQuery.refetch() : Promise.resolve(),
    ]);
    reportOptions.syncSelectedFiltersWithOptions();
    await rowsData.refetchRows();
  }

  async function exportCurrentReport(
    exportFilters: ReportSetupFilters = filters.getCurrentSetupFilters(),
  ) {
    return reportExport.exportCurrentReport(exportFilters);
  }

  watch(
    [reportOptions.projectOptions, reportOptions.memberOptions],
    reportOptions.syncSelectedFiltersWithOptions,
  );

  return {
    dateRange: filters.dateRange,
    exportCurrentReport,
    grouping: filters.grouping,
    initialLoaded: rowsData.initialLoaded,
    isEmpty: rowsData.isEmpty,
    isInitialLoading: rowsData.isInitialLoading,
    loadError: rowsData.loadError,
    loading: rowsData.loading,
    memberOptions: reportOptions.memberOptions,
    projectOptions: reportOptions.projectOptions,
    projects: reportOptions.projects,
    refresh,
    rows: rowsData.rows,
    selectedMemberId: filters.selectedMemberId,
    selectedProjectId: filters.selectedProjectId,
    summary: rowsData.summary,
  };
}
