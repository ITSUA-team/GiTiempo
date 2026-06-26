import type { ProjectResponse, TimeEntryResponse } from "@gitiempo/shared";
import { createAppConfirm, type ConfirmLike } from "@gitiempo/web-shared";
import { computed } from "vue";

import type { useTimeEntryDialog } from "./useTimeEntryDialog";
import type { useTimeEntryMutations } from "./useTimeEntryMutations";
import type { useTimeEntryTaskOptions } from "./useTimeEntryTaskOptions";

/* eslint-disable no-unused-vars */
interface UseTimeEntryDialogWorkflowOptions {
  confirm: ConfirmLike;
  dialog: ReturnType<typeof useTimeEntryDialog>;
  ensureProjectsLoaded(force?: boolean): Promise<ProjectResponse[]>;
  mutations: ReturnType<typeof useTimeEntryMutations>;
  taskOptions: ReturnType<typeof useTimeEntryTaskOptions>;
}
/* eslint-enable no-unused-vars */

export function useTimeEntryDialogWorkflow({
  confirm,
  dialog,
  ensureProjectsLoaded,
  mutations,
  taskOptions,
}: UseTimeEntryDialogWorkflowOptions) {
  const appConfirm = createAppConfirm(confirm);
  const isDeletingDialogEntry = computed(() => {
    const entry = dialog.editingEntry.value;

    return !!entry && mutations.isDeletingEntry.value === entry.id;
  });

  async function loadDialogProjectTasks(projectId: string) {
    return taskOptions.loadTargetProjectTaskOptions(projectId, dialog, {
      trackableOnly: true,
    });
  }

  async function setDialogProjectId(projectId: string | null): Promise<void> {
    dialog.setProjectId(projectId);

    if (!projectId) {
      return;
    }

    try {
      const tasks = await loadDialogProjectTasks(projectId);

      if (dialog.dialogProjectId.value === projectId) {
        dialog.updateTaskSuggestions("", tasks);
      }
    } catch {
      // Dialog keeps the request error visible for retryable correction.
    }
  }

  function handleDialogTaskSearch(query: string): void {
    dialog.updateTaskSuggestions(query);
  }

  async function openCreateDialog(day: string | null = null): Promise<void> {
    dialog.openCreateDialogState(day);

    try {
      await ensureProjectsLoaded();
    } catch {
      // Create mode can still open with the visible request error state.
    }
  }

  async function openEditDialog(entry: TimeEntryResponse): Promise<void> {
    dialog.openEditDialogState(entry);

    try {
      await ensureProjectsLoaded();
      const options = await loadDialogProjectTasks(entry.projectId);

      dialog.setTaskValue(
        options.find((task) => task.id === entry.taskId) ?? {
          id: entry.task.id,
          isActive: true,
          projectId: entry.projectId,
          title: entry.task.title,
        },
      );
      dialog.updateTaskSuggestions("", options);
    } catch {
      dialog.setTaskFromEntryFallback(entry);
    }
  }

  async function saveDialog(): Promise<void> {
    const validInput = dialog.validateDialog();

    if (!validInput) {
      return;
    }

    dialog.setRequestError(null);
    const errorMessage = await mutations.saveDialogEntry({
      editingEntry: dialog.editingEntry.value,
      input: validInput,
      mode: dialog.dialogMode.value,
    });

    if (errorMessage) {
      dialog.setRequestError(errorMessage);
      return;
    }

    dialog.closeDialog();
  }

  function requestDeleteEntry(
    entry: TimeEntryResponse,
    options: { closeDialogOnSuccess?: boolean } = {},
  ): void {
    appConfirm.confirmDestructive({
      accept: async () => {
        const wasDeleted = await mutations.deleteEntry(entry);

        if (
          wasDeleted &&
          options.closeDialogOnSuccess === true &&
          dialog.editingEntry.value?.id === entry.id
        ) {
          dialog.closeDialog();
        }
      },
      acceptLabel: "Delete",
      header: "Delete entry?",
      message: "This time entry will be permanently deleted.",
    });
  }

  function requestDeleteDialogEntry(): void {
    const entry = dialog.editingEntry.value;

    if (!entry || dialog.dialogMode.value !== "edit") {
      return;
    }

    requestDeleteEntry(entry, { closeDialogOnSuccess: true });
  }

  return {
    handleDialogTaskSearch,
    isDeletingDialogEntry,
    openCreateDialog,
    openEditDialog,
    requestDeleteDialogEntry,
    requestDeleteEntry,
    saveDialog,
    setDialogProjectId,
  };
}
