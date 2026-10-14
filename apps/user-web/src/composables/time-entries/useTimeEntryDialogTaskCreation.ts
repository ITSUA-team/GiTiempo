import type { ProjectResponse } from "@gitiempo/shared";
import {
  createAppToast,
  getErrorMessage,
  type ToastLike,
} from "@gitiempo/web-shared";
import type { ComputedRef } from "vue";

import { useCreateTaskMutation } from "@/composables/query";
import { validateInlineNewTaskInput } from "@/lib/inline-new-task";
import type { UserServerStateScope } from "@/lib/query-keys";
import type { TimeEntriesClient } from "@/services/time-entries-client";

import {
  toTaskLookupOption,
  type TaskLookupOption,
} from "./time-entry-task-lookup";
import type { useTimeEntryDialog } from "./useTimeEntryDialog";
import type { useTimeEntryTaskOptions } from "./useTimeEntryTaskOptions";

interface UseTimeEntryDialogTaskCreationOptions {
  client: TimeEntriesClient;
  dialog: ReturnType<typeof useTimeEntryDialog>;
  scope: ComputedRef<UserServerStateScope>;
  taskOptions: ReturnType<typeof useTimeEntryTaskOptions>;
  toast: ToastLike;
  visibleProjects: ComputedRef<ProjectResponse[]>;
}

export function useTimeEntryDialogTaskCreation({
  client,
  dialog,
  scope,
  taskOptions,
  toast,
  visibleProjects,
}: UseTimeEntryDialogTaskCreationOptions) {
  const appToast = createAppToast(toast);
  const createTaskMutation = useCreateTaskMutation({
    client,
    scope,
  });

  function canManageProjectTasks(projectId: string): boolean {
    return visibleProjects.value.some(
      (project) =>
        project.id === projectId && project.capabilities.canManageTasks,
    );
  }

  function getProjectDefaultBillable(projectId: string | null): boolean {
    return (
      visibleProjects.value.find((project) => project.id === projectId)
        ?.defaultBillableForTasks ?? true
    );
  }

  async function createDialogTaskFromSelection(
    taskTitle: string,
  ): Promise<TaskLookupOption | null> {
    const projectId = dialog.dialogProjectId.value;

    if (!projectId) {
      return null;
    }

    if (!canManageProjectTasks(projectId)) {
      dialog.setNewTaskTitleError(
        "You do not have permission to create tasks in this project.",
      );
      return null;
    }

    const parsedTaskInput = validateInlineNewTaskInput({
      defaultBillableForTimeEntries: getProjectDefaultBillable(projectId),
      title: taskTitle,
    });

    if (!parsedTaskInput.success) {
      dialog.setNewTaskTitleError(
        parsedTaskInput.error.flatten().fieldErrors.title?.[0] ??
          "Task title is invalid.",
      );
      return null;
    }

    try {
      const task = await createTaskMutation.mutateAsync({
        input: parsedTaskInput.data,
        projectId,
      });

      if (
        dialog.dialogProjectId.value !== projectId ||
        !canManageProjectTasks(projectId)
      ) {
        dialog.setRequestError(
          "The project or your access changed before the task was ready. The time entry was not saved; the task may already have been created.",
        );
        return null;
      }

      const options = taskOptions.upsertProjectTask(task, { trackableOnly: true });
      const taskOption = toTaskLookupOption(task);

      dialog.setTaskOptions(options);
      dialog.setTaskValue(taskOption);
      dialog.updateTaskSuggestions("", options);
      dialog.setNewTaskTitle("");
      appToast.showSuccessToast(
        "Task created",
        "The new task is ready to use for time entries.",
      );

      return taskOption;
    } catch (error) {
      const message = getErrorMessage(error);

      dialog.setNewTaskTitleError(message);
      appToast.showErrorToast({
        detail: "Please review the task title and try again.",
        error,
        logContext: { action: "create-task", feature: "time-entries" },
        summary: "Could not create the task",
      });

      return null;
    }
  }

  return {
    createDialogTaskFromSelection,
    getProjectDefaultBillable,
    isCreatingTask: createTaskMutation.isPending,
  };
}
