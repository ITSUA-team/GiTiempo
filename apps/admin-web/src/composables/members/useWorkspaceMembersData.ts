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

interface ConfirmedAssignmentChange {
  member: WorkspaceMemberResponse;
  changes: MemberProjectAssignmentDiff;
}

function updateProjectAssignments(
  projects: ProjectListResponse,
  { member, changes }: ConfirmedAssignmentChange,
): ProjectListResponse {
  const { userId, displayName, email, avatarUrl, role } = member;
  const projectMember = { userId, displayName, email, avatarUrl, role };
  const added = new Set(changes.projectIdsToAdd);
  const removed = new Set(changes.projectIdsToRemove);
  return projects.map((project) => {
    if (added.has(project.id) && !project.members.some((item) => item.userId === userId)) {
      return { ...project, members: [...project.members, projectMember] };
    }
    if (removed.has(project.id)) {
      return { ...project, members: project.members.filter((item) => item.userId !== userId) };
    }
    return project;
  });
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

  let pendingLoad: {
    updatedMembers: Map<string, WorkspaceMemberResponse>;
    assignmentChanges: ConfirmedAssignmentChange[];
  } | null = null;

  function resetMembersData(): void {
    pendingLoad = null;
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

    const currentLoad = {
      updatedMembers: new Map<string, WorkspaceMemberResponse>(),
      assignmentChanges: new Array<ConfirmedAssignmentChange>(),
    };
    pendingLoad = currentLoad;
    try {
      const [membersData, projectsData] = await Promise.all([
        membersClient.listMembers(),
        projectsClient.listProjects(),
      ]);

      if (currentLoad !== pendingLoad) return;
      // A list requested before a save can return after it. Keep confirmed edits
      // while accepting unrelated changes and removals from the response.
      members.value = membersData.map((member) => currentLoad.updatedMembers.get(member.id) ?? member);
      const memberIds = new Set(membersData.map((member) => member.id));
      projects.value = currentLoad.assignmentChanges
        .filter(({ member }) => memberIds.has(member.id))
        .reduce(updateProjectAssignments, projectsData);
      if (setInitialLoaded) {
        initialLoaded.value = true;
      }
    } catch (error) {
      if (currentLoad !== pendingLoad) return;
      const message = getErrorMessage(error);
      if (setError) {
        loadError.value = message;
      }
      onError?.(message, error, errorAction);
    } finally {
      if (currentLoad === pendingLoad) {
        pendingLoad = null;
        loading.value = false;
      }
    }
  }

  async function refreshMembers(): Promise<void> {
    await loadMembersData({ errorAction: 'refresh-members' });
  }

  function updateMember(updated: WorkspaceMemberResponse): void {
    pendingLoad?.updatedMembers.set(updated.id, updated);
    members.value = members.value.map((member) => member.id === updated.id ? updated : member);
  }

  function applyAssignmentChanges(
    member: WorkspaceMemberResponse,
    changes: MemberProjectAssignmentDiff,
  ): void {
    const { projectIdsToAdd, projectIdsToRemove } = changes;
    if (!projectIdsToAdd.length && !projectIdsToRemove.length) return;

    const confirmed = { member, changes };
    pendingLoad?.assignmentChanges.push(confirmed);
    projects.value = updateProjectAssignments(projects.value, confirmed);
    updateMember({
      ...member,
      projectsAssignedCount:
        member.projectsAssignedCount + new Set(projectIdsToAdd).size - new Set(projectIdsToRemove).size,
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
