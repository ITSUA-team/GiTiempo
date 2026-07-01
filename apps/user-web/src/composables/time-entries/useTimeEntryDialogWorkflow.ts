import {
  createManualTimeEntrySchema,
  type ProjectResponse,
  type TimeEntryResponse,
} from "@gitiempo/shared";
import {
  createAppConfirm,
  createAppToast,
  getErrorMessage,
  type ConfirmLike,
  type ToastLike,
} from "@gitiempo/web-shared";
import { computed, type ComputedRef } from "vue";

import { useCreateTaskMutation } from "@/composables/query";
import { validateInlineNewTaskInput } from "@/lib/inline-new-task";
import type { UserServerStateScope } from "@/lib/query-keys";
import type { TimeEntriesClient } from "@/services/time-entries-client";

import {
  isGitHubIssueTaskLookupOption,
  isNewTaskLookupOption,
  toTaskLookupOption,
  type TaskLookupOption,
  type TaskLookupValue,
} from "./time-entry-task-lookup";
import type {
  useTimeEntryDialog,
  ValidatedTimeEntryDialogInput,
} from "./useTimeEntryDialog";
import type { useTimeEntryMutations } from "./useTimeEntryMutations";
import type { useTimeEntryTaskOptions } from "./useTimeEntryTaskOptions";

interface UseTimeEntryDialogWorkflowOptions {
  accessToken: ComputedRef<string | null>;
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
  accessToken,
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
  const appConfirm = createAppConfirm(confirm);
  const appToast = createAppToast(toast);
  const createTaskMutation = useCreateTaskMutation({
    accessToken,
    client,
    scope,
  });
  const isDeletingDialogEntry = computed(() => {
    const entry = dialog.editingEntry.value;

    return !!entry && mutations.isDeletingEntry.value === entry.id;
  });
  const isSavingDialogFlow = computed(
    () => mutations.isSavingDialog.value || createTaskMutation.isPending.value,
  );

  function getProjectDefaultBillable(projectId: string | null): boolean {
    return (
      visibleProjects.value.find((project) => project.id === projectId)
        ?.defaultBillableForTasks ?? true
    );
  }

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
      dialog.setIsBillable(getProjectDefaultBillable(dialog.dialogProjectId.value));
    }
  }

  function handleDialogTaskSearch(query: string): void {
    dialog.updateTaskSuggestions(query);
  }

  async function createDialogTaskFromSelection(
    taskTitle: string,
  ): Promise<TaskLookupOption | null> {
    const projectId = dialog.dialogProjectId.value;

    if (!projectId) {
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
      const createdTask = await createDialogTaskFromSelection(
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
    isSavingDialogFlow,
    openCreateDialog,
    openEditDialog,
    requestDeleteDialogEntry,
    requestDeleteEntry,
    saveDialog,
    setDialogProjectId,
    setDialogTaskValue,
  };
}
