import type { TaskResponse } from "@gitiempo/shared";
import {
  createAppToast,
  getErrorMessage,
  type ToastLike,
} from "@gitiempo/web-shared";
import {
  useCreateTaskMutation,
  useDeleteTaskMutation,
  useUpdateTaskMutation,
} from "@gitiempo/web-shared/query";
import { shallowRef, type ComputedRef } from "vue";

import type { TimeEntriesClient } from "@/services/time-entries-client";

import type { ValidProjectTaskDialogInput } from "./useProjectTaskDialog";

/* eslint-disable no-unused-vars */
interface UseProjectTaskMutationsOptions {
  accessToken: ComputedRef<string | null>;
  client: TimeEntriesClient;
  onTaskDeleted(task: TaskResponse): void;
  onTaskSaved(task: TaskResponse): void;
  toast: ToastLike;
}
/* eslint-enable no-unused-vars */

export function useProjectTaskMutations({
  accessToken,
  client,
  onTaskDeleted,
  onTaskSaved,
  toast,
}: UseProjectTaskMutationsOptions) {
  const appToast = createAppToast(toast);
  const isSavingDialog = shallowRef(false);
  const isDeletingTaskId = shallowRef<string | null>(null);
  const lastMutationErrorMessage = shallowRef<string | null>(null);
  const createTaskMutation = useCreateTaskMutation({
    accessToken,
    client,
  });
  const updateTaskMutation = useUpdateTaskMutation({
    accessToken,
    client,
  });
  const deleteTaskMutation = useDeleteTaskMutation({
    accessToken,
    client,
  });

  async function saveTask(
    validInput: ValidProjectTaskDialogInput,
    editingTask: TaskResponse | null,
  ): Promise<string | null> {
    isSavingDialog.value = true;
    lastMutationErrorMessage.value = null;

    try {
      if (validInput.mode === "edit") {
        if (!editingTask) {
          throw new Error("The selected task could not be found.");
        }

        const updatedTask = await updateTaskMutation.mutateAsync({
          input: validInput.input,
          projectId: validInput.projectId,
          taskId: editingTask.id,
        });

        onTaskSaved(updatedTask);
        appToast.showSuccessToast(
          "Task updated",
          "Your changes have been saved.",
        );
      } else {
        const createdTask = await createTaskMutation.mutateAsync({
          input: validInput.input,
          projectId: validInput.projectId,
        });

        onTaskSaved(createdTask);
        appToast.showSuccessToast(
          "Task created",
          "The new task has been added.",
        );
      }

      return null;
    } catch (error) {
      const message = getErrorMessage(error);

      lastMutationErrorMessage.value = message;
      appToast.showErrorToast({
        detail: "Please review the dialog values and try again.",
        error,
        logContext: {
          action: validInput.mode === "edit" ? "update-task" : "create-task",
          feature: "projects-page",
        },
        summary:
          validInput.mode === "edit"
            ? "Could not update task"
            : "Could not create task",
      });
      return message;
    } finally {
      isSavingDialog.value = false;
    }
  }

  async function deleteTask(task: TaskResponse): Promise<void> {
    isDeletingTaskId.value = task.id;
    lastMutationErrorMessage.value = null;

    try {
      await deleteTaskMutation.mutateAsync({
        projectId: task.projectId,
        taskId: task.id,
      });
      onTaskDeleted(task);
      appToast.showSuccessToast(
        "Task deleted",
        "The selected task has been removed.",
      );
    } catch (error) {
      const message = getErrorMessage(error);

      lastMutationErrorMessage.value = message;
      appToast.showErrorToast({
        detail: message,
        error,
        logContext: { action: "delete-task", feature: "projects-page" },
        summary: "Could not delete task",
      });
    } finally {
      isDeletingTaskId.value = null;
    }
  }

  return {
    deleteTask,
    isDeletingTaskId,
    isSavingDialog,
    lastMutationErrorMessage,
    saveTask,
  };
}
