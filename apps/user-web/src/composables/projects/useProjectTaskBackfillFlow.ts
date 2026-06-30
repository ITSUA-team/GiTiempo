import { createAppToast, type ToastLike } from "@gitiempo/web-shared";
import { ref, shallowRef } from "vue";

import type { TimeEntriesClient } from "@/services/time-entries-client";

interface TaskBackfillTarget {
  id: string;
  projectId: string;
  title: string;
}

interface TaskBackfillDialogState {
  taskId: string;
  taskTitle: string;
  updateTimeEntries: boolean;
}

interface UseProjectTaskBackfillFlowOptions {
  client: Pick<
    TimeEntriesClient,
    "backfillTaskBillableDefault" | "listProjectTimeEntries"
  >;
  toast: ToastLike;
}

export function useProjectTaskBackfillFlow({
  client,
  toast,
}: UseProjectTaskBackfillFlowOptions) {
  const appToast = createAppToast(toast);
  const submittingTaskBackfill = shallowRef(false);
  const taskBackfillDialog = ref<TaskBackfillDialogState | null>(null);

  async function openTaskBackfillDialogIfNeeded(
    task: TaskBackfillTarget,
  ): Promise<void> {
    try {
      const entries = await client.listProjectTimeEntries(task.projectId, {
        limit: 1,
        taskId: task.id,
      });

      if (entries.meta.total === 0) {
        return;
      }

      taskBackfillDialog.value = {
        taskId: task.id,
        taskTitle: task.title,
        updateTimeEntries: true,
      };
    } catch (error) {
      appToast.showErrorToast({
        detail: "The task default was saved for future entries.",
        error,
        logContext: { action: "check-task-backfill", feature: "projects-page" },
        summary: "Could not check existing time entries",
      });
    }
  }

  function closeTaskBackfillDialog(): void {
    if (submittingTaskBackfill.value) {
      return;
    }

    taskBackfillDialog.value = null;
  }

  async function handleTaskBackfillSubmitted(): Promise<void> {
    const dialogState = taskBackfillDialog.value;

    if (!dialogState) {
      return;
    }

    if (!dialogState.updateTimeEntries) {
      taskBackfillDialog.value = null;
      return;
    }

    submittingTaskBackfill.value = true;

    try {
      const result = await client.backfillTaskBillableDefault(
        dialogState.taskId,
        { updateTimeEntries: true },
      );

      appToast.showSuccessToast(
        "Existing time entries updated",
        `${result.timeEntriesUpdated} existing ${
          result.timeEntriesUpdated === 1 ? "entry has" : "entries have"
        } been updated.`,
      );
      taskBackfillDialog.value = null;
    } catch (error) {
      appToast.showErrorToast({
        detail: "Please try again.",
        error,
        logContext: { action: "backfill-task-default", feature: "projects-page" },
        summary: "Could not update existing time entries",
      });
    } finally {
      submittingTaskBackfill.value = false;
    }
  }

  return {
    closeTaskBackfillDialog,
    handleTaskBackfillSubmitted,
    openTaskBackfillDialogIfNeeded,
    submittingTaskBackfill,
    taskBackfillDialog,
  };
}
