import { ref, type ComputedRef, type Ref } from 'vue';
import type {
  ProjectListResponse,
  WorkspaceMemberResponse,
} from '@gitiempo/shared';
import type { MemberAssignFormInput } from '@gitiempo/web-shared';

import {
  adminProjectsClient,
  type AdminProjectsClient,
} from '@/services/admin-projects-client';
import type { MembersTableRow } from '@/lib/members-table';
import {
  diffMemberProjectAssignments,
  getMemberDisplayName,
} from '@/lib/member-management';

interface UseMemberAssignmentActionsOptions {
  accessToken: Ref<string | null> | ComputedRef<string | null>;
  client?: Pick<AdminProjectsClient, 'assignMember' | 'removeAssignment'>;
  collapseMemberRow: (member: WorkspaceMemberResponse) => void;
  onError: (message: string, error: unknown, action: string) => void;
  onSuccess: (message: string) => void;
  projects: Ref<ProjectListResponse>;
  refreshMembers: () => Promise<void>;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Failed to save assignments';
}

export function useMemberAssignmentActions({
  accessToken,
  client = adminProjectsClient,
  collapseMemberRow,
  onError,
  onSuccess,
  projects,
  refreshMembers,
}: UseMemberAssignmentActionsOptions) {
  const savingMemberAssignmentId = ref<string | null>(null);

  async function handleAssignmentsSubmitted(
    row: MembersTableRow,
    input: MemberAssignFormInput,
  ): Promise<void> {
    if (!row.canAssignPm || !accessToken.value) {
      return;
    }

    const { member } = row;
    const { projectIdsToAdd, projectIdsToRemove } = diffMemberProjectAssignments({
      member,
      nextProjectIds: input.projectIds,
      projects: projects.value,
    });

    savingMemberAssignmentId.value = member.id;

    try {
      for (const projectId of projectIdsToAdd) {
        await client.assignMember(projectId, member.userId);
      }
      for (const projectId of projectIdsToRemove) {
        await client.removeAssignment(projectId, member.userId);
      }

      onSuccess(`Project assignments for ${getMemberDisplayName(member)} saved.`);
      collapseMemberRow(member);
      await refreshMembers();
    } catch (error) {
      onError(getErrorMessage(error), error, 'save-project-assignments');
    } finally {
      savingMemberAssignmentId.value = null;
    }
  }

  return {
    handleAssignmentsSubmitted,
    savingMemberAssignmentId,
  };
}
