import { ref, type ComputedRef, type Ref } from 'vue';
import type { ProjectResponse } from '@gitiempo/shared';
import type { ProjectEditFormInput } from '@gitiempo/web-shared';

import {
  adminProjectsClient,
  type AdminProjectsClient,
} from '@/services/admin-projects-client';
import { diffProjectMemberAssignments } from '@/lib/project-management';

interface UseProjectEditActionsOptions {
  accessToken: Ref<string | null> | ComputedRef<string | null>;
  client?: Pick<
    AdminProjectsClient,
    'assignMember' | 'removeAssignment' | 'updateProject'
  >;
  collapseProjectRow: (project: ProjectResponse) => void;
  onError: (message: string, error: unknown, action: string) => void;
  onSuccess: (message: string) => void;
  openProjectBackfillDialogIfNeeded: (project: ProjectResponse) => Promise<void>;
  refreshProjects: () => Promise<void>;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Failed to save project';
}

export function useProjectEditActions({
  accessToken,
  client = adminProjectsClient,
  collapseProjectRow,
  onError,
  onSuccess,
  openProjectBackfillDialogIfNeeded,
  refreshProjects,
}: UseProjectEditActionsOptions) {
  const savingProjectEditId = ref<string | null>(null);

  async function handleProjectEditSubmitted(
    project: ProjectResponse,
    input: ProjectEditFormInput,
  ): Promise<void> {
    if (!accessToken.value) {
      return;
    }

    const { memberIdsToAdd, memberIdsToRemove } = diffProjectMemberAssignments({
      nextMemberIds: input.memberIds,
      project,
    });
    let savedProject: ProjectResponse | null = null;

    savingProjectEditId.value = project.id;

    try {
      savedProject = await client.updateProject(project.id, {
        defaultBillableForTasks: input.defaultBillableForTasks,
        visibility: input.visibility,
      });

      for (const userId of memberIdsToAdd) {
        await client.assignMember(project.id, userId);
      }
      for (const userId of memberIdsToRemove) {
        await client.removeAssignment(project.id, userId);
      }

      onSuccess(`${project.name} has been updated.`);
      collapseProjectRow(project);
      await refreshProjects();

      if (savedProject.defaultBillableForTasks !== project.defaultBillableForTasks) {
        await openProjectBackfillDialogIfNeeded(savedProject);
      }
    } catch (error) {
      onError(getErrorMessage(error), error, 'update-project');

      if (
        savedProject &&
        savedProject.defaultBillableForTasks !== project.defaultBillableForTasks
      ) {
        await openProjectBackfillDialogIfNeeded(savedProject);
      }
    } finally {
      savingProjectEditId.value = null;
    }
  }

  return {
    handleProjectEditSubmitted,
    savingProjectEditId,
  };
}
