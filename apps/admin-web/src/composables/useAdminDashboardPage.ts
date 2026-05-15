import {
  computed,
  onMounted,
  shallowRef,
  type ComputedRef,
  type Ref,
} from 'vue';

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
}

const dashboardPageLimit = 100;
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
}: UseAdminDashboardPageOptions) {
  const stats = shallowRef<AdminDashboardStatCard[]>([]);
  const activityRows = shallowRef<AdminDashboardActivityRow[]>([]);
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
      activityRows.value.length === 0,
  );

  async function loadDashboard(action: string): Promise<void> {
    const token = accessToken.value;
    const currentRequestId = requestId + 1;
    requestId = currentRequestId;

    if (!token) {
      stats.value = [];
      activityRows.value = [];
      loadError.value = missingTokenMessage;
      initialLoaded.value = true;
      loading.value = false;
      return;
    }

    const requestedAt = now();
    const weekRange = getDashboardWeekRange(requestedAt);

    loading.value = true;
    loadError.value = null;

    try {
      const [members, invites, projectSummary, projects, report] = await Promise.all([
        membersClient.listMembers(token),
        membersClient.listInvites(token),
        projectsClient.getManagementSummary(token),
        projectsClient.listProjects(token),
        reportsClient.getTimeReport(token, {
          ...weekRange,
          groupBy: 'project',
          limit: dashboardPageLimit,
          page: 1,
          sortBy: 'lastStartedAt',
          sortOrder: 'desc',
        }),
      ]);

      if (currentRequestId !== requestId) {
        return;
      }

      const dashboardData = {
        invites,
        members,
        projectSummary,
        projects,
        report,
      };

      stats.value = deriveDashboardStats(dashboardData, requestedAt);
      activityRows.value = deriveDashboardActivityRows(dashboardData, requestedAt);
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

  onMounted(refresh);

  return {
    activityRows,
    initialLoaded,
    isActivityEmpty,
    isInitialLoading,
    loadError,
    loading,
    refresh,
    stats,
  };
}
