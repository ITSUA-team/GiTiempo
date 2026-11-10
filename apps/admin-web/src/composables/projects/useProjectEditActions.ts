import { ref, type ComputedRef, type Ref } from 'vue';
import { WorkspaceRoles, type ProjectResponse } from '@gitiempo/shared';
import type { ProjectEditFormInput } from '@gitiempo/web-shared';

import {
  adminProjectsClient,
  type AdminProjectsClient,
} from '@/services/admin-projects-client';
import { diffProjectMemberAssignments } from '@/lib/project-management';

interface UseProjectEditActionsOptions {
  getVisit?: () => number;
  accessToken: Ref<string | null> | ComputedRef<string | null>;
  client?: Pick<
    AdminProjectsClient,
    'assignMember' | 'removeAssignment' | 'updateProject'
  >;
  collapseProjectRow: (project: ProjectResponse) => void;
  onError: (message: string, error: unknown, action: string) => void;
  openProjectBackfillDialogIfNeeded: (project: ProjectResponse) => Promise<void>;
  refreshProjects: () => Promise<void>;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Failed to save project';
}

export function useProjectEditActions({
  getVisit = () => 0,
  accessToken,
  client = adminProjectsClient,
  collapseProjectRow,
  onError,
  openProjectBackfillDialogIfNeeded,
  refreshProjects,
}: UseProjectEditActionsOptions) {
  const savingProjectEditId = ref<string | null>(null);

  async function handleProjectEditSubmitted(
    project: ProjectResponse,
    input: ProjectEditFormInput,
  ): Promise<void> {
    const visit = getVisit();
    if (!accessToken.value) {
      return;
    }

    const { memberIdsToAdd, memberIdsToRemove } = diffProjectMemberAssignments({
      nextMemberIds: input.memberIds,
      project,
    });

    const currentManagerUserId =
      project.members.find((m) => m.role === WorkspaceRoles.PM)?.userId ?? null;
    const nextManagerUserId = input.managerUserId ?? null;
    const managerChanged =
      (nextManagerUserId ?? null) !== (currentManagerUserId ?? null);
    const managerToAdd =
      managerChanged &&
      nextManagerUserId !== null &&
      !input.memberIds.includes(nextManagerUserId)
        ? nextManagerUserId
        : null;
    const managerToRemove =
      managerChanged &&
      currentManagerUserId !== null &&
      !memberIdsToRemove.includes(currentManagerUserId)
        ? currentManagerUserId
        : null;

    let savedProject: ProjectResponse | null = null;

    savingProjectEditId.value = project.id;

    try {
      savedProject = await client.updateProject(project.id, {
        defaultBillableForTasks: input.defaultBillableForTasks,
        timeRoundingStepMinutes: input.timeRoundingStepMinutes,
        visibility: input.visibility,
      });
      if (visit !== getVisit()) return;

      for (const userId of memberIdsToAdd) {
        await client.assignMember(project.id, userId);
        if (visit !== getVisit()) return;
      }
      for (const userId of memberIdsToRemove) {
        await client.removeAssignment(project.id, userId);
        if (visit !== getVisit()) return;
      }

      if (managerToAdd) {
        await client.assignMember(project.id, managerToAdd);
        if (visit !== getVisit()) return;
      }
      if (managerToRemove) {
        await client.removeAssignment(project.id, managerToRemove);
        if (visit !== getVisit()) return;
      }

      collapseProjectRow(project);
      await refreshProjects();
      if (visit !== getVisit()) return;

      if (savedProject.defaultBillableForTasks !== project.defaultBillableForTasks) {
        await openProjectBackfillDialogIfNeeded(savedProject);
        if (visit !== getVisit()) return;
      }
    } catch (error) {
      if (visit !== getVisit()) return;
      onError(getErrorMessage(error), error, 'update-project');

      if (
        savedProject &&
        savedProject.defaultBillableForTasks !== project.defaultBillableForTasks
      ) {
        await openProjectBackfillDialogIfNeeded(savedProject);
        if (visit !== getVisit()) return;
      }
    } finally {
      if (visit === getVisit()) savingProjectEditId.value = null;
    }
  }

  return {
    handleProjectEditSubmitted,
    savingProjectEditId,
  };
}
