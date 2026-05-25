import { type ProjectResponse, type TaskResponse } from "@gitiempo/shared";
import {
  createAppConfirm,
  createAppToast,
  getErrorMessage,
  type ConfirmLike,
  type ToastLike,
} from "@gitiempo/web-shared";
import {
  useCreateTaskMutation,
  useDeleteTaskMutation,
  useProjectTasksQuery,
  useUpdateTaskMutation,
  useVisibleProjectsQuery,
} from "@gitiempo/web-shared/query";
import { computed, nextTick, onMounted, ref, shallowRef } from "vue";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";

import {
  createTimeEntriesClient,
  type TimeEntriesClient,
} from "@/services/time-entries-client";
import { useProjectTaskDialog } from "@/composables/projects/useProjectTaskDialog";
import { useProjectsSearch } from "@/composables/projects/useProjectsSearch";
import {
  formatUpdatedLabel,
  sortProjectTasks,
} from "@/lib/projects-page-helpers";
import { useAuthStore } from "@/stores/auth";

export type {
  ProjectsPageTaskGroup,
  ProjectsSearchSuggestion,
} from "@/lib/projects-page-helpers";

type PageState = "empty" | "loading" | "ready" | "request-error";

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

  const projects = ref<ProjectResponse[]>([]);
  const tasksByProjectId = ref<Record<string, TaskResponse[]>>({});
  const taskLoadErrors = ref<Record<string, string>>({});

  const isLoadingProjects = shallowRef(true);
  const isLoadingTasks = shallowRef(false);
  const isSavingDialog = shallowRef(false);
  const isDeletingTaskId = shallowRef<string | null>(null);

  const requestErrorMessage = shallowRef<string | null>(null);
  const lastMutationErrorMessage = shallowRef<string | null>(null);
  const projectTasksProjectId = shallowRef<string | null>(null);
  const visibleProjectsQuery = useVisibleProjectsQuery({
    accessToken: computed(() => authStore.accessToken),
    client,
    enabled: false,
  });
  const projectTasksQuery = useProjectTasksQuery({
    accessToken: computed(() => authStore.accessToken),
    client,
    enabled: false,
    projectId: projectTasksProjectId,
  });
  const createTaskMutation = useCreateTaskMutation({
    accessToken: computed(() => authStore.accessToken),
    client,
  });
  const updateTaskMutation = useUpdateTaskMutation({
    accessToken: computed(() => authStore.accessToken),
    client,
  });
  const deleteTaskMutation = useDeleteTaskMutation({
    accessToken: computed(() => authStore.accessToken),
    client,
  });

  const visibleProjects = computed(() =>
    projects.value.filter((project) => project.isActive),
  );
  const projectsSearch = useProjectsSearch({
    projects: visibleProjects,
    tasksByProjectId,
  });
  const {
    filteredProjectGroups,
    handleSearchComplete,
    searchSuggestions,
    selectedSearchValue,
    setSearchValue,
  } = projectsSearch;
  const projectTaskDialog = useProjectTaskDialog();
  const {
    closeDialog,
    dialogErrors,
    dialogMode,
    dialogProjectId,
    dialogRequestErrorMessage,
    dialogSaveLabel,
    dialogSubtitle,
    dialogTaskStatus,
    dialogTaskTitle,
    dialogTitle,
    editingTask,
    isDialogOpen,
    openCreateDialog,
    openEditDialog,
    setDialogProjectId,
    setDialogRequestError,
    setDialogTaskStatus,
    setDialogTaskTitle,
    validateDialog,
  } = projectTaskDialog;
  const pageState = computed<PageState>(() => {
    if (isLoadingProjects.value || isLoadingTasks.value) {
      return "loading";
    }

    if (requestErrorMessage.value) {
      return "request-error";
    }

    if (filteredProjectGroups.value.length === 0) {
      return "empty";
    }

    return "ready";
  });
  const canCreateTasks = computed(
    () =>
      visibleProjects.value.length > 0 &&
      !isLoadingProjects.value &&
      !isLoadingTasks.value,
  );

  async function loadVisibleProjects(): Promise<ProjectResponse[]> {
    isLoadingProjects.value = true;

    try {
      const result = await visibleProjectsQuery.refetch({ throwOnError: true });

      if (!result.data) {
        throw result.error ?? new Error("Could not load visible projects.");
      }

      projects.value = result.data;
      return visibleProjects.value;
    } catch (error) {
      projects.value = [];
      requestErrorMessage.value = getErrorMessage(error);
      appToast.showErrorToast({
        detail: "Please try again.",
        error,
        logContext: { action: "load-projects", feature: "projects-page" },
        summary: "Could not load visible projects",
      });
      throw error;
    } finally {
      isLoadingProjects.value = false;
    }
  }

  async function loadTasksForProjects(
    projectOptions: ProjectResponse[],
  ): Promise<void> {
    isLoadingTasks.value = true;
    tasksByProjectId.value = {};
    taskLoadErrors.value = {};

    try {
      const nextTasksByProjectId: Record<string, TaskResponse[]> = {};
      const nextTaskErrors: Record<string, string> = {};

      for (const project of projectOptions) {
        try {
          projectTasksProjectId.value = project.id;
          await nextTick();

          const result = await projectTasksQuery.refetch({ throwOnError: true });

          if (!result.data) {
            throw result.error ?? new Error("Could not load project tasks.");
          }

          const nextTasks = result.data;

          nextTasksByProjectId[project.id] = sortProjectTasks(
            nextTasks.filter((task) => task.isActive),
          );
        } catch (error) {
          nextTaskErrors[project.id] = getErrorMessage(error);
        }
      }

      tasksByProjectId.value = nextTasksByProjectId;
      taskLoadErrors.value = nextTaskErrors;

      const firstTaskError = Object.values(nextTaskErrors)[0] ?? null;

      if (firstTaskError) {
        requestErrorMessage.value = firstTaskError;
        appToast.showErrorToast({
          detail: "Please try again.",
          error: new Error(firstTaskError),
          logContext: { action: "load-project-tasks", feature: "projects-page" },
          summary: "Could not load project tasks",
        });
      }
    } finally {
      isLoadingTasks.value = false;
    }
  }

  async function loadPage(): Promise<void> {
    requestErrorMessage.value = null;

    let nextProjects: ProjectResponse[] = [];

    try {
      nextProjects = await loadVisibleProjects();
    } catch {
      tasksByProjectId.value = {};
      taskLoadErrors.value = {};
      return;
    }

    if (nextProjects.length === 0) {
      tasksByProjectId.value = {};
      taskLoadErrors.value = {};
      return;
    }

    await loadTasksForProjects(nextProjects);
  }

  function upsertTask(task: TaskResponse): void {
    tasksByProjectId.value = {
      ...tasksByProjectId.value,
      [task.projectId]: sortProjectTasks([
        ...(tasksByProjectId.value[task.projectId] ?? []).filter(
          (currentTask) => currentTask.id !== task.id,
        ),
        task,
      ]),
    };
  }

  function removeTask(task: TaskResponse): void {
    tasksByProjectId.value = {
      ...tasksByProjectId.value,
      [task.projectId]: (tasksByProjectId.value[task.projectId] ?? []).filter(
        (currentTask) => currentTask.id !== task.id,
      ),
    };
  }

  async function saveDialog(): Promise<void> {
    const validInput = validateDialog();

    if (!validInput) {
      return;
    }

    isSavingDialog.value = true;
    setDialogRequestError(null);
    lastMutationErrorMessage.value = null;

    try {
      if (validInput.mode === "edit") {
        if (!editingTask.value) {
          throw new Error("The selected task could not be found.");
        }

        const updatedTask = await updateTaskMutation.mutateAsync({
          input: validInput.input,
          projectId: validInput.projectId,
          taskId: editingTask.value.id,
        });

        upsertTask(updatedTask);
        appToast.showSuccessToast(
          "Task updated",
          "Your changes have been saved.",
        );
      } else {
        const createdTask = await createTaskMutation.mutateAsync({
          input: validInput.input,
          projectId: validInput.projectId,
        });

        upsertTask(createdTask);
        appToast.showSuccessToast(
          "Task created",
          "The new task has been added.",
        );
      }

      closeDialog();
    } catch (error) {
      const message = getErrorMessage(error);

      setDialogRequestError(message);
      lastMutationErrorMessage.value = message;
      appToast.showErrorToast({
        detail: "Please review the dialog values and try again.",
        error,
        logContext: {
          action: dialogMode.value === "edit" ? "update-task" : "create-task",
          feature: "projects-page",
        },
        summary:
          dialogMode.value === "edit"
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
      await deleteTaskMutation.mutateAsync({
        projectId: task.projectId,
        taskId: task.id,
      });
      removeTask(task);
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
    await loadPage();
  }

  onMounted(() => {
    void loadPage();
  });

  return {
    canCreateTasks,
    closeDialog,
    dialogErrors,
    dialogMode,
    dialogProjectId,
    dialogRequestErrorMessage,
    dialogSaveLabel,
    dialogSubtitle,
    dialogTaskStatus,
    dialogTaskTitle,
    dialogTitle,
    filteredProjectGroups,
    formatUpdatedLabel,
    handleSearchComplete,
    isDeletingTaskId,
    isDialogOpen,
    isLoadingProjects,
    isLoadingTasks,
    isSavingDialog,
    lastMutationErrorMessage,
    openCreateDialog,
    openEditDialog,
    pageState,
    requestDeleteTask,
    requestErrorMessage,
    retryLoadPage,
    saveDialog,
    searchSuggestions,
    selectedSearchValue,
    setDialogProjectId,
    setDialogTaskStatus,
    setDialogTaskTitle,
    setSearchValue,
    taskLoadErrors,
    visibleProjects,
  };
}
