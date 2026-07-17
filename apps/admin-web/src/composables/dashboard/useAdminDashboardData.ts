import { useQuery } from '@tanstack/vue-query';
import { computed, ref, shallowRef, watch, type ComputedRef, type Ref } from 'vue';
import type { TimeReportQuery, WorkspaceRole } from '@gitiempo/shared';
import { getLocalIsoWeekRange } from '@gitiempo/web-shared/time';

import {
  ADMIN_DASHBOARD_ACTIVITY_FULL_LIMIT,
  ADMIN_DASHBOARD_LOAD_ERROR_MESSAGE,
  ADMIN_DASHBOARD_MISSING_ROLE_MESSAGE,
  ADMIN_DASHBOARD_MISSING_TOKEN_MESSAGE,
  ADMIN_DASHBOARD_REPORT_PAGE_LIMIT,
} from '@/constants/admin-dashboard';
import {
  deriveDashboardActivityRows,
  deriveDashboardStats,
  type AdminDashboardActivityRow,
  type AdminDashboardStatCard,
} from '@/lib/admin-dashboard-view-model';
import {
  adminMembersClient,
  type AdminMembersClient,
} from '@/services/admin-members-client';
import {
  adminProjectsClient,
  type AdminProjectsClient,
} from '@/services/admin-projects-client';
import {
  adminReportsClient,
  type AdminReportsClient,
} from '@/services/admin-reports-client';
import { adminDashboardKeys, type AdminServerStateScope } from '@/lib/query-keys';

interface UseAdminDashboardDataOptions {
  enabled: Ref<boolean> | ComputedRef<boolean>;
  membersClient?: Pick<AdminMembersClient, 'listInvites' | 'listMembers'>;
  now?: () => Date;
  onError?: (message: string, error: unknown, action: string) => void;
  projectsClient?: Pick<AdminProjectsClient, 'getManagementSummary' | 'listProjects'>;
  reportsClient?: Pick<AdminReportsClient, 'getTimeReport'>;
  role?: Ref<WorkspaceRole | null> | ComputedRef<WorkspaceRole | null>;
  scope: Ref<AdminServerStateScope> | ComputedRef<AdminServerStateScope>;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : ADMIN_DASHBOARD_LOAD_ERROR_MESSAGE;
}

export function useAdminDashboardData({
  enabled,
  membersClient = adminMembersClient,
  now = () => new Date(),
  onError,
  projectsClient = adminProjectsClient,
  reportsClient = adminReportsClient,
  role = ref<WorkspaceRole | null>('admin'),
  scope,
}: UseAdminDashboardDataOptions) {
  const requestedAt = shallowRef(now());
  const currentAction = ref('load-dashboard');
  const weekRange = computed(() => getLocalIsoWeekRange(requestedAt.value));
  const blockedError = computed(() => {
    if (!enabled.value) {
      return ADMIN_DASHBOARD_MISSING_TOKEN_MESSAGE;
    }

    if (!role.value) {
      return ADMIN_DASHBOARD_MISSING_ROLE_MESSAGE;
    }

    return null;
  });
  const dashboardQuery = useQuery({
    queryKey: computed(() => adminDashboardKeys.overview(scope.value, weekRange.value)),
    enabled: computed(() => blockedError.value === null),
    queryFn: async () => {
      const dashboardRole = role.value;

      if (!dashboardRole) {
        throw new Error(ADMIN_DASHBOARD_MISSING_ROLE_MESSAGE);
      }

      const reportQuery: Partial<TimeReportQuery> = {
        ...weekRange.value,
        groupBy: ['project'],
        limit: ADMIN_DASHBOARD_REPORT_PAGE_LIMIT,
        page: 1,
        sortBy: 'lastStartedAt',
        sortOrder: 'desc',
      };
      const [projectSummary, projects, report] = await Promise.all([
        projectsClient.getManagementSummary(),
        projectsClient.listProjects(),
        reportsClient.getTimeReport(reportQuery),
      ]);

      if (dashboardRole !== 'admin') {
        return {
          dashboardRole,
          requestedAt: requestedAt.value,
          source: { projectSummary, projects, report },
        };
      }

      const [invites, members] = await Promise.all([
        membersClient.listInvites(),
        membersClient.listMembers(),
      ]);

      return {
        dashboardRole,
        requestedAt: requestedAt.value,
        source: { invites, members, projectSummary, projects, report },
      };
    },
  });
  const stats = computed<AdminDashboardStatCard[]>(() =>
    dashboardQuery.data.value
      ? deriveDashboardStats(
          dashboardQuery.data.value.source,
          dashboardQuery.data.value.requestedAt,
          dashboardQuery.data.value.dashboardRole,
        )
      : [],
  );
  const allActivityRows = computed<AdminDashboardActivityRow[]>(() =>
    dashboardQuery.data.value
      ? deriveDashboardActivityRows(
          dashboardQuery.data.value.source,
          dashboardQuery.data.value.requestedAt,
          ADMIN_DASHBOARD_ACTIVITY_FULL_LIMIT,
        )
      : [],
  );
  const loading = computed(() => dashboardQuery.isFetching.value);
  const initialLoaded = computed(() => dashboardQuery.isSuccess.value || blockedError.value !== null);
  const loadError = computed(() =>
    blockedError.value ??
    (dashboardQuery.error.value ? getErrorMessage(dashboardQuery.error.value) : null),
  );
  const isInitialLoading = computed(() => loading.value && !initialLoaded.value);

  async function refresh(): Promise<void> {
    if (blockedError.value) {
      return;
    }

    currentAction.value = initialLoaded.value ? 'refresh-dashboard' : 'load-dashboard';
    requestedAt.value = now();
    await dashboardQuery.refetch();
  }

  watch(dashboardQuery.error, (error) => {
    if (error) {
      onError?.(getErrorMessage(error), error, currentAction.value);
    }
  });

  return {
    allActivityRows,
    initialLoaded,
    isInitialLoading,
    loadError,
    loading,
    refresh,
    stats,
  };
}
