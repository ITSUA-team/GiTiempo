import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import { createAppConfirm, type ConfirmLike } from "@gitiempo/web-shared";
import { computed, type ComputedRef } from "vue";

import type { useProjectTaskDialog } from "./useProjectTaskDialog";
import type { useProjectTaskMutations } from "./useProjectTaskMutations";

interface BackfillTarget {
  id: string;
  projectId: string;
  title: string;
}

/* eslint-disable no-unused-vars */
interface UseProjectTaskActionsOptions {
  confirm: ConfirmLike;
  dialog: ReturnType<typeof useProjectTaskDialog>;
  mutations: ReturnType<typeof useProjectTaskMutations>;
  onTaskBillableDefaultChanged(task: BackfillTarget): Promise<void>;
  visibleProjects: ComputedRef<ProjectResponse[]>;
}
/* eslint-enable no-unused-vars */

export function useProjectTaskActions({
  confirm,
  dialog,
  mutations,
  onTaskBillableDefaultChanged,
  visibleProjects,
}: UseProjectTaskActionsOptions) {
  const appConfirm = createAppConfirm(confirm);
  const isDeletingDialogTask = computed(() => {
    const task = dialog.editingTask.value;

    return !!task && mutations.isDeletingTaskId.value === task.id;
  });

  function getProjectDefaultBillable(projectId: string | null): boolean {
    return (
      visibleProjects.value.find((project) => project.id === projectId)
        ?.defaultBillableForTasks ?? true
    );
  }

  function openTaskCreateDialog(projectId: string | null = null): void {
    dialog.openCreateDialog(projectId, getProjectDefaultBillable(projectId));
  }

  function setDialogProjectId(value: string | null): void {
    dialog.setDialogProjectId(value);

    if (dialog.dialogMode.value === "create") {
      dialog.setDialogDefaultBillableForTimeEntries(
        getProjectDefaultBillable(value),
      );
    }
  }

  async function saveDialog(): Promise<void> {
    const validInput = dialog.validateDialog();

    if (!validInput) {
      return;
    }

    const editingTask = dialog.editingTask.value;
    const shouldPromptForBackfill =
      validInput.mode === "edit" &&
      editingTask !== null &&
      validInput.input.defaultBillableForTimeEntries !==
        editingTask.defaultBillableForTimeEntries;
    const backfillTask = editingTask
      ? {
          id: editingTask.id,
          projectId: editingTask.projectId,
          title: validInput.input.title ?? editingTask.title,
        }
      : null;

    dialog.setDialogRequestError(null);
    const errorMessage = await mutations.saveTask(validInput, editingTask);

    if (errorMessage) {
      dialog.setDialogRequestError(errorMessage);
      return;
    }

    dialog.closeDialog();

    if (shouldPromptForBackfill && backfillTask) {
      await onTaskBillableDefaultChanged(backfillTask);
    }
  }

  function requestDeleteTask(
    task: TaskResponse,
    options: { closeDialogOnSuccess?: boolean } = {},
  ): void {
    appConfirm.confirmDestructive({
      accept: async () => {
        const wasDeleted = await mutations.deleteTask(task);

        if (
          wasDeleted &&
          options.closeDialogOnSuccess === true &&
          dialog.editingTask.value?.id === task.id
        ) {
          dialog.closeDialog();
        }
      },
      acceptLabel: "Delete",
      header: "Delete task?",
      message: "This task will be permanently deleted.",
    });
  }

  function requestDeleteDialogTask(): void {
    const task = dialog.editingTask.value;

    if (!task || dialog.dialogMode.value !== "edit") {
      return;
    }

    requestDeleteTask(task, { closeDialogOnSuccess: true });
  }

  return {
    isDeletingDialogTask,
    openTaskCreateDialog,
    requestDeleteDialogTask,
    requestDeleteTask,
    saveDialog,
    setDialogProjectId,
  };
}
