import { computed, effectScope, ref, watch, type ComputedRef, type Ref } from 'vue';
import { WorkspaceRoles, type ProjectResponse } from '@gitiempo/shared';
import type { ProjectEditFormInput } from '@gitiempo/web-shared';

import {
  adminProjectsClient,
  type AdminProjectsClient,
} from '@/services/admin-projects-client';
import { diffProjectMemberAssignments } from '@/lib/project-management';
import { getAdminServerStateScope } from '@/lib/server-state-scope';

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
  const scope = computed(() => getAdminServerStateScope(accessToken.value));
  const canEdit = () => Boolean(
    accessToken.value && scope.value.workspaceId && scope.value.userId &&
    scope.value.role === WorkspaceRoles.Admin,
  );

  async function handleProjectEditSubmitted(
    project: ProjectResponse,
    input: ProjectEditFormInput,
  ): Promise<void> {
    const visit = getVisit();
    if (!canEdit()) {
      return;
    }

    let eligible = true;
    const mutationScope = effectScope(true);
    mutationScope.run(() => {
      watch(
        [
          () => scope.value.workspaceId,
          () => scope.value.userId,
          () => scope.value.role,
          () => Boolean(accessToken.value),
        ],
        () => { eligible = false; },
        { flush: 'sync' },
      );
    });
    const isMutationCurrent = () => eligible && canEdit();
    const isViewCurrent = () => isMutationCurrent() && visit === getVisit();

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
      if (!isMutationCurrent()) return;

      for (const userId of memberIdsToAdd) {
        await client.assignMember(project.id, userId);
        if (!isMutationCurrent()) return;
      }
      for (const userId of memberIdsToRemove) {
        await client.removeAssignment(project.id, userId);
        if (!isMutationCurrent()) return;
      }

      if (managerToAdd) {
        await client.assignMember(project.id, managerToAdd);
        if (!isMutationCurrent()) return;
      }
      if (managerToRemove) {
        await client.removeAssignment(project.id, managerToRemove);
        if (!isMutationCurrent()) return;
      }

      if (!isViewCurrent()) return;
      collapseProjectRow(project);
      await refreshProjects();
      if (!isViewCurrent()) return;

      if (savedProject.defaultBillableForTasks !== project.defaultBillableForTasks) {
        await openProjectBackfillDialogIfNeeded(savedProject);
        if (!isMutationCurrent()) return;
      }
    } catch (error) {
      if (!isViewCurrent()) return;
      onError(getErrorMessage(error), error, 'update-project');

      if (
        savedProject &&
        savedProject.defaultBillableForTasks !== project.defaultBillableForTasks
      ) {
        await openProjectBackfillDialogIfNeeded(savedProject);
        if (!isMutationCurrent()) return;
      }
    } finally {
      mutationScope.stop();
      if (isViewCurrent()) savingProjectEditId.value = null;
    }
  }

  return {
    handleProjectEditSubmitted,
    savingProjectEditId,
  };
}
