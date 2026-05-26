import {
  computed,
  nextTick,
  shallowRef,
  type ComputedRef,
  type Ref,
} from 'vue';
import type { TimeReportQuery, WorkspaceRole } from '@gitiempo/shared';
import {
  useAdminProjectsQuery,
  useManagementProjectSummaryQuery,
  useTimeReportQuery,
  useWorkspaceInvitesQuery,
  useWorkspaceMembersQuery,
} from '@gitiempo/web-shared/query';

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
  getDashboardWeekRange,
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

interface UseAdminDashboardDataOptions {
  accessToken: Ref<string | null> | ComputedRef<string | null>;
  membersClient?: Pick<AdminMembersClient, 'listInvites' | 'listMembers'>;
  now?: () => Date;
  /* eslint-disable no-unused-vars */
  onError?: (message: string, error: unknown, action: string) => void;
  /* eslint-enable no-unused-vars */
  projectsClient?: Pick<AdminProjectsClient, 'getManagementSummary' | 'listProjects'>;
  reportsClient?: Pick<AdminReportsClient, 'getTimeReport'>;
  role?: Ref<WorkspaceRole | null> | ComputedRef<WorkspaceRole | null>;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : ADMIN_DASHBOARD_LOAD_ERROR_MESSAGE;
}

export function useAdminDashboardData({
  accessToken,
  membersClient = adminMembersClient,
  now = () => new Date(),
  onError,
  projectsClient = adminProjectsClient,
  reportsClient = adminReportsClient,
  role = shallowRef<WorkspaceRole | null>('admin'),
}: UseAdminDashboardDataOptions) {
  const stats = shallowRef<AdminDashboardStatCard[]>([]);
  const allActivityRows = shallowRef<AdminDashboardActivityRow[]>([]);
  const loading = shallowRef(true);
  const initialLoaded = shallowRef(false);
  const loadError = shallowRef<string | null>(null);
  const dashboardReportQuery = shallowRef<Partial<TimeReportQuery>>({});
  const membersQuery = useWorkspaceMembersQuery({
    accessToken,
    client: membersClient,
    enabled: false,
  });
  const invitesQuery = useWorkspaceInvitesQuery({
    accessToken,
    client: membersClient,
    enabled: false,
  });
  const projectSummaryQuery = useManagementProjectSummaryQuery({
    accessToken,
    client: projectsClient,
    enabled: false,
  });
  const projectsQuery = useAdminProjectsQuery({
    accessToken,
    client: projectsClient,
    enabled: false,
  });
  const reportQuery = useTimeReportQuery({
    accessToken,
    client: reportsClient,
    enabled: false,
    query: dashboardReportQuery,
  });

  let requestId = 0;

  const isInitialLoading = computed(() => loading.value && !initialLoaded.value);

  function setBlockedState(message: string): void {
    stats.value = [];
    allActivityRows.value = [];
    loadError.value = message;
    initialLoaded.value = true;
    loading.value = false;
  }

  async function loadDashboard(action: string): Promise<void> {
    const currentRequestId = requestId + 1;
    requestId = currentRequestId;

    if (!accessToken.value) {
      setBlockedState(ADMIN_DASHBOARD_MISSING_TOKEN_MESSAGE);
      return;
    }

    const dashboardRole = role.value;

    if (!dashboardRole) {
      setBlockedState(ADMIN_DASHBOARD_MISSING_ROLE_MESSAGE);
      return;
    }

    const requestedAt = now();
    const weekRange = getDashboardWeekRange(requestedAt);

    loading.value = true;
    loadError.value = null;
    dashboardReportQuery.value = {
      ...weekRange,
      groupBy: 'project',
      limit: ADMIN_DASHBOARD_REPORT_PAGE_LIMIT,
      page: 1,
      sortBy: 'lastStartedAt',
      sortOrder: 'desc',
    };
    await nextTick();

    try {
      const [projectSummaryResult, projectsResult, reportResult] = await Promise.all([
        projectSummaryQuery.refetch({ throwOnError: true }),
        projectsQuery.refetch({ throwOnError: true }),
        reportQuery.refetch({ throwOnError: true }),
      ]);
      const projectSummary = projectSummaryResult.data;
      const projects = projectsResult.data;
      const report = reportResult.data;

      if (!projectSummary || !projects || !report) {
        throw new Error('Could not load dashboard data.');
      }

      const nextDashboardData =
        dashboardRole === 'admin'
          ? await (async () => {
              const [invitesResult, membersResult] = await Promise.all([
                invitesQuery.refetch({ throwOnError: true }),
                membersQuery.refetch({ throwOnError: true }),
              ]);

              if (!invitesResult.data || !membersResult.data) {
                throw new Error('Could not load dashboard workspace data.');
              }

              return {
                invites: invitesResult.data,
                members: membersResult.data,
                projectSummary,
                projects,
                report,
              };
            })()
          : {
              projectSummary,
              projects,
              report,
            };

      if (currentRequestId !== requestId) {
        return;
      }

      stats.value = deriveDashboardStats(nextDashboardData, requestedAt, dashboardRole);
      allActivityRows.value = deriveDashboardActivityRows(
        nextDashboardData,
        requestedAt,
        ADMIN_DASHBOARD_ACTIVITY_FULL_LIMIT,
      );
      initialLoaded.value = true;
    } catch (error) {
      if (currentRequestId !== requestId) {
        return;
      }

      const message = getErrorMessage(error);
      loadError.value = message;
      onError?.(message, error, action);
    } finally {
      if (currentRequestId === requestId) {
        loading.value = false;
      }
    }
  }

  async function refresh(): Promise<void> {
    await loadDashboard(initialLoaded.value ? 'refresh-dashboard' : 'load-dashboard');
  }

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
