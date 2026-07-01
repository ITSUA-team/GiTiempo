import type {
  ProjectListResponse,
  WorkspaceInviteResponse,
  WorkspaceMemberListResponse,
  WorkspaceMemberResponse,
} from '@gitiempo/shared';

export interface MemberManagementStats {
  activeMembers: number;
  pendingInvites: number | string;
  pmsAssigned: number;
}

export interface MemberProjectAssignmentDiff {
  projectIdsToAdd: string[];
  projectIdsToRemove: string[];
}

export function getMemberDisplayName(member: WorkspaceMemberResponse): string {
  return member.displayName?.trim() || member.email;
}

export function getPendingInviteRows(
  invites: WorkspaceInviteResponse[],
): WorkspaceInviteResponse[] {
  return invites.filter((invite) => invite.status === 'pending');
}

export function deriveMemberManagementStats({
  invitesLoadError,
  members,
  pendingInviteRows,
}: {
  invitesLoadError: string | null;
  members: WorkspaceMemberListResponse;
  pendingInviteRows: WorkspaceInviteResponse[];
}): MemberManagementStats {
  return {
    activeMembers: members.length,
    pendingInvites:
      invitesLoadError && pendingInviteRows.length === 0
        ? '—'
        : pendingInviteRows.length,
    pmsAssigned: members.filter((member) => member.role === 'pm').length,
  };
}

export function diffMemberProjectAssignments({
  member,
  nextProjectIds,
  projects,
}: {
  member: WorkspaceMemberResponse;
  nextProjectIds: string[];
  projects: ProjectListResponse;
}): MemberProjectAssignmentDiff {
  const currentAssignedIds = new Set(
    projects
      .filter((project) =>
        project.isActive &&
        project.members.some((projectMember) => projectMember.userId === member.userId),
      )
      .map((project) => project.id),
  );
  const nextAssignedIds = new Set(nextProjectIds);

  return {
    projectIdsToAdd: nextProjectIds.filter((id) => !currentAssignedIds.has(id)),
    projectIdsToRemove: [...currentAssignedIds].filter(
      (id) => !nextAssignedIds.has(id),
    ),
  };
}
