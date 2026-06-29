import { ref } from 'vue';
import type { ProjectResponse } from '@gitiempo/shared';

import {
  adminProjectsClient,
  type AdminProjectsClient,
} from '@/services/admin-projects-client';

interface ProjectBackfillDialogState {
  hasTasks: boolean;
  hasTimeEntries: boolean;
  projectId: string;
  projectName: string;
  updateTasks: boolean;
  updateTimeEntries: boolean;
}

interface UseProjectBillableBackfillFlowOptions {
  client?: Pick<
    AdminProjectsClient,
    | 'backfillProjectBillableDefault'
    | 'listProjectTasks'
    | 'listProjectTimeEntries'
  >;
  onError: (message: string, error: unknown, action: string) => void;
  onSuccess: (message: string) => void;
  refreshProjects: () => Promise<void>;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useProjectBillableBackfillFlow({
  client = adminProjectsClient,
  onError,
  onSuccess,
  refreshProjects,
}: UseProjectBillableBackfillFlowOptions) {
  const projectBackfillDialog = ref<ProjectBackfillDialogState | null>(null);
  const submittingProjectBackfill = ref(false);

  async function openProjectBackfillDialogIfNeeded(
    project: ProjectResponse,
  ): Promise<void> {
    try {
      const [tasksData, timeEntriesData] = await Promise.all([
        client.listProjectTasks(project.id, { includeInactive: true }),
        client.listProjectTimeEntries(project.id, { limit: 1 }),
      ]);
      const hasTasks = tasksData.length > 0;
      const hasTimeEntries = timeEntriesData.meta.total > 0;

      if (!hasTasks && !hasTimeEntries) {
        return;
      }

      projectBackfillDialog.value = {
        hasTasks,
        hasTimeEntries,
        projectId: project.id,
        projectName: project.name,
        updateTasks: hasTasks,
        updateTimeEntries: hasTimeEntries,
      };
    } catch (error) {
      onError(
        getErrorMessage(error, 'Failed to check existing project records'),
        error,
        'check-project-backfill',
      );
    }
  }

  function closeProjectBackfillDialog(): void {
    if (submittingProjectBackfill.value) {
      return;
    }

    projectBackfillDialog.value = null;
  }

  async function handleProjectBackfillSubmitted(): Promise<void> {
    const dialog = projectBackfillDialog.value;

    if (!dialog) {
      return;
    }

    submittingProjectBackfill.value = true;

    try {
      const result = await client.backfillProjectBillableDefault(
        dialog.projectId,
        {
          updateTasks: dialog.updateTasks,
          updateTimeEntries: dialog.updateTimeEntries,
        },
      );
      const updatedCount = result.tasksUpdated + result.timeEntriesUpdated;

      onSuccess(
        `${updatedCount} existing ${updatedCount === 1 ? 'record has' : 'records have'} been updated.`,
      );
      projectBackfillDialog.value = null;
      await refreshProjects();
    } catch (error) {
      onError(
        getErrorMessage(error, 'Failed to update existing records'),
        error,
        'backfill-project-default',
      );
    } finally {
      submittingProjectBackfill.value = false;
    }
  }

  return {
    closeProjectBackfillDialog,
    handleProjectBackfillSubmitted,
    openProjectBackfillDialogIfNeeded,
    projectBackfillDialog,
    submittingProjectBackfill,
  };
}
