import {
  createTaskSchema,
  type ProjectResponse,
  type TaskResponse,
  type TimeEntryListResponse,
  type TimeEntryResponse,
} from "@gitiempo/shared";
import { createAppToast, getErrorMessage, type ToastLike } from "@gitiempo/web-shared";
import {
  useCreateTaskMutation,
  useCurrentTimerQuery,
  useOwnTimeEntriesQuery,
  useProjectTasksQuery,
  useStartTimerMutation,
  useStopTimerMutation,
  useVisibleProjectsQuery,
} from "@gitiempo/web-shared/query";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { useToast } from "primevue/usetoast";

import {
  createTimeEntriesClient,
  type TimeEntriesClient,
} from "@/services/time-entries-client";
import {
  formatElapsedTime,
  isConflictErrorMessage,
  isRunningTimer,
  toSelectedTaskContext,
  type SelectedTaskContext,
} from "@/lib/top-bar-timer-helpers";
import { useAuthStore } from "@/stores/auth";

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

export function useTopBarTimer(options: UseTopBarTimerOptions = {}) {
  const authStore = options.authStore ?? useAuthStore();
  const client = options.client ?? defaultClient;
  const toast = options.toast ?? useToast();
  const appToast = createAppToast(toast);
  const now = options.now ?? (() => Date.now());
  const setIntervalFn = options.setIntervalFn ?? setInterval;
  const clearIntervalFn = options.clearIntervalFn ?? clearInterval;

  const currentTimer = shallowRef<TimeEntryResponse | null>(null);
  const selectedContext = shallowRef<SelectedTaskContext | null>(null);
  const projects = ref<ProjectResponse[]>([]);
  const tasks = ref<TaskResponse[]>([]);
  const taskCache = new Map<string, TaskResponse[]>();
  const isDialogOpen = shallowRef(false);
  const selectedProjectId = shallowRef<string | null>(null);
  const selectedTaskId = shallowRef<string | null>(null);
  const createTaskTitle = shallowRef("");
  const projectsErrorMessage = shallowRef<string | null>(null);
  const tasksErrorMessage = shallowRef<string | null>(null);
  const createTaskErrorMessage = shallowRef<string | null>(null);
  const activeProjects = computed(() => projects.value.filter((project) => project.isActive));
  const activeTasks = computed(() => tasks.value.filter((task) => task.isActive));
  const selectedProject = computed(
    () => activeProjects.value.find((project) => project.id === selectedProjectId.value) ?? null,
  );
  const selectedTask = computed(
    () => activeTasks.value.find((task) => task.id === selectedTaskId.value) ?? null,
  );

  const isLoadingSummary = shallowRef(false);
  const isLoadingProjects = shallowRef(false);
  const isLoadingTasks = shallowRef(false);

  const summaryErrorMessage = shallowRef<string | null>(null);
  const timerActionErrorMessage = shallowRef<string | null>(null);
  const eligibleEntryQuery = shallowRef({ limit: 10, page: 1 });
  const projectTasksProjectId = shallowRef<string | null>(null);

  let taskRequestId = 0;

  const currentTimerQuery = useCurrentTimerQuery({
    accessToken: computed(() => authStore.accessToken),
    client,
    enabled: false,
  });
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
  const eligibleEntriesQuery = useOwnTimeEntriesQuery({
    accessToken: computed(() => authStore.accessToken),
    client,
    enabled: false,
    query: eligibleEntryQuery,
  });
  const createTaskMutation = useCreateTaskMutation({
    accessToken: computed(() => authStore.accessToken),
    client,
  });
  const startTimerMutation = useStartTimerMutation({
    accessToken: computed(() => authStore.accessToken),
    client,
  });
  const stopTimerMutation = useStopTimerMutation({
    accessToken: computed(() => authStore.accessToken),
    client,
  });
  const isStartingTimer = computed(() => startTimerMutation.isPending.value);
  const isStoppingTimer = computed(() => stopTimerMutation.isPending.value);
  const isCreatingTask = computed(() => createTaskMutation.isPending.value);

  function setProjects(nextProjects: ProjectResponse[]): void {
    projects.value = nextProjects;
  }

  function setTasks(nextTasks: TaskResponse[]): void {
    tasks.value = nextTasks;
  }

  function getCachedTasks(projectId: string): TaskResponse[] | undefined {
    return taskCache.get(projectId);
  }

  function setCachedTasks(projectId: string, nextTasks: TaskResponse[]): void {
    taskCache.set(projectId, nextTasks);
  }

  function openTaskPicker(context: { projectId: string; taskId: string } | null): void {
    isDialogOpen.value = true;
    createTaskErrorMessage.value = null;
    projectsErrorMessage.value = null;
    tasksErrorMessage.value = null;
    selectedProjectId.value = context?.projectId ?? null;
    selectedTaskId.value = context?.taskId ?? null;
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

  function setProjectsError(message: string | null): void {
    projectsErrorMessage.value = message;
  }

  function setTasksError(message: string | null): void {
    tasksErrorMessage.value = message;
  }

  function setCreateTaskError(message: string | null): void {
    createTaskErrorMessage.value = message;
  }

  function validateCreateTaskInput() {
    const parsed = createTaskSchema.safeParse({ title: createTaskTitle.value.trim() });

    if (!parsed.success) {
      createTaskErrorMessage.value = parsed.error.issues[0]?.message ?? "Task title is invalid.";
      return null;
    }

    createTaskErrorMessage.value = null;
    return parsed.data;
  }

  function getSelectedTaskContext(): SelectedTaskContext | null {
    if (!selectedProject.value || !selectedTask.value) {
      return null;
    }

    return {
      projectId: selectedProject.value.id,
      projectName: selectedProject.value.name,
      taskId: selectedTask.value.id,
      taskTitle: selectedTask.value.title,
    };
  }

  const isTimerRunning = computed(() => isRunningTimer(currentTimer.value));
  const runningStartedAt = computed(() =>
    isTimerRunning.value ? currentTimer.value?.startedAt ?? null : null,
  );
  const tickNowMs = shallowRef(now());
  const elapsedTimeLabel = computed(() =>
    formatElapsedTime(runningStartedAt.value, tickNowMs.value),
  );
  let elapsedTimerIntervalHandle: ReturnType<typeof setInterval> | null = null;

  function stopElapsedTimerTicker(): void {
    if (!elapsedTimerIntervalHandle) {
      return;
    }

    clearIntervalFn(elapsedTimerIntervalHandle);
    elapsedTimerIntervalHandle = null;
  }

  watch(
    runningStartedAt,
    (startedAt) => {
      stopElapsedTimerTicker();
      tickNowMs.value = now();

      if (!startedAt) {
        return;
      }

      elapsedTimerIntervalHandle = setIntervalFn(() => {
        tickNowMs.value = now();
      }, 1000);
    },
    { immediate: true },
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
    return (
      !selectedProjectId.value ||
      isCreatingTask.value ||
      createTaskTitle.value.trim().length === 0
    );
  });

  function requireAccessToken(): string {
    if (!authStore.accessToken) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    return authStore.accessToken;
  }

  function setSelectedContextFromTimer(timer: TimeEntryResponse): void {
    selectedContext.value = toSelectedTaskContext(timer);
  }

  function getDialogSelectionFromCurrentState(): { projectId: string; taskId: string } | null {
    return currentTimer.value
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
  }

  async function ensureProjectsLoaded(): Promise<ProjectResponse[]> {
    if (projects.value.length > 0) {
      return projects.value;
    }

    isLoadingProjects.value = true;
    setProjectsError(null);

    try {
      const result = await visibleProjectsQuery.refetch({ throwOnError: true });

      if (!result.data) {
        throw result.error ?? new Error("Could not load visible projects.");
      }

      setProjects(result.data);
      return projects.value;
    } catch (error) {
      const message = getErrorMessage(error);

      setProjectsError(message);
      throw error;
    } finally {
      isLoadingProjects.value = false;
    }
  }

  async function loadTasksForProject(projectId: string): Promise<TaskResponse[]> {
    const requestId = ++taskRequestId;

    isLoadingTasks.value = true;
    setTasksError(null);

    try {
      const cachedTasks = getCachedTasks(projectId);

      if (cachedTasks) {
        setTasks(cachedTasks);
        return cachedTasks;
      }

      projectTasksProjectId.value = projectId;
      await nextTick();

      const result = await projectTasksQuery.refetch({ throwOnError: true });

      if (!result.data) {
        throw result.error ?? new Error("Could not load project tasks.");
      }

      const nextTasks = result.data;

      if (requestId !== taskRequestId) {
        return tasks.value;
      }

      setCachedTasks(projectId, nextTasks);
      setTasks(nextTasks);
      return nextTasks;
    } catch (error) {
      if (requestId === taskRequestId) {
        setTasks([]);
        setTasksError(getErrorMessage(error));
      }

      throw error;
    } finally {
      if (requestId === taskRequestId) {
        isLoadingTasks.value = false;
      }
    }
  }

  async function loadOwnEntriesPage(page: number): Promise<TimeEntryListResponse> {
    eligibleEntryQuery.value = { limit: 10, page };
    await nextTick();

    const result = await eligibleEntriesQuery.refetch({ throwOnError: true });

    if (!result.data) {
      throw result.error ?? new Error("Could not load recent time entries.");
    }

    return result.data;
  }

  async function loadEligibleLastTrackedContext(): Promise<SelectedTaskContext | null> {
    const visibleProjectsResult = await visibleProjectsQuery.refetch({ throwOnError: true });

    if (!visibleProjectsResult.data) {
      throw visibleProjectsResult.error ?? new Error("Could not load visible projects.");
    }

    const visibleProjectOptions = visibleProjectsResult.data;
    const activeProjectMap = new Map(
      visibleProjectOptions
        .filter((project) => project.isActive)
        .map((project) => [project.id, project]),
    );
    const taskCache = new Map<string, TaskResponse[]>();

    if (activeProjectMap.size === 0) {
      return null;
    }

    for (let page = 1; page <= 3; page += 1) {
      const response = await loadOwnEntriesPage(page);

      for (const entry of response.items) {
        const project = activeProjectMap.get(entry.project.id);

        if (!project) {
          continue;
        }

        let projectTasks = taskCache.get(project.id);

        if (!projectTasks) {
          projectTasksProjectId.value = project.id;
          await nextTick();
          const projectTasksResult = await projectTasksQuery.refetch({ throwOnError: true });

          if (!projectTasksResult.data) {
            throw projectTasksResult.error ?? new Error("Could not load project tasks.");
          }

          projectTasks = projectTasksResult.data;
          taskCache.set(project.id, projectTasks);
        }

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
      const currentTimerResult = await currentTimerQuery.refetch({ throwOnError: true });

      if (!currentTimerResult.data) {
        throw currentTimerResult.error ?? new Error("Could not load current timer.");
      }

      const { timeEntry } = currentTimerResult.data;

      currentTimer.value = timeEntry;

      if (timeEntry) {
        setSelectedContextFromTimer(timeEntry);
        return;
      }

      selectedContext.value = await loadEligibleLastTrackedContext();
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
    openTaskPicker(getDialogSelectionFromCurrentState());

    try {
      requireAccessToken();
      await ensureProjectsLoaded();

      if (selectedProjectId.value) {
        await loadTasksForProject(selectedProjectId.value);
      } else {
        setTasks([]);
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

  function confirmSelectedTask(): void {
    const context = getSelectedTaskContext();

    if (!context) {
      return;
    }

    selectedContext.value = context;
    closeDialog();
  }

  async function createTaskFromDialog(): Promise<void> {
    if (!selectedProjectId.value) {
      return;
    }

    const parsed = validateCreateTaskInput();

    if (!parsed) {
      return;
    }

    try {
      const task = await createTaskMutation.mutateAsync({
        input: parsed,
        projectId: selectedProjectId.value,
      });
      const cachedTasks = getCachedTasks(selectedProjectId.value) ?? [];
      const nextTasks = [...cachedTasks, task];

      setCachedTasks(selectedProjectId.value, nextTasks);
      setTasks(nextTasks);
      setSelectedTaskId(task.id);
      setCreateTaskTitle("");
      appToast.showSuccessToast(
        "Task created",
        "The new task is ready to use for tracking time.",
      );
    } catch (error) {
      setCreateTaskError(getErrorMessage(error));
      appToast.showErrorToast({
        detail: "Please review the task title and try again.",
        error,
        logContext: { action: "create-task", feature: "top-bar-timer" },
        summary: "Could not create the task",
      });
    }
  }

  async function handlePrimaryAction(): Promise<void> {
    timerActionErrorMessage.value = null;

    if (isTimerRunning.value) {
      try {
        const stoppedTimer = await stopTimerMutation.mutateAsync();

        currentTimer.value = null;
        setSelectedContextFromTimer(stoppedTimer);
        appToast.showSuccessToast("Timer stopped", "Your running timer has been stopped.");
      } catch (error) {
        timerActionErrorMessage.value = getErrorMessage(error);
        appToast.showErrorToast({
          detail: "Please try again.",
          error,
          logContext: { action: "stop-timer", feature: "top-bar-timer" },
          summary: "Could not stop the timer",
        });
      }

      return;
    }

    if (!selectedContext.value) {
      return;
    }

    try {
      currentTimer.value = await startTimerMutation.mutateAsync(selectedContext.value.taskId);
      if (currentTimer.value) {
        setSelectedContextFromTimer(currentTimer.value);
      }
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
    }
  }

  watch(
    selectedProjectId,
    async (nextProjectId, previousProjectId) => {
      if (!isDialogOpen.value) {
        return;
      }

      if (!nextProjectId) {
        setTasks([]);
        setTasksError(null);
        setSelectedTaskId(null);
        return;
      }

      if (nextProjectId !== previousProjectId) {
        setSelectedTaskId(null);
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

  onBeforeUnmount(stopElapsedTimerTicker);

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
