import { createTaskSchema, type ProjectResponse, type TaskResponse, type TimeEntryResponse } from "@gitiempo/shared";
import { createAppToast, getErrorMessage, type ToastLike } from "@gitiempo/web-shared";
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { useToast } from "primevue/usetoast";

import {
  createTimeEntriesClient,
  type TimeEntriesClient,
} from "@/services/time-entries-client";
import { useAuthStore } from "@/stores/auth";
import { publishTimeEntryTimerSyncEvent } from "@/composables/timeEntryTimerSync";

interface SelectedTaskContext {
  projectId: string;
  projectName: string;
  taskId: string;
  taskTitle: string;
}

interface UseTopBarTimerOptions {
  authStore?: ReturnType<typeof useAuthStore>;
  clearIntervalFn?: typeof clearInterval;
  client?: TimeEntriesClient;
  now?: () => number;
  setIntervalFn?: typeof setInterval;
  toast?: ToastLike;
}

const defaultClient = createTimeEntriesClient({
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
});

function formatElapsedTime(startedAt: string | null, nowMs: number): string {
  if (!startedAt) {
    return "00:00:00";
  }

  const elapsedSeconds = Math.max(
    0,
    Math.floor((nowMs - new Date(startedAt).getTime()) / 1000),
  );
  const hours = String(Math.floor(elapsedSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(elapsedSeconds % 60).padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
}

function isConflictErrorMessage(message: string): boolean {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("already running") ||
    normalized.includes("active timer") ||
    normalized.includes("overlap")
  );
}

function isRunningTimer(timer: TimeEntryResponse | null): boolean {
  return timer !== null && timer.endedAt === null;
}

export function useTopBarTimer(options: UseTopBarTimerOptions = {}) {
  const authStore = options.authStore ?? useAuthStore();
  const client = options.client ?? defaultClient;
  const toast = options.toast ?? useToast();
  const appToast = createAppToast(toast);
  const now = options.now ?? (() => Date.now());
  const setIntervalFn = options.setIntervalFn ?? setInterval;
  const clearIntervalFn = options.clearIntervalFn ?? clearInterval;

  const projects = ref<ProjectResponse[]>([]);
  const tasks = ref<TaskResponse[]>([]);
  const currentTimer = shallowRef<TimeEntryResponse | null>(null);
  const selectedContext = shallowRef<SelectedTaskContext | null>(null);

  const isDialogOpen = shallowRef(false);
  const selectedProjectId = shallowRef<string | null>(null);
  const selectedTaskId = shallowRef<string | null>(null);
  const createTaskTitle = shallowRef("");

  const isLoadingSummary = shallowRef(false);
  const isLoadingProjects = shallowRef(false);
  const isLoadingTasks = shallowRef(false);
  const isStartingTimer = shallowRef(false);
  const isStoppingTimer = shallowRef(false);
  const isCreatingTask = shallowRef(false);

  const summaryErrorMessage = shallowRef<string | null>(null);
  const projectsErrorMessage = shallowRef<string | null>(null);
  const tasksErrorMessage = shallowRef<string | null>(null);
  const timerActionErrorMessage = shallowRef<string | null>(null);
  const createTaskErrorMessage = shallowRef<string | null>(null);
  const tickNowMs = shallowRef(now());

  const taskCache = new Map<string, TaskResponse[]>();
  let intervalHandle: ReturnType<typeof setInterval> | null = null;
  let taskRequestId = 0;

  const isTimerRunning = computed(() => isRunningTimer(currentTimer.value));
  const activeProjects = computed(() => projects.value.filter((project) => project.isActive));
  const activeTasks = computed(() => tasks.value.filter((task) => task.isActive));
  const selectedProject = computed(
    () => activeProjects.value.find((project) => project.id === selectedProjectId.value) ?? null,
  );
  const selectedTask = computed(
    () => activeTasks.value.find((task) => task.id === selectedTaskId.value) ?? null,
  );
  const elapsedTimeLabel = computed(() =>
    formatElapsedTime(
      isTimerRunning.value ? currentTimer.value?.startedAt ?? null : null,
      tickNowMs.value,
    ),
  );
  const timerStatusLabel = computed(() => {
    if (isTimerRunning.value) {
      return "Running timer";
    }

    if (selectedContext.value) {
      return "Last tracked task";
    }

    return "No eligible task";
  });
  const timerContextLabel = computed(() => {
    if (currentTimer.value) {
      return `${currentTimer.value.project.name} / ${currentTimer.value.task.title}`;
    }

    if (selectedContext.value) {
      return `${selectedContext.value.projectName} / ${selectedContext.value.taskTitle}`;
    }

    return "Choose a visible project and task to start tracking time.";
  });
  const primaryActionLabel = computed(() =>
    isTimerRunning.value ? "Stop" : "Start",
  );
  const isPrimaryActionPending = computed(
    () => isStartingTimer.value || isStoppingTimer.value,
  );
  const isPrimaryActionDisabled = computed(() => {
    if (isPrimaryActionPending.value || isLoadingSummary.value) {
      return true;
    }

    if (isTimerRunning.value) {
      return false;
    }

    return !selectedContext.value || summaryErrorMessage.value !== null;
  });
  const isConfirmSelectionDisabled = computed(
    () => !selectedProjectId.value || !selectedTaskId.value || isCreatingTask.value,
  );
  const isCreateTaskDisabled = computed(() => {
    return !selectedProjectId.value || isCreatingTask.value || createTaskTitle.value.trim().length === 0;
  });

  function requireAccessToken(): string {
    if (!authStore.accessToken) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    return authStore.accessToken;
  }

  function setSelectedContextFromTimer(timer: TimeEntryResponse): void {
    selectedContext.value = {
      projectId: timer.project.id,
      projectName: timer.project.name,
      taskId: timer.task.id,
      taskTitle: timer.task.title,
    };
  }

  function setDialogSelectionFromCurrentState(): void {
    const context = currentTimer.value
      ? {
          projectId: currentTimer.value.project.id,
          taskId: currentTimer.value.task.id,
        }
      : selectedContext.value
        ? {
            projectId: selectedContext.value.projectId,
            taskId: selectedContext.value.taskId,
          }
        : null;

    selectedProjectId.value = context?.projectId ?? null;
    selectedTaskId.value = context?.taskId ?? null;
  }

  async function ensureProjectsLoaded(accessToken: string): Promise<ProjectResponse[]> {
    if (projects.value.length > 0) {
      return projects.value;
    }

    isLoadingProjects.value = true;
    projectsErrorMessage.value = null;

    try {
      projects.value = await client.listVisibleProjects(accessToken);
      return projects.value;
    } catch (error) {
      const message = getErrorMessage(error);

      projectsErrorMessage.value = message;
      throw error;
    } finally {
      isLoadingProjects.value = false;
    }
  }

  async function loadTasksForProject(projectId: string): Promise<TaskResponse[]> {
    const accessToken = requireAccessToken();
    const requestId = ++taskRequestId;

    isLoadingTasks.value = true;
    tasksErrorMessage.value = null;

    try {
      const cachedTasks = taskCache.get(projectId);

      if (cachedTasks) {
        tasks.value = cachedTasks;
        return cachedTasks;
      }

      const nextTasks = await client.listProjectTasks(accessToken, projectId);

      if (requestId !== taskRequestId) {
        return tasks.value;
      }

      taskCache.set(projectId, nextTasks);
      tasks.value = nextTasks;
      return nextTasks;
    } catch (error) {
      if (requestId === taskRequestId) {
        tasks.value = [];
        tasksErrorMessage.value = getErrorMessage(error);
      }

      throw error;
    } finally {
      if (requestId === taskRequestId) {
        isLoadingTasks.value = false;
      }
    }
  }

  async function resolveEligibleLastTrackedContext(accessToken: string): Promise<SelectedTaskContext | null> {
    const visibleProjects = await ensureProjectsLoaded(accessToken);
    const activeProjectMap = new Map(
      visibleProjects.filter((project) => project.isActive).map((project) => [project.id, project]),
    );

    if (activeProjectMap.size === 0) {
      return null;
    }

    for (let page = 1; page <= 3; page += 1) {
      const response = await client.listOwnEntries(accessToken, { limit: 10, page });

      for (const entry of response.items) {
        const project = activeProjectMap.get(entry.project.id);

        if (!project) {
          continue;
        }

        const projectTasks = taskCache.get(project.id) ?? (await loadTasksForProject(project.id));
        const task = projectTasks.find(
          (candidate) => candidate.id === entry.task.id && candidate.isActive,
        );

        if (!task) {
          continue;
        }

        return {
          projectId: project.id,
          projectName: project.name,
          taskId: task.id,
          taskTitle: task.title,
        };
      }

      if (page >= response.meta.totalPages) {
        break;
      }
    }

    return null;
  }

  async function refreshSummary(): Promise<void> {
    isLoadingSummary.value = true;
    summaryErrorMessage.value = null;

    try {
      const accessToken = requireAccessToken();
      const { timeEntry } = await client.getCurrentTimer(accessToken);

      currentTimer.value = timeEntry;

      if (timeEntry) {
        setSelectedContextFromTimer(timeEntry);
        return;
      }

      selectedContext.value = await resolveEligibleLastTrackedContext(accessToken);
    } catch (error) {
      summaryErrorMessage.value = getErrorMessage(error);
      currentTimer.value = null;
      selectedContext.value = null;
      appToast.showErrorToast({
        detail: "Refresh and try again.",
        error,
        logContext: { action: "load-top-bar-timer", feature: "top-bar-timer" },
        summary: "Could not load the timer summary",
      });
    } finally {
      isLoadingSummary.value = false;
    }
  }

  async function refreshSummaryAfterConflict(message: string): Promise<void> {
    if (!isConflictErrorMessage(message)) {
      return;
    }

    await refreshSummary();
  }

  async function openDialog(): Promise<void> {
    isDialogOpen.value = true;
    createTaskErrorMessage.value = null;
    projectsErrorMessage.value = null;
    tasksErrorMessage.value = null;
    setDialogSelectionFromCurrentState();

    try {
      await ensureProjectsLoaded(requireAccessToken());

      if (selectedProjectId.value) {
        await loadTasksForProject(selectedProjectId.value);
      } else {
        tasks.value = [];
      }
    } catch (error) {
      appToast.showErrorToast({
        detail: "Refresh and try again.",
        error,
        logContext: { action: "open-task-picker", feature: "top-bar-timer" },
        summary: "Could not load timer task options",
      });
    }
  }

  function closeDialog(): void {
    isDialogOpen.value = false;
    createTaskTitle.value = "";
    createTaskErrorMessage.value = null;
  }

  function setSelectedProjectId(projectId: string | null): void {
    if (selectedProjectId.value === projectId) {
      return;
    }

    selectedProjectId.value = projectId;
  }

  function setSelectedTaskId(taskId: string | null): void {
    selectedTaskId.value = taskId;
  }

  function setCreateTaskTitle(title: string): void {
    createTaskTitle.value = title;
    createTaskErrorMessage.value = null;
  }

  function confirmSelectedTask(): void {
    if (!selectedProject.value || !selectedTask.value) {
      return;
    }

    selectedContext.value = {
      projectId: selectedProject.value.id,
      projectName: selectedProject.value.name,
      taskId: selectedTask.value.id,
      taskTitle: selectedTask.value.title,
    };
    closeDialog();
  }

  async function createTaskFromDialog(): Promise<void> {
    if (!selectedProjectId.value) {
      return;
    }

    const parsed = createTaskSchema.safeParse({ title: createTaskTitle.value.trim() });

    if (!parsed.success) {
      createTaskErrorMessage.value = parsed.error.issues[0]?.message ?? "Task title is invalid.";
      return;
    }

    createTaskErrorMessage.value = null;
    isCreatingTask.value = true;

    try {
      const task = await client.createTask(
        requireAccessToken(),
        selectedProjectId.value,
        parsed.data,
      );
      const cachedTasks = taskCache.get(selectedProjectId.value) ?? [];
      const nextTasks = [...cachedTasks, task];

      taskCache.set(selectedProjectId.value, nextTasks);
      tasks.value = nextTasks;
      selectedTaskId.value = task.id;
      createTaskTitle.value = "";
      appToast.showSuccessToast(
        "Task created",
        "The new task is ready to use for tracking time.",
      );
    } catch (error) {
      createTaskErrorMessage.value = getErrorMessage(error);
      appToast.showErrorToast({
        detail: "Please review the task title and try again.",
        error,
        logContext: { action: "create-task", feature: "top-bar-timer" },
        summary: "Could not create the task",
      });
    } finally {
      isCreatingTask.value = false;
    }
  }

  async function handlePrimaryAction(): Promise<void> {
    timerActionErrorMessage.value = null;

    if (isTimerRunning.value) {
      isStoppingTimer.value = true;

      try {
        const stoppedTimer = await client.stopTimer(requireAccessToken());

        currentTimer.value = null;
        setSelectedContextFromTimer(stoppedTimer);
        publishTimeEntryTimerSyncEvent({ entry: stoppedTimer, type: "stopped" });
        appToast.showSuccessToast("Timer stopped", "Your running timer has been stopped.");
      } catch (error) {
        timerActionErrorMessage.value = getErrorMessage(error);
        appToast.showErrorToast({
          detail: "Please try again.",
          error,
          logContext: { action: "stop-timer", feature: "top-bar-timer" },
          summary: "Could not stop the timer",
        });
      } finally {
        isStoppingTimer.value = false;
      }

      return;
    }

    if (!selectedContext.value) {
      return;
    }

    isStartingTimer.value = true;

    try {
      const startedTimer = await client.startTimer(
        requireAccessToken(),
        selectedContext.value.taskId,
      );
      currentTimer.value = startedTimer;
      setSelectedContextFromTimer(startedTimer);
      publishTimeEntryTimerSyncEvent({ entry: startedTimer, type: "started" });
      appToast.showSuccessToast("Timer started", "Your timer is now running.");
    } catch (error) {
      const message = getErrorMessage(error);

      timerActionErrorMessage.value = message;
      appToast.showErrorToast({
        detail: "Please try again.",
        error,
        logContext: { action: "start-timer", feature: "top-bar-timer" },
        summary: "Could not start the timer",
      });
      await refreshSummaryAfterConflict(message);
    } finally {
      isStartingTimer.value = false;
    }
  }

  watch(
    selectedProjectId,
    async (nextProjectId, previousProjectId) => {
      if (!isDialogOpen.value) {
        return;
      }

      if (!nextProjectId) {
        tasks.value = [];
        tasksErrorMessage.value = null;
        selectedTaskId.value = null;
        return;
      }

      if (nextProjectId !== previousProjectId) {
        selectedTaskId.value = null;
      }

      try {
        await loadTasksForProject(nextProjectId);
      } catch (error) {
        appToast.showErrorToast({
          detail: "Refresh and try again.",
          error,
          logContext: { action: "load-project-tasks", feature: "top-bar-timer" },
          summary: "Could not load tasks",
        });
      }
    },
  );

  onMounted(async () => {
    await refreshSummary();
  });

  watch(
    isTimerRunning,
    (running) => {
      if (intervalHandle) {
        clearIntervalFn(intervalHandle);
        intervalHandle = null;
      }

      tickNowMs.value = now();

      if (!running) {
        return;
      }

      intervalHandle = setIntervalFn(() => {
        tickNowMs.value = now();
      }, 1000);
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    if (intervalHandle) {
      clearIntervalFn(intervalHandle);
    }
  });

  return {
    closeDialog,
    confirmSelectedTask,
    createTaskErrorMessage,
    createTaskFromDialog,
    createTaskTitle,
    currentTimer,
    elapsedTimeLabel,
    handlePrimaryAction,
    isConfirmSelectionDisabled,
    isCreateTaskDisabled,
    isCreatingTask,
    isDialogOpen,
    isLoadingProjects,
    isLoadingSummary,
    isLoadingTasks,
    isPrimaryActionDisabled,
    isPrimaryActionPending,
    isTimerRunning,
    openDialog,
    primaryActionLabel,
    projectsErrorMessage,
    projectOptions: activeProjects,
    refreshSummary,
    selectedContext,
    selectedProjectId,
    selectedProject,
    selectedTask,
    selectedTaskId,
    setCreateTaskTitle,
    setSelectedProjectId,
    setSelectedTaskId,
    summaryErrorMessage,
    taskOptions: activeTasks,
    tasksErrorMessage,
    timerActionErrorMessage,
    timerContextLabel,
    timerStatusLabel,
  };
}
