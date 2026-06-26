import type { ProjectListResponse, ProjectResponse } from '@gitiempo/shared';

export interface ProjectMemberAssignmentDiff {
  memberIdsToAdd: string[];
  memberIdsToRemove: string[];
}

export function sortActiveProjectsFirst(
  list: ProjectListResponse,
): ProjectListResponse {
  return [...list].sort((a, b) => {
    if (a.isActive === b.isActive) {
      return 0;
    }

    return a.isActive ? -1 : 1;
  });
}

export function diffProjectMemberAssignments({
  nextMemberIds,
  project,
}: {
  nextMemberIds: string[];
  project: ProjectResponse;
}): ProjectMemberAssignmentDiff {
  const currentMemberIds = new Set(
    project.members.map((member) => member.userId),
  );
  const nextMemberIdSet = new Set(nextMemberIds);

  return {
    memberIdsToAdd: nextMemberIds.filter((id) => !currentMemberIds.has(id)),
    memberIdsToRemove: project.members
      .map((member) => member.userId)
      .filter((id) => !nextMemberIdSet.has(id)),
  };
}
