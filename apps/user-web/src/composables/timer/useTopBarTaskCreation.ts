import { createAppToast, getErrorMessage, type ToastLike } from "@gitiempo/web-shared";
import { useCreateTaskMutation } from "@/composables/query";
import { computed, type ComputedRef } from "vue";

import type { UserServerStateScope } from "@/lib/query-keys";
import type { TimeEntriesClient } from "@/services/time-entries-client";

import type { TopBarTaskPicker } from "./useTopBarTaskPicker";

interface UseTopBarTaskCreationOptions {
  client: TimeEntriesClient;
  picker: TopBarTaskPicker;
  scope: ComputedRef<UserServerStateScope>;
  toast: ToastLike;
}

export function useTopBarTaskCreation({
  client,
  picker,
  scope,
  toast,
}: UseTopBarTaskCreationOptions) {
  const appToast = createAppToast(toast);
  const createTaskMutation = useCreateTaskMutation({
    client,
    scope,
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
