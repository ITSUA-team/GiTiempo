import type { ComputedRef, Ref } from 'vue';
import type { ProjectResponse } from '@gitiempo/shared';

import {
  adminProjectsClient,
  type AdminProjectsClient,
} from '@/services/admin-projects-client';

/* eslint-disable no-unused-vars */
interface UseProjectArchiveActionsOptions {
  accessToken: Ref<string | null> | ComputedRef<string | null>;
  client?: Pick<AdminProjectsClient, 'updateProject'>;
  collapseProjectRow: (project: ProjectResponse) => void;
  onError: (message: string, error: unknown, action: string) => void;
  onSuccess: (message: string) => void;
  refreshProjects: () => Promise<void>;
  requireConfirmation: (
    message: string,
    header: string,
    acceptLabel: string,
    accept: () => void,
  ) => void;
}
/* eslint-enable no-unused-vars */

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useProjectArchiveActions({
  accessToken,
  client = adminProjectsClient,
  collapseProjectRow,
  onError,
  onSuccess,
  refreshProjects,
  requireConfirmation,
}: UseProjectArchiveActionsOptions) {
  async function archiveProject(project: ProjectResponse): Promise<void> {
    if (!accessToken.value) {
      return;
    }

    try {
      await client.updateProject(project.id, {
        isActive: false,
      });
      onSuccess(`${project.name} has been archived.`);
      collapseProjectRow(project);
      await refreshProjects();
    } catch (error) {
      onError(
        getErrorMessage(error, 'Failed to archive project'),
        error,
        'archive-project',
      );
    }
  }

  function handleArchive(project: ProjectResponse): void {
    requireConfirmation(
      `"${project.name}" will be archived and hidden from non-admin users.`,
      'Archive project?',
      'Archive',
      () => {
        void archiveProject(project);
      },
    );
  }

  async function handleUnarchive(project: ProjectResponse): Promise<void> {
    if (!accessToken.value) {
      return;
    }

    try {
      await client.updateProject(project.id, {
        isActive: true,
      });
      onSuccess(`${project.name} is now active.`);
      collapseProjectRow(project);
      await refreshProjects();
    } catch (error) {
      onError(
        getErrorMessage(error, 'Failed to unarchive project'),
        error,
        'unarchive-project',
      );
    }
  }

  return {
    handleArchive,
    handleUnarchive,
  };
}
