import {
  createAppToast,
  getErrorMessage,
  type ToastLike,
} from '@gitiempo/web-shared';
import { computed, ref, watch } from 'vue';
import { useToast } from 'primevue/usetoast';

import { useUpdateTimeEntryMutation } from '@/composables/query';
import { createDefaultTimeEntriesClient } from '@/config/clients';
import { getUserServerStateScope } from '@/lib/server-state-scope';
import { isRunningTimer } from '@/lib/top-bar-timer-helpers';
import type { TimeEntriesClient } from '@/services/time-entries-client';
import { useAuthStore } from '@/stores/auth';

import { useElapsedTimerTicker } from './useElapsedTimerTicker';
import { useTopBarTaskCreation } from './useTopBarTaskCreation';
import { useTopBarTaskOptions } from './useTopBarTaskOptions';
import { useTopBarTaskPicker } from './useTopBarTaskPicker';
import { useTopBarTimerActions } from './useTopBarTimerActions';
import { useTopBarTimerSummary } from './useTopBarTimerSummary';

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
  const selectionUpdateErrorMessage = ref<string | null>(null);
  const accessToken = computed(() => authStore.accessToken);
  const scope = computed(() => getUserServerStateScope(authStore.accessToken));
  const summary = useTopBarTimerSummary({ accessToken, client, scope, toast });
  const isTimerRunning = computed(() =>
    isRunningTimer(summary.currentTimer.value),
  );
  const updateTimeEntryMutation = useUpdateTimeEntryMutation({
    accessToken,
    client,
    scope,
  });
  const taskOptions = useTopBarTaskOptions({
    accessToken,
    client,
    picker,
    scope,
  });
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
    isTimerRunning.value
      ? (summary.currentTimer.value?.startedAt ?? null)
      : null,
  );
  const { elapsedTimeLabel } = useElapsedTimerTicker({
    clearIntervalFn,
    now,
    runningStartedAt,
    setIntervalFn,
  });
  const timerStatusLabel = computed(() => {
    if (isTimerRunning.value) {
      return 'Running timer';
    }

    if (summary.selectedContext.value) {
      return 'Last tracked task';
    }

    return 'No eligible task';
  });
  const timerContextLabel = computed(() => {
    if (summary.currentTimer.value) {
      return `${summary.currentTimer.value.project.name} / ${summary.currentTimer.value.task.title}`;
    }

    if (summary.selectedContext.value) {
      return `${summary.selectedContext.value.projectName} / ${summary.selectedContext.value.taskTitle}`;
    }

    return 'Choose a visible project and task to start tracking time.';
  });
  const primaryActionLabel = computed(() =>
    isTimerRunning.value ? 'Stop' : 'Start',
  );
  const isPrimaryActionDisabled = computed(() => {
    if (
      timerActions.isPrimaryActionPending.value ||
      summary.isLoadingSummary.value ||
      updateTimeEntryMutation.isPending.value
    ) {
      return true;
    }

    if (isTimerRunning.value) {
      return false;
    }

    return (
      !summary.selectedContext.value ||
      summary.summaryErrorMessage.value !== null
    );
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
    timerActions.clearTimerActionError();
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
        detail: 'Refresh and try again.',
        error,
        logContext: { action: 'open-task-picker', feature: 'top-bar-timer' },
        summary: 'Could not load timer task options',
      });
    }
  }

  function closeDialog(): void {
    selectionUpdateErrorMessage.value = null;
    timerActions.clearTimerActionError();
    picker.closeDialog();
  }

  function setSelectedProjectId(projectId: string | null): void {
    selectionUpdateErrorMessage.value = null;
    timerActions.clearTimerActionError();
    const shouldClearSelectedTask =
      picker.selectedProjectId.value !== projectId;

    picker.setSelectedProjectId(projectId);

    if (shouldClearSelectedTask) {
      picker.setSelectedTaskId(null);
    }
  }

  function setSelectedTaskId(taskId: string | null): void {
    selectionUpdateErrorMessage.value = null;
    timerActions.clearTimerActionError();
    picker.setSelectedTaskId(taskId);
  }

  function setSelectedDescription(description: string): void {
    selectionUpdateErrorMessage.value = null;
    timerActions.clearTimerActionError();
    picker.setSelectedDescription(description);
  }

  async function confirmSelectedTask(): Promise<void> {
    const context = picker.getSelectedTaskContext();

    if (!context) {
      return;
    }

    selectionUpdateErrorMessage.value = null;
    const description = picker.getNormalizedDescription();

    if (summary.currentTimer.value) {
      const currentTimerId = summary.currentTimer.value.id;
      const currentDescription = summary.currentTimer.value.description ?? null;

      if (
        summary.currentTimer.value.task.id === context.taskId &&
        currentDescription === description
      ) {
        closeDialog();
        return;
      }

      try {
        await updateTimeEntryMutation.mutateAsync({
          entryId: currentTimerId,
          input: {
            description,
            taskId: context.taskId,
          },
        });

        await summary.refreshSummary();
        picker.setSelectedDescription(summary.selectedDescription.value ?? '');
        closeDialog();
        appToast.showSuccessToast(
          'Timer updated',
          'Your running timer has been updated.',
        );
      } catch (error) {
        const message = getErrorMessage(error);

        selectionUpdateErrorMessage.value = message;
        appToast.showErrorToast({
          detail: 'Please try again.',
          error,
          logContext: {
            action: 'update-running-timer',
            feature: 'top-bar-timer',
          },
          summary: 'Could not update the timer',
        });

        await summary.refreshSummaryAfterConflict(error);
      }

      return;
    }

    summary.setIdleSelection(context, description);
    closeDialog();
  }

  async function handlePrimaryAction(): Promise<void> {
    if (updateTimeEntryMutation.isPending.value) {
      return;
    }

    await timerActions.handlePrimaryAction();
  }

  async function startTimerFromDialog(): Promise<void> {
    const context = picker.getSelectedTaskContext();

    if (!context || updateTimeEntryMutation.isPending.value) {
      return;
    }

    selectionUpdateErrorMessage.value = null;
    timerActions.clearTimerActionError();
    summary.setIdleSelection(context, picker.getNormalizedDescription());

    const didStartTimer = await timerActions.handlePrimaryAction();

    if (didStartTimer && summary.currentTimer.value) {
      closeDialog();
    }
  }

  async function stopTimerFromDialog(): Promise<void> {
    selectionUpdateErrorMessage.value = null;
    const didStopTimer = await timerActions.handlePrimaryAction();

    if (didStopTimer && !summary.currentTimer.value) {
      closeDialog();
    }
  }

  const isDialogPrimaryActionDisabled = computed(() => {
    if (isTimerRunning.value) {
      return (
        timerActions.isPrimaryActionPending.value ||
        updateTimeEntryMutation.isPending.value
      );
    }

    return (
      isConfirmSelectionDisabled.value ||
      timerActions.isPrimaryActionPending.value
    );
  });

  const isDialogSecondaryActionDisabled = computed(() => {
    if (!isTimerRunning.value) {
      return true;
    }

    return (
      isConfirmSelectionDisabled.value ||
      timerActions.isPrimaryActionPending.value ||
      updateTimeEntryMutation.isPending.value
    );
  });

  watch(picker.selectedProjectId, async (nextProjectId, previousProjectId) => {
    if (!picker.isDialogOpen.value) {
      return;
    }

    if (!nextProjectId) {
      picker.setTasks([]);
      picker.setTasksError(null);
      picker.setSelectedTaskId(null);
      return;
    }

    if (nextProjectId !== previousProjectId && previousProjectId !== null) {
      picker.setSelectedTaskId(null);
    }

    try {
      await taskOptions.loadTasksForProject(nextProjectId);
    } catch (error) {
      appToast.showErrorToast({
        detail: 'Refresh and try again.',
        error,
        logContext: { action: 'load-project-tasks', feature: 'top-bar-timer' },
        summary: 'Could not load tasks',
      });
    }
  });

  return {
    closeDialog,
    confirmSelectedTask,
    createTaskErrorMessage: picker.createTaskErrorMessage,
    createTaskFromDialog: taskCreation.createTaskFromDialog,
    createTaskTitle: picker.createTaskTitle,
    currentTimer: summary.currentTimer,
    isDialogPrimaryActionDisabled,
    isDialogSecondaryActionDisabled,
    elapsedTimeLabel,
    handlePrimaryAction,
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
    selectedDescription: picker.selectedDescription,
    setSelectedDescription,
    selectedProjectId: picker.selectedProjectId,
    selectedProject: picker.selectedProject,
    selectedTask: picker.selectedTask,
    selectedTaskId: picker.selectedTaskId,
    selectionUpdateErrorMessage,
    setCreateTaskTitle: picker.setCreateTaskTitle,
    setSelectedProjectId,
    setSelectedTaskId,
    startTimerFromDialog,
    stopTimerFromDialog,
    summaryErrorMessage: summary.summaryErrorMessage,
    taskOptions: picker.activeTasks,
    tasksErrorMessage: picker.tasksErrorMessage,
    timerActionErrorMessage: timerActions.timerActionErrorMessage,
    timerContextLabel,
    timerStatusLabel,
  };
}
