import { ref, type ComputedRef, type Ref } from 'vue';
import type {
  ManagementProjectSummaryResponse,
  ProjectListResponse,
  WorkspaceMemberListResponse,
} from '@gitiempo/shared';

import {
  adminMembersClient,
  type AdminMembersClient,
} from '@/services/admin-members-client';
import {
  adminProjectsClient,
  type AdminProjectsClient,
} from '@/services/admin-projects-client';
import { sortActiveProjectsFirst } from '@/lib/project-management';

interface LoadProjectsDataOptions {
  errorAction: string;
  setError?: boolean;
  setInitialLoaded?: boolean;
}

interface UseAdminProjectsDataOptions {
  accessToken: Ref<string | null> | ComputedRef<string | null>;
  membersClient?: Pick<AdminMembersClient, 'listMembers'>;
  onError?: (message: string, error: unknown, action: string) => void;
  projectsClient?: Pick<
    AdminProjectsClient,
    'getManagementSummary' | 'listProjects'
  >;
}

function createEmptySummary(): ManagementProjectSummaryResponse {
  return {
    activeProjects: 0,
    privateProjects: 0,
    publicProjects: 0,
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected error occurred';
}

export function useAdminProjectsData({
  accessToken,
  membersClient = adminMembersClient,
  onError,
  projectsClient = adminProjectsClient,
}: UseAdminProjectsDataOptions) {
  const projects = ref<ProjectListResponse>([]);
  const summary = ref<ManagementProjectSummaryResponse>(createEmptySummary());
  const members = ref<WorkspaceMemberListResponse>([]);
  const loading = ref(true);
  const loadError = ref<string | null>(null);
  const initialLoaded = ref(false);

  async function loadProjectsData({
    errorAction,
    setError = false,
    setInitialLoaded = false,
  }: LoadProjectsDataOptions): Promise<void> {
    if (!accessToken.value) {
      return;
    }

    loading.value = true;
    if (setError) {
      loadError.value = null;
    }

    try {
      const [projectsData, summaryData, membersData] = await Promise.all([
        projectsClient.listProjects(),
        projectsClient.getManagementSummary(),
        membersClient.listMembers(),
      ]);

      projects.value = sortActiveProjectsFirst(projectsData);
      summary.value = summaryData;
      members.value = membersData;
      if (setInitialLoaded) {
        initialLoaded.value = true;
      }
    } catch (error) {
      const message = getErrorMessage(error);
      if (setError) {
        loadError.value = message;
      }
      onError?.(message, error, errorAction);
    } finally {
      loading.value = false;
    }
  }

  async function refreshProjects(): Promise<void> {
    await loadProjectsData({ errorAction: 'refresh-projects' });
  }

  return {
    initialLoaded,
    loadError,
    loading,
    loadProjectsData,
    members,
    projects,
    refreshProjects,
    summary,
  };
}
