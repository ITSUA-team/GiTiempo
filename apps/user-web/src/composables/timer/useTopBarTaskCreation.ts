import { createAppToast, getErrorMessage, type ToastLike } from "@gitiempo/web-shared";
import { useCreateTaskMutation } from "@gitiempo/web-shared/query";
import { computed, type ComputedRef } from "vue";

import type { TimeEntriesClient } from "@/services/time-entries-client";

import type { TopBarTaskPicker } from "./useTopBarTaskPicker";

interface UseTopBarTaskCreationOptions {
  accessToken: ComputedRef<string | null>;
  client: TimeEntriesClient;
  picker: TopBarTaskPicker;
  toast: ToastLike;
}

export function useTopBarTaskCreation({
  accessToken,
  client,
  picker,
  toast,
}: UseTopBarTaskCreationOptions) {
  const appToast = createAppToast(toast);
  const createTaskMutation = useCreateTaskMutation({
    accessToken,
    client,
  });
  const isCreatingTask = computed(() => createTaskMutation.isPending.value);

  async function createTaskFromDialog(): Promise<void> {
    const projectId = picker.selectedProjectId.value;

    if (!projectId) {
      return;
    }

    const parsed = picker.validateCreateTaskInput();

    if (!parsed) {
      return;
    }

    try {
      const task = await createTaskMutation.mutateAsync({
        input: parsed,
        projectId,
      });
      const cachedTasks = picker.getCachedTasks(projectId) ?? [];
      const nextTasks = [...cachedTasks, task];

      picker.setCachedTasks(projectId, nextTasks);
      picker.setTasks(nextTasks);
      picker.setSelectedTaskId(task.id);
      picker.setCreateTaskTitle("");
      appToast.showSuccessToast(
        "Task created",
        "The new task is ready to use for tracking time.",
      );
    } catch (error) {
      picker.setCreateTaskError(getErrorMessage(error));
      appToast.showErrorToast({
        detail: "Please review the task title and try again.",
        error,
        logContext: { action: "create-task", feature: "top-bar-timer" },
        summary: "Could not create the task",
      });
    }
  }

  return {
    createTaskFromDialog,
    isCreatingTask,
  };
}
