import {
  computed,
  nextTick,
  onMounted,
  shallowRef,
  type ComputedRef,
  type Ref,
} from 'vue';
import {
  useAdminProjectsQuery,
  useManagementProjectSummaryQuery,
  useTimeReportQuery,
  useWorkspaceInvitesQuery,
  useWorkspaceMembersQuery,
} from '@gitiempo/web-shared/query';
import type { TimeReportQuery, WorkspaceRole } from '@gitiempo/shared';

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

interface UseAdminDashboardPageOptions {
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

const activityPreviewLimit = 5;
const dashboardPageLimit = 100;
const missingRoleMessage = 'Workspace role is required to view the dashboard.';
const missingTokenMessage = 'Sign in to view the dashboard.';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Failed to load dashboard';
}

export function useAdminDashboardPage({
  accessToken,
  membersClient = adminMembersClient,
  now = () => new Date(),
  onError,
  projectsClient = adminProjectsClient,
  reportsClient = adminReportsClient,
  role = shallowRef<WorkspaceRole | null>('admin'),
}: UseAdminDashboardPageOptions) {
  const stats = shallowRef<AdminDashboardStatCard[]>([]);
  const allActivityRows = shallowRef<AdminDashboardActivityRow[]>([]);
  const showAllActivity = shallowRef(false);
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
  const isActivityEmpty = computed(
    () =>
      initialLoaded.value &&
      !loading.value &&
      loadError.value === null &&
      allActivityRows.value.length === 0,
  );
  const hasMoreActivity = computed(
    () => allActivityRows.value.length > activityPreviewLimit,
  );
  const activityRows = computed(() =>
    showAllActivity.value
      ? allActivityRows.value
      : allActivityRows.value.slice(0, activityPreviewLimit),
  );

  async function loadDashboard(action: string): Promise<void> {
    const token = accessToken.value;
    const currentRequestId = requestId + 1;
    requestId = currentRequestId;

    if (!token) {
      stats.value = [];
      allActivityRows.value = [];
      showAllActivity.value = false;
      loadError.value = missingTokenMessage;
      initialLoaded.value = true;
      loading.value = false;
      return;
    }

    const dashboardRole = role.value;

    if (!dashboardRole) {
      stats.value = [];
      allActivityRows.value = [];
      showAllActivity.value = false;
      loadError.value = missingRoleMessage;
      initialLoaded.value = true;
      loading.value = false;
      return;
    }

    const requestedAt = now();
    const weekRange = getDashboardWeekRange(requestedAt);

    loading.value = true;
    loadError.value = null;
    dashboardReportQuery.value = {
      ...weekRange,
      groupBy: 'project',
      limit: dashboardPageLimit,
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
        Number.POSITIVE_INFINITY,
      );
      if (!hasMoreActivity.value) {
        showAllActivity.value = false;
      }
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

  function toggleActivityRows(): void {
    if (!hasMoreActivity.value) {
      showAllActivity.value = false;
      return;
    }

    showAllActivity.value = !showAllActivity.value;
  }

  onMounted(refresh);

  return {
    activityRows,
    hasMoreActivity,
    initialLoaded,
    isActivityEmpty,
    isInitialLoading,
    loadError,
    loading,
    refresh,
    showAllActivity,
    stats,
    toggleActivityRows,
  };
}
