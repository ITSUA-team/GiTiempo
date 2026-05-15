import {
  computed,
  onMounted,
  shallowRef,
  type ComputedRef,
  type Ref,
} from 'vue';
import type { WorkspaceRole } from '@gitiempo/shared';

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

const dashboardPageLimit = 100;
const activityPreviewLimit = 5;
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
    const reportQuery = {
      ...weekRange,
      groupBy: 'project' as const,
      limit: dashboardPageLimit,
      page: 1,
      sortBy: 'lastStartedAt' as const,
      sortOrder: 'desc' as const,
    };

    loading.value = true;
    loadError.value = null;

    try {
      const dashboardData =
        dashboardRole === 'admin'
          ? await (async () => {
              const [members, invites, projectSummary, projects, report] =
                await Promise.all([
                  membersClient.listMembers(token),
                  membersClient.listInvites(token),
                  projectsClient.getManagementSummary(token),
                  projectsClient.listProjects(token),
                  reportsClient.getTimeReport(token, reportQuery),
                ]);

              return {
                invites,
                members,
                projectSummary,
                projects,
                report,
              };
            })()
          : await (async () => {
              const [projectSummary, projects, report] = await Promise.all([
                projectsClient.getManagementSummary(token),
                projectsClient.listProjects(token),
                reportsClient.getTimeReport(token, reportQuery),
              ]);

              return {
                projectSummary,
                projects,
                report,
              };
            })();

      if (currentRequestId !== requestId) {
        return;
      }

      stats.value = deriveDashboardStats(dashboardData, requestedAt, dashboardRole);
      allActivityRows.value = deriveDashboardActivityRows(
        dashboardData,
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
