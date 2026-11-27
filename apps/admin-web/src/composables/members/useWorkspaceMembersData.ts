import { ref, type ComputedRef, type Ref } from 'vue';
import type {
  ProjectListResponse,
  WorkspaceMemberListResponse,
  WorkspaceMemberResponse,
} from '@gitiempo/shared';

import type { MemberProjectAssignmentDiff } from '@/lib/member-management';
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

  let requestId = 0;

  function resetMembersData(): void {
    requestId += 1;
    members.value = [];
    projects.value = [];
    loadError.value = null;
    loading.value = false;
    initialLoaded.value = false;
  }

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

    const currentRequest = ++requestId;
    try {
      const [membersData, projectsData] = await Promise.all([
        membersClient.listMembers(),
        projectsClient.listProjects(),
      ]);

      if (currentRequest !== requestId) return;
      members.value = membersData;
      projects.value = projectsData;
      if (setInitialLoaded) {
        initialLoaded.value = true;
      }
    } catch (error) {
      if (currentRequest !== requestId) return;
      const message = getErrorMessage(error);
      if (setError) {
        loadError.value = message;
      }
      onError?.(message, error, errorAction);
    } finally {
      if (currentRequest === requestId) loading.value = false;
    }
  }

  async function refreshMembers(): Promise<void> {
    await loadMembersData({ errorAction: 'refresh-members' });
  }

  function updateMember(updated: WorkspaceMemberResponse): void {
    members.value = members.value.map((member) => member.id === updated.id ? updated : member);
  }

  function applyAssignmentChanges(
    member: WorkspaceMemberResponse,
    { projectIdsToAdd, projectIdsToRemove }: MemberProjectAssignmentDiff,
  ): void {
    if (!projectIdsToAdd.length && !projectIdsToRemove.length) return;

    const { userId, displayName, email, avatarUrl, role } = member;
    const projectMember = { userId, displayName, email, avatarUrl, role };
    const added = new Set(projectIdsToAdd);
    const removed = new Set(projectIdsToRemove);
    projects.value = projects.value.map((project) => {
      if (added.has(project.id) && !project.members.some((item) => item.userId === userId)) {
        return { ...project, members: [...project.members, projectMember] };
      }
      if (removed.has(project.id)) {
        return { ...project, members: project.members.filter((item) => item.userId !== userId) };
      }
      return project;
    });
    updateMember({
      ...member,
      projectsAssignedCount: member.projectsAssignedCount + added.size - removed.size,
    });
  }

  return {
    applyAssignmentChanges,
    resetMembersData,
    initialLoaded,
    loadError,
    loading,
    loadMembersData,
    members,
    projects,
    refreshMembers,
    updateMember,
  };
}
