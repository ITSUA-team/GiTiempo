import type { ComputedRef, Ref } from 'vue';
import type { ProjectResponse } from '@gitiempo/shared';

import {
  adminProjectsClient,
  type AdminProjectsClient,
} from '@/services/admin-projects-client';

interface UseProjectArchiveActionsOptions {
  getVisit?: () => number;
  accessToken: Ref<string | null> | ComputedRef<string | null>;
  client?: Pick<AdminProjectsClient, 'updateProject'>;
  collapseProjectRow: (project: ProjectResponse) => void;
  onError: (message: string, error: unknown, action: string) => void;
  onRename: (message: string) => void;
  refreshProjects: () => Promise<void>;
  requireConfirmation: (
    message: string,
    header: string,
    acceptLabel: string,
    accept: () => void,
  ) => void;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useProjectArchiveActions({
  getVisit = () => 0,
  accessToken,
  client = adminProjectsClient,
  collapseProjectRow,
  onError,
  onRename,
  refreshProjects,
  requireConfirmation,
}: UseProjectArchiveActionsOptions) {
  async function archiveProject(project: ProjectResponse): Promise<void> {
    const visit = getVisit();
    if (!accessToken.value) {
      return;
    }

    try {
      await client.updateProject(project.id, {
        isActive: false,
      });
      if (visit !== getVisit()) return;
      collapseProjectRow(project);
      await refreshProjects();
      if (visit !== getVisit()) return;
    } catch (error) {
      if (visit !== getVisit()) return;
      onError(
        getErrorMessage(error, 'Failed to archive project'),
        error,
        'archive-project',
      );
    }
  }

  function handleArchive(project: ProjectResponse): void {
    const visit = getVisit();
    requireConfirmation(
      `"${project.name}" will be archived and hidden from non-admin users.`,
      'Archive project?',
      'Archive',
      () => {
        if (visit === getVisit()) void archiveProject(project);
      },
    );
  }

  async function handleUnarchive(project: ProjectResponse): Promise<void> {
    const visit = getVisit();
    if (!accessToken.value) {
      return;
    }

    try {
      const updated = await client.updateProject(project.id, {
        isActive: true,
      });
      if (visit !== getVisit()) return;
      if (updated.name !== project.name) {
        onRename(`${project.name} is now active as "${updated.name}", because another project already uses the original name.`);
      }
      collapseProjectRow(project);
      await refreshProjects();
      if (visit !== getVisit()) return;
    } catch (error) {
      if (visit !== getVisit()) return;
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
