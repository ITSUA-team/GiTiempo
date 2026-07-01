import {
  createManualTimeEntrySchema,
  type ProjectResponse,
  type TimeEntryResponse,
} from "@gitiempo/shared";
import type { ConfirmLike, ToastLike } from "@gitiempo/web-shared";
import { computed, type ComputedRef } from "vue";

import type { UserServerStateScope } from "@/lib/query-keys";
import type { TimeEntriesClient } from "@/services/time-entries-client";

import {
  isGitHubIssueTaskLookupOption,
  isNewTaskLookupOption,
  toTaskLookupOption,
  type TaskLookupValue,
} from "./time-entry-task-lookup";
import type {
  useTimeEntryDialog,
  ValidatedTimeEntryDialogInput,
} from "./useTimeEntryDialog";
import { useTimeEntryDeleteConfirmation } from "./useTimeEntryDeleteConfirmation";
import { useTimeEntryDialogTaskCreation } from "./useTimeEntryDialogTaskCreation";
import type { useTimeEntryMutations } from "./useTimeEntryMutations";
import type { useTimeEntryTaskOptions } from "./useTimeEntryTaskOptions";

interface UseTimeEntryDialogWorkflowOptions {
  client: TimeEntriesClient;
  confirm: ConfirmLike;
  dialog: ReturnType<typeof useTimeEntryDialog>;
  ensureProjectsLoaded(force?: boolean): Promise<ProjectResponse[]>;
  mutations: ReturnType<typeof useTimeEntryMutations>;
  scope: ComputedRef<UserServerStateScope>;
  taskOptions: ReturnType<typeof useTimeEntryTaskOptions>;
  toast: ToastLike;
  visibleProjects: ComputedRef<ProjectResponse[]>;
}

export function useTimeEntryDialogWorkflow({
  client,
  confirm,
  dialog,
  ensureProjectsLoaded,
  mutations,
  scope,
  taskOptions,
  toast,
  visibleProjects,
}: UseTimeEntryDialogWorkflowOptions) {
  const taskCreation = useTimeEntryDialogTaskCreation({
    client,
    dialog,
    scope,
    taskOptions,
    toast,
    visibleProjects,
  });
  const deleteConfirmation = useTimeEntryDeleteConfirmation({
    confirm,
    dialog,
    mutations,
  });
  const isSavingDialogFlow = computed(
    () => mutations.isSavingDialog.value || taskCreation.isCreatingTask.value,
  );

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

  function setDialogTaskValue(value: TaskLookupValue): void {
    dialog.setTaskValue(value);

    if (dialog.dialogMode.value === "create" && isNewTaskLookupOption(value)) {
      dialog.setIsBillable(
        taskCreation.getProjectDefaultBillable(dialog.dialogProjectId.value),
      );
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
    const validationResult = dialog.validateDialog();

    if (!validationResult) {
      return;
    }

    dialog.setRequestError(null);
    let validInput: ValidatedTimeEntryDialogInput;

    if (validationResult.kind === "new-task") {
      const createdTask = await taskCreation.createDialogTaskFromSelection(
        validationResult.taskTitle,
      );

      if (!createdTask) {
        return;
      }

      const parsedEntryInput = createManualTimeEntrySchema.safeParse({
        ...validationResult.draftInput,
        taskId: createdTask.id,
      });

      if (!parsedEntryInput.success) {
        dialog.setRequestError("Time entry values are invalid.");
        return;
      }

      validInput = {
        ...parsedEntryInput.data,
        isBillable: validationResult.draftInput.isBillable,
      };
    } else {
      validInput = validationResult.input;
    }

    const result = await mutations.saveDialogEntry({
      editingEntry: dialog.editingEntry.value,
      input: validInput,
      mode: dialog.dialogMode.value,
      selectedTask: dialog.activeDialogTask.value,
    });

    if (result.materializedTask) {
      taskOptions.invalidateProjectTaskOptions(result.materializedTask.projectId);

      if (isGitHubIssueTaskLookupOption(dialog.activeDialogTask.value)) {
        dialog.setTaskValue(toTaskLookupOption(result.materializedTask));
      }
    }

    if (result.errorMessage) {
      dialog.setRequestError(result.errorMessage);
      return;
    }

    dialog.closeDialog();
  }

  return {
    handleDialogTaskSearch,
    isDeletingDialogEntry: deleteConfirmation.isDeletingDialogEntry,
    isSavingDialogFlow,
    openCreateDialog,
    openEditDialog,
    requestDeleteDialogEntry: deleteConfirmation.requestDeleteDialogEntry,
    requestDeleteEntry: deleteConfirmation.requestDeleteEntry,
    saveDialog,
    setDialogProjectId,
    setDialogTaskValue,
  };
}
