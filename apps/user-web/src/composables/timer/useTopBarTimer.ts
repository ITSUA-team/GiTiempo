import { createAppToast, getErrorMessage, type ToastLike } from "@gitiempo/web-shared";
import { computed, shallowRef, watch } from "vue";
import { useToast } from "primevue/usetoast";

import { useUpdateTimeEntryMutation } from "@/composables/query";
import { createDefaultTimeEntriesClient } from "@/config/clients";
import { getUserServerStateScope } from "@/lib/server-state-scope";
import { isRunningTimer } from "@/lib/top-bar-timer-helpers";
import type { TimeEntriesClient } from "@/services/time-entries-client";
import { useAuthStore } from "@/stores/auth";

import { useElapsedTimerTicker } from "./useElapsedTimerTicker";
import { useTopBarTaskCreation } from "./useTopBarTaskCreation";
import { useTopBarTaskOptions } from "./useTopBarTaskOptions";
import { useTopBarTaskPicker } from "./useTopBarTaskPicker";
import { useTopBarTimerActions } from "./useTopBarTimerActions";
import { useTopBarTimerSummary } from "./useTopBarTimerSummary";

interface UseTopBarTimerOptions {
  authStore?: ReturnType<typeof useAuthStore>;
  clearIntervalFn?: typeof clearInterval;
  client?: TimeEntriesClient;
  now?: () => number;
  setIntervalFn?: typeof setInterval;
  toast?: ToastLike;
}

export function useTopBarTimer(options: UseTopBarTimerOptions = {}) {
  const authStore = options.authStore ?? useAuthStore();
  const client = options.client ?? createDefaultTimeEntriesClient();
  const toast = options.toast ?? useToast();
  const appToast = createAppToast(toast);
  const now = options.now ?? (() => Date.now());
  const setIntervalFn = options.setIntervalFn ?? setInterval;
  const clearIntervalFn = options.clearIntervalFn ?? clearInterval;
  const picker = useTopBarTaskPicker();
  const selectionUpdateErrorMessage = shallowRef<string | null>(null);
  const accessToken = computed(() => authStore.accessToken);
  const scope = computed(() => getUserServerStateScope(authStore.accessToken));
  const summary = useTopBarTimerSummary({ accessToken, client, scope, toast });
  const isTimerRunning = computed(() => isRunningTimer(summary.currentTimer.value));
  const updateTimeEntryMutation = useUpdateTimeEntryMutation({
    accessToken,
    client,
    scope,
  });
  const taskOptions = useTopBarTaskOptions({ accessToken, client, picker, scope });
  const taskCreation = useTopBarTaskCreation({
    accessToken,
    client,
    picker,
    scope,
    toast,
  });
  const timerActions = useTopBarTimerActions({
    accessToken,
    client,
    isTimerRunning,
    scope,
    summary,
    toast,
  });
  const runningStartedAt = computed(() =>
    isTimerRunning.value ? summary.currentTimer.value?.startedAt ?? null : null,
  );
  const { elapsedTimeLabel } = useElapsedTimerTicker({
    clearIntervalFn,
    now,
    runningStartedAt,
    setIntervalFn,
  });
  const timerStatusLabel = computed(() => {
    if (isTimerRunning.value) {
      return "Running timer";
    }

    if (summary.selectedContext.value) {
      return "Last tracked task";
    }

    return "No eligible task";
  });
  const timerContextLabel = computed(() => {
    if (summary.currentTimer.value) {
      return `${summary.currentTimer.value.project.name} / ${summary.currentTimer.value.task.title}`;
    }

    if (summary.selectedContext.value) {
      return `${summary.selectedContext.value.projectName} / ${summary.selectedContext.value.taskTitle}`;
    }

    return "Choose a visible project and task to start tracking time.";
  });
  const primaryActionLabel = computed(() =>
    isTimerRunning.value ? "Stop" : "Start",
  );
  const isPrimaryActionDisabled = computed(() => {
    if (timerActions.isPrimaryActionPending.value || summary.isLoadingSummary.value) {
      return true;
    }

    if (isTimerRunning.value) {
      return false;
    }

    return !summary.selectedContext.value || summary.summaryErrorMessage.value !== null;
  });
  const isConfirmSelectionDisabled = computed(
    () =>
      picker.isConfirmSelectionDisabled.value ||
      taskCreation.isCreatingTask.value ||
      updateTimeEntryMutation.isPending.value,
  );
  const isCreateTaskDisabled = computed(() => {
    return (
      !picker.selectedProjectId.value ||
      taskCreation.isCreatingTask.value ||
      picker.isCreateTaskTitleEmpty.value
    );
  });

  async function openDialog(): Promise<void> {
    selectionUpdateErrorMessage.value = null;
    picker.openTaskPicker(summary.getDialogSelectionFromCurrentState());

    try {
      await taskOptions.ensureProjectsLoaded();

      if (picker.selectedProjectId.value) {
        await taskOptions.loadTasksForProject(picker.selectedProjectId.value);
      } else {
        picker.setTasks([]);
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
    selectionUpdateErrorMessage.value = null;
    picker.closeDialog();
  }

  function setSelectedProjectId(projectId: string | null): void {
    selectionUpdateErrorMessage.value = null;
    const shouldClearSelectedTask = picker.selectedProjectId.value !== projectId;

    picker.setSelectedProjectId(projectId);

    if (shouldClearSelectedTask) {
      picker.setSelectedTaskId(null);
    }
  }

  function setSelectedTaskId(taskId: string | null): void {
    selectionUpdateErrorMessage.value = null;
    picker.setSelectedTaskId(taskId);
  }

  async function confirmSelectedTask(): Promise<void> {
    const context = picker.getSelectedTaskContext();

    if (!context) {
      return;
    }

    selectionUpdateErrorMessage.value = null;

    if (summary.currentTimer.value) {
      if (summary.currentTimer.value.task.id === context.taskId) {
        closeDialog();
        return;
      }

      try {
        const updatedTimer = await updateTimeEntryMutation.mutateAsync({
          entryId: summary.currentTimer.value.id,
          input: { taskId: context.taskId },
        });

        summary.currentTimer.value = updatedTimer;
        summary.setSelectedContextFromTimer(updatedTimer);
        closeDialog();
        appToast.showSuccessToast(
          "Timer task updated",
          "The running timer now tracks the selected task.",
        );
      } catch (error) {
        const message = getErrorMessage(error);

        selectionUpdateErrorMessage.value = message;
        appToast.showErrorToast({
          detail: "Please try again.",
          error,
          logContext: { action: "update-running-timer-task", feature: "top-bar-timer" },
          summary: "Could not update the timer task",
        });
        await summary.refreshSummaryAfterConflict(message);
      }

      return;
    }

    summary.selectedContext.value = context;
    closeDialog();
  }

  watch(
    picker.selectedProjectId,
    async (nextProjectId) => {
      if (!picker.isDialogOpen.value) {
        return;
      }

      if (!nextProjectId) {
        picker.setTasks([]);
        picker.setTasksError(null);
        picker.setSelectedTaskId(null);
        return;
      }

      try {
        await taskOptions.loadTasksForProject(nextProjectId);
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

  return {
    closeDialog,
    confirmSelectedTask,
    createTaskErrorMessage: picker.createTaskErrorMessage,
    createTaskFromDialog: taskCreation.createTaskFromDialog,
    createTaskTitle: picker.createTaskTitle,
    currentTimer: summary.currentTimer,
    elapsedTimeLabel,
    handlePrimaryAction: timerActions.handlePrimaryAction,
    isConfirmSelectionDisabled,
    isConfirmingSelection: updateTimeEntryMutation.isPending,
    isCreateTaskDisabled,
    isCreatingTask: taskCreation.isCreatingTask,
    isDialogOpen: picker.isDialogOpen,
    isLoadingProjects: taskOptions.isLoadingProjects,
    isLoadingSummary: summary.isLoadingSummary,
    isLoadingTasks: taskOptions.isLoadingTasks,
    isPrimaryActionDisabled,
    isPrimaryActionPending: timerActions.isPrimaryActionPending,
    isTimerRunning,
    openDialog,
    primaryActionLabel,
    projectsErrorMessage: picker.projectsErrorMessage,
    projectOptions: picker.activeProjects,
    refreshSummary: summary.refreshSummary,
    selectedContext: summary.selectedContext,
    selectedProjectId: picker.selectedProjectId,
    selectedProject: picker.selectedProject,
    selectedTask: picker.selectedTask,
    selectedTaskId: picker.selectedTaskId,
    selectionUpdateErrorMessage,
    setCreateTaskTitle: picker.setCreateTaskTitle,
    setSelectedProjectId,
    setSelectedTaskId,
    summaryErrorMessage: summary.summaryErrorMessage,
    taskOptions: picker.activeTasks,
    tasksErrorMessage: picker.tasksErrorMessage,
    timerActionErrorMessage: timerActions.timerActionErrorMessage,
    timerContextLabel,
    timerStatusLabel,
  };
}
