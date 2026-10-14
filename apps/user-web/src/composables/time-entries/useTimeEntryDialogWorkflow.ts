import {
  createManualTimeEntrySchema,
  type ProjectResponse,
  type TimeEntryResponse,
} from "@gitiempo/shared";
import type { ConfirmLike, ToastLike } from "@gitiempo/web-shared";
import { computed, ref, watch, type ComputedRef } from "vue";

import type { UserServerStateScope } from "@/lib/query-keys";
import type { TimeEntriesClient } from "@/services/time-entries-client";

import {
  isGitHubIssueTaskLookupOption,
  isNewTaskLookupOption,
  isTaskLookupOption,
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
  const isReconcilingDialogTarget = ref(false);
  let dialogScopeRefreshId = 0;
  const canCreateDialogTask = computed(() => {
    const projectId = dialog.dialogProjectId.value;

    return visibleProjects.value.some(
      (project) =>
        project.id === projectId && project.capabilities.canManageTasks,
    );
  });

  function refreshDialogTaskSuggestions(query = ""): void {
    dialog.updateTaskSuggestions(
      query,
      undefined,
      canCreateDialogTask.value,
    );
  }

  function clearUnauthorizedNewTaskSelection(): void {
    if (canCreateDialogTask.value || !isNewTaskLookupOption(dialog.dialogTaskValue.value)) {
      return;
    }

    dialog.setTaskValue(null);
    dialog.setNewTaskTitle("");
  }

  async function reconcileDialogTargetAfterProjectRefresh(
    nextProjects: ProjectResponse[],
    previousProjects: ProjectResponse[],
  ): Promise<void> {
    const refreshId = ++dialogScopeRefreshId;
    isReconcilingDialogTarget.value = false;
    const projectId = dialog.dialogProjectId.value;

    if (!dialog.isDialogOpen.value || !projectId) {
      return;
    }

    const wasVisible = previousProjects.some((project) => project.id === projectId);
    const isVisible = nextProjects.some((project) => project.id === projectId);

    // Only clear a current selection after an authoritative visible-projects
    // update removes it. This keeps edit/create state during an ordinary
    // refetch while preventing a dialog from retaining a target after access
    // to its workspace or project is revoked.
    if (wasVisible && !isVisible) {
      if (dialog.dialogMode.value === "create") {
        dialog.setProjectId(null);
        return;
      }

      isReconcilingDialogTarget.value = true;
      try {
        const projects = await ensureProjectsLoaded();

        if (
          refreshId === dialogScopeRefreshId &&
          dialog.isDialogOpen.value &&
          dialog.dialogProjectId.value === projectId &&
          !projects.some((project) => project.id === projectId)
        ) {
          dialog.setProjectId(null);
        }
      } catch {
        // Do not clear an existing entry while its authoritative access check failed.
      } finally {
        if (refreshId === dialogScopeRefreshId) {
          isReconcilingDialogTarget.value = false;
        }
      }
      return;
    }

    if (!wasVisible || !isVisible || dialog.dialogMode.value !== "create") {
      return;
    }

    // A project can remain visible while one formerly owned task stops being
    // eligible. Drop the cache before reloading so a successful scope refresh
    // cannot leave that task selectable in an already-open create dialog.
    isReconcilingDialogTarget.value = true;
    taskOptions.invalidateProjectTaskOptions(projectId);

    try {
      const options = await loadDialogProjectTasks(projectId);
      const selectedTask = dialog.dialogTaskValue.value;

      if (
        refreshId === dialogScopeRefreshId &&
        dialog.dialogMode.value === "create" &&
        dialog.dialogProjectId.value === projectId &&
        visibleProjects.value.some((project) => project.id === projectId) &&
        isTaskLookupOption(selectedTask) &&
        !options.some((task) => task.id === selectedTask.id)
      ) {
        dialog.setTaskValue(null);
      }
    } catch {
      // Keep a still-authorized selection while task scope cannot be refreshed.
    } finally {
      if (refreshId === dialogScopeRefreshId) {
        isReconcilingDialogTarget.value = false;
      }
    }
  }

  watch(visibleProjects, (nextProjects, previousProjects) => {
    void reconcileDialogTargetAfterProjectRefresh(nextProjects, previousProjects);
  });

  watch(
    [() => dialog.dialogProjectId.value, canCreateDialogTask],
    () => {
      clearUnauthorizedNewTaskSelection();

      if (dialog.dialogProjectId.value) {
        refreshDialogTaskSuggestions();
      }
    },
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
        dialog.updateTaskSuggestions("", tasks, canCreateDialogTask.value);
      }
    } catch {
      // Dialog keeps the request error visible for retryable correction.
    }
  }

  function setDialogTaskValue(value: TaskLookupValue): void {
    if (isNewTaskLookupOption(value) && !canCreateDialogTask.value) {
      dialog.setTaskValue(null);
      dialog.setNewTaskTitle("");
      refreshDialogTaskSuggestions();
      return;
    }

    dialog.setTaskValue(value);

    if (dialog.dialogMode.value === "create" && isNewTaskLookupOption(value)) {
      dialog.setIsBillable(
        taskCreation.getProjectDefaultBillable(dialog.dialogProjectId.value),
      );
    }
  }

  function handleDialogTaskSearch(query: string): void {
    refreshDialogTaskSuggestions(query);
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
      const projects = await ensureProjectsLoaded();

      if (dialog.editingEntry.value?.id !== entry.id) {
        return;
      }

      if (!projects.some((project) => project.id === entry.projectId)) {
        dialog.setProjectId(null);
        return;
      }

      const options = await loadDialogProjectTasks(entry.projectId);

      if (
        dialog.editingEntry.value?.id === entry.id &&
        dialog.dialogProjectId.value === entry.projectId
      ) {
        dialog.setTaskValue(
          options.find((task) => task.id === entry.taskId) ?? {
            id: entry.task.id,
            isActive: true,
            projectId: entry.projectId,
            title: entry.task.title,
          },
        );
        dialog.updateTaskSuggestions("", options, canCreateDialogTask.value);
      }
    } catch {
      if (
        dialog.editingEntry.value?.id === entry.id &&
        dialog.dialogProjectId.value === entry.projectId
      ) {
        dialog.setTaskFromEntryFallback(entry);
      }
    }
  }

  async function saveDialog(): Promise<void> {
    if (isReconcilingDialogTarget.value || dialog.isLoadingDialogTasks.value) {
      return;
    }

    const validationResult = dialog.validateDialog();

    if (!validationResult) {
      return;
    }

    if (
      dialog.dialogMode.value === "create" &&
      !visibleProjects.value.some(
        (project) => project.id === dialog.dialogProjectId.value,
      )
    ) {
      dialog.setProjectId(null);
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
    canCreateDialogTask,
    isDeletingDialogEntry: deleteConfirmation.isDeletingDialogEntry,
    isReconcilingDialogTarget,
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
