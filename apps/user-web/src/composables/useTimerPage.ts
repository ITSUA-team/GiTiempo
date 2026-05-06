import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
} from "vue";
import { createManualTimeEntrySchema, type TimeEntryResponse } from "@gitiempo/shared";
import {
  createAppToast,
  getErrorMessage,
  type ToastLike,
} from "@gitiempo/web-shared";
import { useToast } from "primevue/usetoast";

import {
  createTimerPageClient,
  type TimerPageClient,
} from "@/services/timer-page-client";
import { useAuthStore } from "@/stores/auth";

interface UseTimerPageOptions {
  authStore?: ReturnType<typeof useAuthStore>;
  clearIntervalFn?: typeof clearInterval;
  client?: TimerPageClient;
  now?: () => number;
  setIntervalFn?: typeof setInterval;
  toast?: ToastLike;
}

const defaultClient = createTimerPageClient({
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
});

function combineDateAndTime(date: Date, time: Date): Date {
  const next = new Date(date);

  next.setHours(
    time.getHours(),
    time.getMinutes(),
    time.getSeconds(),
    time.getMilliseconds(),
  );

  return next;
}

function formatElapsedTime(startedAt: string | null, nowMs: number): string {
  if (!startedAt) {
    return "00:00:00";
  }

  const elapsedSeconds = Math.max(
    0,
    Math.floor((nowMs - new Date(startedAt).getTime()) / 1000),
  );
  const hours = String(Math.floor(elapsedSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(
    2,
    "0",
  );
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

export function useTimerPage(options: UseTimerPageOptions = {}) {
  const authStore = options.authStore ?? useAuthStore();
  const client = options.client ?? defaultClient;
  const toast = options.toast ?? useToast();
  const appToast = createAppToast(toast);
  const now = options.now ?? (() => Date.now());
  const setIntervalFn = options.setIntervalFn ?? setInterval;
  const clearIntervalFn = options.clearIntervalFn ?? clearInterval;

  const projects = ref<Array<{ id: string; name: string }>>([]);
  const tasks = ref<Array<{ id: string; title: string }>>([]);
  const currentTimer = shallowRef<TimeEntryResponse | null>(null);

  const selectedProjectId = shallowRef<string | null>(null);
  const selectedTaskId = shallowRef<string | null>(null);
  const manualDate = shallowRef<Date | null>(null);
  const manualStartTime = shallowRef<Date | null>(null);
  const manualEndTime = shallowRef<Date | null>(null);

  const isLoadingProjects = shallowRef(false);
  const isLoadingTasks = shallowRef(false);
  const isLoadingCurrentTimer = shallowRef(false);
  const isStartingTimer = shallowRef(false);
  const isStoppingTimer = shallowRef(false);
  const isSubmittingManualEntry = shallowRef(false);

  const projectsErrorMessage = shallowRef<string | null>(null);
  const tasksErrorMessage = shallowRef<string | null>(null);
  const currentTimerErrorMessage = shallowRef<string | null>(null);
  const timerActionErrorMessage = shallowRef<string | null>(null);
  const manualEntryErrorMessage = shallowRef<string | null>(null);
  const tickNowMs = shallowRef(now());

  let intervalHandle: ReturnType<typeof setInterval> | null = null;
  let taskRequestId = 0;

  const isTimerRunning = computed(() => isRunningTimer(currentTimer.value));
  const activeProjectOption = computed(() => {
    if (!currentTimer.value) {
      return null;
    }

    return {
      id: currentTimer.value.project.id,
      name: currentTimer.value.project.name,
    };
  });
  const activeTaskOption = computed(() => {
    if (!currentTimer.value) {
      return null;
    }

    return {
      id: currentTimer.value.task.id,
      title: currentTimer.value.task.title,
    };
  });
  const projectOptions = computed(() => {
    const activeProject = activeProjectOption.value;

    if (!activeProject || projects.value.some((project) => project.id === activeProject.id)) {
      return projects.value;
    }

    return [activeProject, ...projects.value];
  });
  const taskOptions = computed(() => {
    const activeTask = activeTaskOption.value;

    if (!activeTask || tasks.value.some((task) => task.id === activeTask.id)) {
      return tasks.value;
    }

    return [activeTask, ...tasks.value];
  });
  const selectedProject = computed(
    () =>
      projectOptions.value.find((project) => project.id === selectedProjectId.value) ??
      null,
  );
  const selectedTask = computed(
    () => taskOptions.value.find((task) => task.id === selectedTaskId.value) ?? null,
  );
  const elapsedTimeLabel = computed(() =>
    formatElapsedTime(
      isTimerRunning.value ? currentTimer.value?.startedAt ?? null : null,
      tickNowMs.value,
    ),
  );
  const primaryActionLabel = computed(() =>
    isTimerRunning.value ? "Stop" : "Start",
  );
  const timerStatusLabel = computed(() =>
    isTimerRunning.value ? "Running timer" : "Ready to track time",
  );
  const timerContextLabel = computed(() => {
    const projectName = currentTimer.value?.project.name ?? selectedProject.value?.name;
    const taskTitle = currentTimer.value?.task.title ?? selectedTask.value?.title;

    if (projectName && taskTitle) {
      return `${projectName} / ${taskTitle}`;
    }

    return "Select a visible project and task to start tracking time.";
  });
  const hasProjects = computed(() => projectOptions.value.length > 0);
  const hasTasks = computed(() => taskOptions.value.length > 0);
  const isProjectSelectDisabled = computed(
    () => isTimerRunning.value || isLoadingProjects.value || !hasProjects.value,
  );
  const isTaskSelectDisabled = computed(
    () =>
      isTimerRunning.value ||
      !selectedProjectId.value ||
      isLoadingTasks.value ||
      !hasTasks.value,
  );
  const isPrimaryActionPending = computed(
    () => isStartingTimer.value || isStoppingTimer.value,
  );
  const isPrimaryActionDisabled = computed(() => {
    if (isPrimaryActionPending.value) {
      return true;
    }

    return !isTimerRunning.value && !selectedTaskId.value;
  });
  const isManualSubmitDisabled = computed(
    () => isSubmittingManualEntry.value || !selectedTaskId.value,
  );

  function requireAccessToken(): string {
    if (!authStore.accessToken) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    return authStore.accessToken;
  }

  function syncSelectionFromCurrentTimer(): void {
    if (!currentTimer.value || !isTimerRunning.value) {
      return;
    }

    selectedProjectId.value = currentTimer.value.project.id;
    selectedTaskId.value = currentTimer.value.task.id;
  }

  function clearManualInputs(): void {
    manualDate.value = null;
    manualStartTime.value = null;
    manualEndTime.value = null;
  }

  async function refreshCurrentTimer(): Promise<void> {
    isLoadingCurrentTimer.value = true;
    currentTimerErrorMessage.value = null;

    try {
      currentTimer.value = (await client.getCurrentTimer(requireAccessToken())).timeEntry;
      syncSelectionFromCurrentTimer();
    } catch (error) {
      const message = getErrorMessage(error);

      currentTimerErrorMessage.value = message;
      appToast.showErrorToast({
        detail: "Refresh and try again.",
        error,
        logContext: { action: "load-current-timer", feature: "timer-page" },
        summary: "Could not load the current timer",
      });
    } finally {
      isLoadingCurrentTimer.value = false;
    }
  }

  async function refreshCurrentTimerAfterConflict(message: string): Promise<void> {
    if (!isConflictErrorMessage(message)) {
      return;
    }

    await refreshCurrentTimer();
  }

  async function loadProjects(): Promise<void> {
    isLoadingProjects.value = true;
    projectsErrorMessage.value = null;

    try {
      projects.value = (await client.listVisibleProjects(requireAccessToken())).map(
        (project) => ({
          id: project.id,
          name: project.name,
        }),
      );
    } catch (error) {
      const message = getErrorMessage(error);

      projects.value = [];
      projectsErrorMessage.value = message;
      appToast.showErrorToast({
        detail: "Refresh and try again.",
        error,
        logContext: { action: "load-projects", feature: "timer-page" },
        summary: "Could not load projects",
      });
    } finally {
      isLoadingProjects.value = false;
    }
  }

  async function loadTasks(projectId: string): Promise<void> {
    const requestId = ++taskRequestId;

    isLoadingTasks.value = true;
    tasksErrorMessage.value = null;

    try {
      const nextTasks = (await client.listProjectTasks(requireAccessToken(), projectId)).map(
        (task) => ({
          id: task.id,
          title: task.title,
        }),
      );

      if (requestId !== taskRequestId) {
        return;
      }

      tasks.value = nextTasks;

      const selectedTaskStillVisible = nextTasks.some(
        (task) => task.id === selectedTaskId.value,
      );

      if (
        !selectedTaskStillVisible &&
        (!currentTimer.value || currentTimer.value.task.id !== selectedTaskId.value)
      ) {
        selectedTaskId.value = null;
      }
    } catch (error) {
      if (requestId !== taskRequestId) {
        return;
      }

      const message = getErrorMessage(error);

      tasks.value = [];
      tasksErrorMessage.value = message;
      appToast.showErrorToast({
        detail: "Refresh and try again.",
        error,
        logContext: { action: "load-tasks", feature: "timer-page" },
        summary: "Could not load tasks",
      });
    } finally {
      if (requestId === taskRequestId) {
        isLoadingTasks.value = false;
      }
    }
  }

  function setSelectedProjectId(projectId: string | null): void {
    if (isTimerRunning.value || selectedProjectId.value === projectId) {
      return;
    }

    selectedProjectId.value = projectId;
  }

  function setSelectedTaskId(taskId: string | null): void {
    if (isTimerRunning.value) {
      return;
    }

    selectedTaskId.value = taskId;
  }

  function buildManualEntryPayload() {
    if (!selectedTaskId.value) {
      throw new Error("Select a task before adding a manual entry.");
    }

    if (!manualDate.value || !manualStartTime.value || !manualEndTime.value) {
      throw new Error("Select a date, start time, and end time before saving.");
    }

    const result = createManualTimeEntrySchema.safeParse({
      endedAt: combineDateAndTime(manualDate.value, manualEndTime.value).toISOString(),
      startedAt: combineDateAndTime(
        manualDate.value,
        manualStartTime.value,
      ).toISOString(),
      taskId: selectedTaskId.value,
    });

    if (!result.success) {
      throw new Error(result.error.issues[0]?.message ?? "Manual entry is invalid.");
    }

    return result.data;
  }

  async function handlePrimaryAction(): Promise<void> {
    timerActionErrorMessage.value = null;

    if (isTimerRunning.value) {
      isStoppingTimer.value = true;

      try {
        await client.stopTimer(requireAccessToken());
        currentTimer.value = null;
        appToast.showSuccessToast(
          "Timer stopped",
          "Your running timer has been stopped.",
        );
        await refreshCurrentTimer();
      } catch (error) {
        const message = getErrorMessage(error);

        timerActionErrorMessage.value = message;
        appToast.showErrorToast({
          detail: "Please try again.",
          error,
          logContext: { action: "stop-timer", feature: "timer-page" },
          summary: "Could not stop the timer",
        });
      } finally {
        isStoppingTimer.value = false;
      }

      return;
    }

    if (!selectedTaskId.value) {
      return;
    }

    isStartingTimer.value = true;

    try {
      currentTimer.value = await client.startTimer(
        requireAccessToken(),
        selectedTaskId.value,
      );
      syncSelectionFromCurrentTimer();
      appToast.showSuccessToast("Timer started", "Your timer is now running.");
      await refreshCurrentTimer();
    } catch (error) {
      const message = getErrorMessage(error);

      timerActionErrorMessage.value = message;
      appToast.showErrorToast({
        detail: "Please try again.",
        error,
        logContext: { action: "start-timer", feature: "timer-page" },
        summary: "Could not start the timer",
      });
      await refreshCurrentTimerAfterConflict(message);
    } finally {
      isStartingTimer.value = false;
    }
  }

  async function submitManualEntry(): Promise<void> {
    manualEntryErrorMessage.value = null;
    isSubmittingManualEntry.value = true;

    try {
      await client.createManualEntry(requireAccessToken(), buildManualEntryPayload());
      clearManualInputs();
      appToast.showSuccessToast(
        "Manual entry added",
        "The completed time entry was saved.",
      );
      await refreshCurrentTimer();
    } catch (error) {
      const message = getErrorMessage(error);

      manualEntryErrorMessage.value = message;
      appToast.showErrorToast({
        detail: "Please review the entry and try again.",
        error,
        logContext: { action: "create-manual-entry", feature: "timer-page" },
        summary: "Could not add the manual entry",
      });
      await refreshCurrentTimerAfterConflict(message);
    } finally {
      isSubmittingManualEntry.value = false;
    }
  }

  watch(
    selectedProjectId,
    async (nextProjectId, previousProjectId) => {
      if (!nextProjectId) {
        tasks.value = [];
        tasksErrorMessage.value = null;
        if (!isTimerRunning.value) {
          selectedTaskId.value = null;
        }
        return;
      }

      if (!isTimerRunning.value && nextProjectId !== previousProjectId) {
        selectedTaskId.value = null;
      }

      await loadTasks(nextProjectId);
    },
  );

  onMounted(async () => {
    await Promise.all([loadProjects(), refreshCurrentTimer()]);
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
    currentTimer,
    currentTimerErrorMessage,
    elapsedTimeLabel,
    handlePrimaryAction,
    hasProjects,
    hasTasks,
    isLoadingCurrentTimer,
    isLoadingProjects,
    isLoadingTasks,
    isManualSubmitDisabled,
    isPrimaryActionDisabled,
    isPrimaryActionPending,
    isProjectSelectDisabled,
    isStartingTimer,
    isStoppingTimer,
    isSubmittingManualEntry,
    isTaskSelectDisabled,
    isTimerRunning,
    manualDate,
    manualEndTime,
    manualEntryErrorMessage,
    manualStartTime,
    primaryActionLabel,
    projectOptions,
    projectsErrorMessage,
    refreshCurrentTimer,
    selectedProjectId,
    selectedProject,
    selectedTaskId,
    selectedTask,
    setSelectedProjectId,
    setSelectedTaskId,
    submitManualEntry,
    taskOptions,
    tasksErrorMessage,
    timerActionErrorMessage,
    timerContextLabel,
    timerStatusLabel,
  };
}
