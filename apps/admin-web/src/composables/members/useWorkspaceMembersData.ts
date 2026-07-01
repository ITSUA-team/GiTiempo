import { ref, type ComputedRef, type Ref } from 'vue';
import type {
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

interface LoadMembersDataOptions {
  errorAction: string;
  setError?: boolean;
  setInitialLoaded?: boolean;
}

interface UseWorkspaceMembersDataOptions {
  accessToken: Ref<string | null> | ComputedRef<string | null>;
  membersClient?: Pick<AdminMembersClient, 'listMembers'>;
  onError?: (message: string, error: unknown, action: string) => void;
  projectsClient?: Pick<AdminProjectsClient, 'listProjects'>;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected error occurred';
}

export function useWorkspaceMembersData({
  accessToken,
  membersClient = adminMembersClient,
  onError,
  projectsClient = adminProjectsClient,
}: UseWorkspaceMembersDataOptions) {
  const members = ref<WorkspaceMemberListResponse>([]);
  const projects = ref<ProjectListResponse>([]);
  const loading = ref(true);
  const loadError = ref<string | null>(null);
  const initialLoaded = ref(false);

  async function loadMembersData({
    errorAction,
    setError = false,
    setInitialLoaded = false,
  }: LoadMembersDataOptions): Promise<void> {
    if (!accessToken.value) {
      return;
    }

    loading.value = true;
    if (setError) {
      loadError.value = null;
    }

    try {
      const [membersData, projectsData] = await Promise.all([
        membersClient.listMembers(),
        projectsClient.listProjects(),
      ]);

      members.value = membersData;
      projects.value = projectsData;
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

  async function refreshMembers(): Promise<void> {
    await loadMembersData({ errorAction: 'refresh-members' });
  }

  return {
    initialLoaded,
    loadError,
    loading,
    loadMembersData,
    members,
    projects,
    refreshMembers,
  };
}
