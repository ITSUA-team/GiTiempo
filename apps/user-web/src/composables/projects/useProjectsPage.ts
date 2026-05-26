import type { TaskResponse } from "@gitiempo/shared";
import {
  createAppConfirm,
  createAppToast,
  getErrorMessage,
  type ConfirmLike,
  type ToastLike,
} from "@gitiempo/web-shared";
import { computed, onMounted, shallowRef } from "vue";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";

import {
  createTimeEntriesClient,
  type TimeEntriesClient,
} from "@/services/time-entries-client";
import { formatUpdatedLabel } from "@/lib/projects-page-helpers";
import { useAuthStore } from "@/stores/auth";

import { useProjectsData } from "./useProjectsData";
import { useProjectTaskDialog } from "./useProjectTaskDialog";
import { useProjectsSearch } from "./useProjectsSearch";

export type {
  ProjectsPageTaskGroup,
  ProjectsSearchSuggestion,
} from "@/lib/projects-page-helpers";

interface UseProjectsPageOptions {
  authStore?: ReturnType<typeof useAuthStore>;
  client?: TimeEntriesClient;
  confirm?: ConfirmLike;
  toast?: ToastLike;
}

const defaultClient = createTimeEntriesClient({
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
});

export function useProjectsPage(options: UseProjectsPageOptions = {}) {
  const authStore = options.authStore ?? useAuthStore();
  const client = options.client ?? defaultClient;
  const confirm = options.confirm ?? useConfirm();
  const toast = options.toast ?? useToast();
  const appConfirm = createAppConfirm(confirm);
  const appToast = createAppToast(toast);

  const isSavingDialog = shallowRef(false);
  const isDeletingTaskId = shallowRef<string | null>(null);
  const lastMutationErrorMessage = shallowRef<string | null>(null);
  const data = useProjectsData({
    accessToken: computed(() => authStore.accessToken),
    client,
    onLoadProjectsError(error) {
      appToast.showErrorToast({
        detail: "Please try again.",
        error,
        logContext: { action: "load-projects", feature: "projects-page" },
        summary: "Could not load visible projects",
      });
    },
    onLoadTasksError(message) {
      appToast.showErrorToast({
        detail: "Please try again.",
        error: new Error(message),
        logContext: { action: "load-project-tasks", feature: "projects-page" },
        summary: "Could not load project tasks",
      });
    },
  });
  const search = useProjectsSearch(data.visibleProjects, data.tasksByProjectId);
  const dialog = useProjectTaskDialog();
  const pageState = computed(() => {
    if (data.isLoadingProjects.value || data.isLoadingTasks.value) {
      return "loading";
    }

    if (data.requestErrorMessage.value) {
      return "request-error";
    }

    if (search.filteredProjectGroups.value.length === 0) {
      return "empty";
    }

    return "ready";
  });
  const canCreateTasks = computed(
    () =>
      data.visibleProjects.value.length > 0 &&
      !data.isLoadingProjects.value &&
      !data.isLoadingTasks.value,
  );

  async function saveDialog(): Promise<void> {
    const validInput = dialog.validateDialog();

    if (!validInput) {
      return;
    }

    isSavingDialog.value = true;
    dialog.setDialogRequestError(null);
    lastMutationErrorMessage.value = null;

    try {
      if (validInput.mode === "edit") {
        if (!dialog.editingTask.value) {
          throw new Error("The selected task could not be found.");
        }

        const updatedTask = await data.updateTaskMutation.mutateAsync({
          input: validInput.input,
          projectId: validInput.projectId,
          taskId: dialog.editingTask.value.id,
        });

        data.upsertTask(updatedTask);
        appToast.showSuccessToast(
          "Task updated",
          "Your changes have been saved.",
        );
      } else {
        const createdTask = await data.createTaskMutation.mutateAsync({
          input: validInput.input,
          projectId: validInput.projectId,
        });

        data.upsertTask(createdTask);
        appToast.showSuccessToast(
          "Task created",
          "The new task has been added.",
        );
      }

      dialog.closeDialog();
    } catch (error) {
      const message = getErrorMessage(error);

      dialog.setDialogRequestError(message);
      lastMutationErrorMessage.value = message;
      appToast.showErrorToast({
        detail: "Please review the dialog values and try again.",
        error,
        logContext: {
          action: dialog.dialogMode.value === "edit" ? "update-task" : "create-task",
          feature: "projects-page",
        },
        summary:
          dialog.dialogMode.value === "edit"
            ? "Could not update task"
            : "Could not create task",
      });
    } finally {
      isSavingDialog.value = false;
    }
  }

  async function deleteTask(task: TaskResponse): Promise<void> {
    isDeletingTaskId.value = task.id;
    lastMutationErrorMessage.value = null;

    try {
      await data.deleteTaskMutation.mutateAsync({
        projectId: task.projectId,
        taskId: task.id,
      });
      data.removeTask(task);
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

  function requestDeleteTask(task: TaskResponse): void {
    appConfirm.confirmDestructive({
      accept: async () => deleteTask(task),
      acceptLabel: "Delete",
      header: "Delete task?",
      message: "This task will be permanently deleted.",
    });
  }

  async function retryLoadPage(): Promise<void> {
    await data.loadPage();
  }

  onMounted(() => {
    void data.loadPage();
  });

  return {
    canCreateTasks,
    closeDialog: dialog.closeDialog,
    dialogErrors: dialog.dialogErrors,
    dialogMode: dialog.dialogMode,
    dialogProjectId: dialog.dialogProjectId,
    dialogRequestErrorMessage: dialog.dialogRequestErrorMessage,
    dialogSaveLabel: dialog.dialogSaveLabel,
    dialogSubtitle: dialog.dialogSubtitle,
    dialogTaskStatus: dialog.dialogTaskStatus,
    dialogTaskTitle: dialog.dialogTaskTitle,
    dialogTitle: dialog.dialogTitle,
    filteredProjectGroups: search.filteredProjectGroups,
    formatUpdatedLabel,
    handleSearchComplete: search.handleSearchComplete,
    isDeletingTaskId,
    isDialogOpen: dialog.isDialogOpen,
    isLoadingProjects: data.isLoadingProjects,
    isLoadingTasks: data.isLoadingTasks,
    isSavingDialog,
    lastMutationErrorMessage,
    openCreateDialog: dialog.openCreateDialog,
    openEditDialog: dialog.openEditDialog,
    pageState,
    requestDeleteTask,
    requestErrorMessage: data.requestErrorMessage,
    retryLoadPage,
    saveDialog,
    searchSuggestions: search.searchSuggestions,
    selectedSearchValue: search.selectedSearchValue,
    setDialogProjectId: dialog.setDialogProjectId,
    setDialogTaskStatus: dialog.setDialogTaskStatus,
    setDialogTaskTitle: dialog.setDialogTaskTitle,
    setSearchValue: search.setSearchValue,
    taskLoadErrors: data.taskLoadErrors,
    visibleProjects: data.visibleProjects,
  };
}
