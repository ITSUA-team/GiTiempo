import {
  createTaskSchema,
  updateTaskSchema,
  type ProjectResponse,
  type TaskResponse,
  type TaskStatus,
} from "@gitiempo/shared";
import {
  createAppConfirm,
  createAppToast,
  getErrorMessage,
  type ConfirmLike,
  type ToastLike,
} from "@gitiempo/web-shared";
import { computed, onMounted, ref, shallowRef } from "vue";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";

import {
  createTimeEntriesClient,
  type TimeEntriesClient,
} from "@/services/time-entries-client";
import { useAuthStore } from "@/stores/auth";

type PageState = "empty" | "loading" | "ready" | "request-error";
type DialogMode = "create" | "edit" | null;

export interface ProjectsPageTaskGroup {
  project: ProjectResponse;
  tasks: TaskResponse[];
}

export interface ProjectsSearchSuggestion {
  id: string;
  kind: "project" | "task";
  label: string;
  projectId: string;
}

interface ProjectsDialogErrors {
  projectId: string | null;
  status: string | null;
  title: string | null;
}

interface UseProjectsPageOptions {
  authStore?: ReturnType<typeof useAuthStore>;
  client?: TimeEntriesClient;
  confirm?: ConfirmLike;
  toast?: ToastLike;
}

const defaultClient = createTimeEntriesClient({
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
});

function defaultDialogErrors(): ProjectsDialogErrors {
  return {
    projectId: null,
    status: null,
    title: null,
  };
}

function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase();
}

function sortTasks(tasks: TaskResponse[]): TaskResponse[] {
  return [...tasks].sort((left, right) => {
    const timeDiff =
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();

    if (timeDiff !== 0) {
      return timeDiff;
    }

    return left.title.localeCompare(right.title);
  });
}

function getUtcDateKey(isoDateTime: string): string {
  return isoDateTime.slice(0, 10);
}

function formatUtcTime(isoDateTime: string): string {
  const date = new Date(isoDateTime);

  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

function formatUpdatedLabel(isoDateTime: string): string {
  const dayKey = getUtcDateKey(isoDateTime);
  const now = new Date();
  const todayKey = getUtcDateKey(now.toISOString());
  const yesterday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1),
  );
  const yesterdayKey = getUtcDateKey(yesterday.toISOString());

  if (dayKey === todayKey) {
    return `Today, ${formatUtcTime(isoDateTime)}`;
  }

  if (dayKey === yesterdayKey) {
    return `Yesterday, ${formatUtcTime(isoDateTime)}`;
  }

  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
  }).format(new Date(isoDateTime));

  return `${weekday}, ${formatUtcTime(isoDateTime)}`;
}

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
  const dialogRequestErrorMessage = shallowRef<string | null>(null);
  const lastMutationErrorMessage = shallowRef<string | null>(null);

  const selectedSearchValue = shallowRef<ProjectsSearchSuggestion | string | null>(
    null,
  );
  const searchSuggestions = ref<ProjectsSearchSuggestion[]>([]);

  const dialogMode = shallowRef<DialogMode>(null);
  const editingTask = shallowRef<TaskResponse | null>(null);
  const dialogProjectId = shallowRef<string | null>(null);
  const dialogTaskTitle = shallowRef("");
  const dialogTaskStatus = shallowRef<TaskStatus>("open");
  const dialogErrors = ref<ProjectsDialogErrors>(defaultDialogErrors());

  function requireAccessToken(): string {
    if (!authStore.accessToken) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    return authStore.accessToken;
  }

  const visibleProjects = computed(() =>
    projects.value.filter((project) => project.isActive),
  );
  const searchText = computed(() => {
    if (typeof selectedSearchValue.value === "string") {
      return selectedSearchValue.value;
    }

    return selectedSearchValue.value?.label ?? "";
  });
  const allProjectGroups = computed<ProjectsPageTaskGroup[]>(() =>
    visibleProjects.value.map((project) => ({
      project,
      tasks: tasksByProjectId.value[project.id] ?? [],
    })),
  );
  const filteredProjectGroups = computed<ProjectsPageTaskGroup[]>(() => {
    const normalized = normalizeSearchValue(searchText.value);

    if (normalized.length === 0) {
      return allProjectGroups.value;
    }

    return allProjectGroups.value.flatMap((group) => {
      const projectMatch = group.project.name.toLowerCase().includes(normalized);

      if (projectMatch) {
        return [group];
      }

      const matchingTasks = group.tasks.filter((task) =>
        task.title.toLowerCase().includes(normalized),
      );

      return matchingTasks.length > 0
        ? [{ project: group.project, tasks: matchingTasks }]
        : [];
    });
  });
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
  const isDialogOpen = computed(() => dialogMode.value !== null);
  const dialogTitle = computed(() =>
    dialogMode.value === "edit" ? "Edit task" : "New task",
  );
  const dialogSubtitle = computed(() => {
    if (dialogMode.value === "edit") {
      return "Update the selected task using the shared popup layout.";
    }

    if (dialogProjectId.value) {
      return "Create a task in the selected visible project.";
    }

    return "Create a task in one of your visible projects.";
  });
  const dialogSaveLabel = computed(() =>
    dialogMode.value === "edit" ? "Save changes" : "Create task",
  );

  function clearDialogErrors(): void {
    dialogErrors.value = defaultDialogErrors();
    dialogRequestErrorMessage.value = null;
  }

  function resetDialogState(): void {
    dialogMode.value = null;
    editingTask.value = null;
    dialogProjectId.value = null;
    dialogTaskTitle.value = "";
    dialogTaskStatus.value = "open";
    clearDialogErrors();
  }

  function buildSearchSuggestions(query: string): ProjectsSearchSuggestion[] {
    const normalized = normalizeSearchValue(query);
    const suggestions: ProjectsSearchSuggestion[] = [];

    for (const group of allProjectGroups.value) {
      if (
        normalized.length === 0 ||
        group.project.name.toLowerCase().includes(normalized)
      ) {
        suggestions.push({
          id: `project:${group.project.id}`,
          kind: "project",
          label: group.project.name,
          projectId: group.project.id,
        });
      }

      for (const task of group.tasks) {
        if (
          normalized.length === 0 ||
          task.title.toLowerCase().includes(normalized)
        ) {
          suggestions.push({
            id: `task:${task.id}`,
            kind: "task",
            label: task.title,
            projectId: group.project.id,
          });
        }
      }
    }

    return suggestions.slice(0, 10);
  }

  async function loadVisibleProjects(): Promise<ProjectResponse[]> {
    isLoadingProjects.value = true;

    try {
      projects.value = await client.listVisibleProjects(requireAccessToken());
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
      const results = await Promise.allSettled(
        projectOptions.map(async (project) => {
          const nextTasks = sortTasks(
            (await client.listProjectTasks(requireAccessToken(), project.id)).filter(
              (task) => task.isActive,
            ),
          );

          return [project.id, nextTasks] as const;
        }),
      );
      const nextTasksByProjectId: Record<string, TaskResponse[]> = {};
      const nextTaskErrors: Record<string, string> = {};

      for (const [index, result] of results.entries()) {
        const project = projectOptions[index];

        if (!project) {
          continue;
        }

        if (result.status === "fulfilled") {
          nextTasksByProjectId[result.value[0]] = result.value[1];
          continue;
        }

        nextTaskErrors[project.id] = getErrorMessage(result.reason);
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
      [task.projectId]: sortTasks([
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

  function handleSearchComplete(query: string): void {
    searchSuggestions.value = buildSearchSuggestions(query);
  }

  function setSearchValue(value: ProjectsSearchSuggestion | string | null): void {
    selectedSearchValue.value = value ?? null;
  }

  function openCreateDialog(projectId: string | null = null): void {
    resetDialogState();
    dialogMode.value = "create";
    dialogProjectId.value = projectId;
  }

  function openEditDialog(task: TaskResponse): void {
    resetDialogState();
    dialogMode.value = "edit";
    editingTask.value = task;
    dialogProjectId.value = task.projectId;
    dialogTaskTitle.value = task.title;
    dialogTaskStatus.value = task.status;
  }

  function closeDialog(): void {
    resetDialogState();
  }

  function setDialogProjectId(value: string | null): void {
    dialogProjectId.value = value;
    dialogErrors.value.projectId = null;
    dialogRequestErrorMessage.value = null;
  }

  function setDialogTaskTitle(value: string): void {
    dialogTaskTitle.value = value;
    dialogErrors.value.title = null;
    dialogRequestErrorMessage.value = null;
  }

  function setDialogTaskStatus(value: TaskStatus): void {
    dialogTaskStatus.value = value;
    dialogErrors.value.status = null;
    dialogRequestErrorMessage.value = null;
  }

  function validateDialog():
    | {
        input: ReturnType<typeof createTaskSchema.parse>;
        mode: "create";
        projectId: string;
      }
    | {
        input: ReturnType<typeof updateTaskSchema.parse>;
        mode: "edit";
        projectId: string;
      }
    | null {
    const nextErrors = defaultDialogErrors();

    if (!dialogProjectId.value) {
      nextErrors.projectId = "Select a project.";
    }

    const trimmedTitle = dialogTaskTitle.value.trim();
    if (!dialogProjectId.value) {
      dialogErrors.value = nextErrors;
      return null;
    }

    if (dialogMode.value === "edit") {
      const parsed = updateTaskSchema.safeParse({
        status: dialogTaskStatus.value,
        title: trimmedTitle,
      });

      if (!parsed.success) {
        const fieldErrors = parsed.error.flatten().fieldErrors;

        dialogErrors.value = {
          projectId: nextErrors.projectId,
          status: fieldErrors.status?.[0] ?? null,
          title: fieldErrors.title?.[0] ?? null,
        };
        return null;
      }

      dialogErrors.value = nextErrors;

      return {
        input: parsed.data,
        mode: "edit",
        projectId: dialogProjectId.value,
      };
    }

    const parsed = createTaskSchema.safeParse({ title: trimmedTitle });

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;

      dialogErrors.value = {
        projectId: nextErrors.projectId,
        status: null,
        title: fieldErrors.title?.[0] ?? null,
      };
      return null;
    }

    dialogErrors.value = nextErrors;

    return {
      input: parsed.data,
      mode: "create",
      projectId: dialogProjectId.value,
    };
  }

  async function saveDialog(): Promise<void> {
    const validInput = validateDialog();

    if (!validInput) {
      return;
    }

    isSavingDialog.value = true;
    dialogRequestErrorMessage.value = null;
    lastMutationErrorMessage.value = null;

    try {
      if (validInput.mode === "edit") {
        if (!editingTask.value) {
          throw new Error("The selected task could not be found.");
        }

        const updatedTask = await client.updateTask(
          requireAccessToken(),
          editingTask.value.id,
          validInput.input,
        );

        upsertTask(updatedTask);
        appToast.showSuccessToast(
          "Task updated",
          "Your changes have been saved.",
        );
      } else {
        const createdTask = await client.createTask(
          requireAccessToken(),
          validInput.projectId,
          validInput.input,
        );

        upsertTask(createdTask);
        appToast.showSuccessToast(
          "Task created",
          "The new task has been added.",
        );
      }

      closeDialog();
    } catch (error) {
      const message = getErrorMessage(error);

      dialogRequestErrorMessage.value = message;
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
      await client.deleteTask(requireAccessToken(), task.id);
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
