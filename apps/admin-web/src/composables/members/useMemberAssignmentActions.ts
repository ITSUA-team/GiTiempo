import { effectScope, ref, watch, type ComputedRef, type Ref } from 'vue';
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
import { diffMemberProjectAssignments } from '@/lib/member-management';
import { getAdminServerStateScope } from '@/lib/server-state-scope';

interface UseMemberAssignmentActionsOptions {
  getVisit?: () => number;
  accessToken: Ref<string | null> | ComputedRef<string | null>;
  client?: Pick<AdminProjectsClient, 'assignMember' | 'removeAssignment'>;
  collapseMemberRow: (member: WorkspaceMemberResponse) => void;
  onError: (message: string, error: unknown, action: string) => void;
  projects: Ref<ProjectListResponse>;
  refreshMembers: () => Promise<void>;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Failed to save assignments';
}

export function useMemberAssignmentActions({
  accessToken,
  getVisit = () => 0,
  client = adminProjectsClient,
  collapseMemberRow,
  onError,
  projects,
  refreshMembers,
}: UseMemberAssignmentActionsOptions) {
  const savingMemberAssignmentId = ref<string | null>(null);

  async function handleAssignmentsSubmitted(
    row: MembersTableRow,
    input: MemberAssignFormInput,
  ): Promise<void> {
    const scope = getAdminServerStateScope(accessToken.value);
    if (!row.canAssignPm || !accessToken.value || !scope.workspaceId || !scope.userId || scope.role !== 'admin') {
      return;
    }

    const { member } = row;
    const { projectIdsToAdd, projectIdsToRemove } = diffMemberProjectAssignments({
      member,
      nextProjectIds: input.projectIds,
      projects: projects.value,
    });

    let mutationEligible = true;
    const mutationScope = effectScope(true);
    mutationScope.run(() => watch(
      [
        () => getAdminServerStateScope(accessToken.value).workspaceId,
        () => getAdminServerStateScope(accessToken.value).userId,
        () => getAdminServerStateScope(accessToken.value).role,
        () => Boolean(accessToken.value),
      ],
      () => { mutationEligible = false; },
      { flush: 'sync' },
    ));
    const visit = getVisit();
    savingMemberAssignmentId.value = member.id;

    try {
      for (const projectId of projectIdsToAdd) {
        await client.assignMember(projectId, member.userId);
        if (!mutationEligible) return;
      }
      for (const projectId of projectIdsToRemove) {
        await client.removeAssignment(projectId, member.userId);
        if (!mutationEligible) return;
      }

      if (!mutationEligible || visit !== getVisit()) return;
      collapseMemberRow(member);
      await refreshMembers();
      if (!mutationEligible || visit !== getVisit()) return;
    } catch (error) {
      if (!mutationEligible || visit !== getVisit()) return;
      onError(getErrorMessage(error), error, 'save-project-assignments');
    } finally {
      mutationScope.stop();
      if (mutationEligible && visit === getVisit()) savingMemberAssignmentId.value = null;
    }
  }

  return {
    handleAssignmentsSubmitted,
    savingMemberAssignmentId,
  };
}
