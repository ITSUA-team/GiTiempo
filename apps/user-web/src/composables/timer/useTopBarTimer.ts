import {
  createAppToast,
  getErrorMessage,
  type ToastLike,
} from '@gitiempo/web-shared';
import { computed, ref, watch } from 'vue';
import { useToast } from 'primevue/usetoast';

import { useUpdateTimeEntryMutation } from '@/composables/query';
import {
  createDefaultGitHubClient,
  createDefaultTimeEntriesClient,
} from '@/config/clients';
import { getUserServerStateScope } from '@/lib/server-state-scope';
import { toGitHubIssueTimerTargetInput } from '@/lib/top-bar-task-picker-options';
import {
  isRunningTimer,
  TOP_BAR_TIMER_NEW_TASK_ID,
  type SelectedTaskContext,
} from '@/lib/top-bar-timer-helpers';
import type { GitHubClient } from '@/services/github-client';
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
  githubClient?: GitHubClient;
  now?: () => number;
  setIntervalFn?: typeof setInterval;
  toast?: ToastLike;
}

export function useTopBarTimer(options: UseTopBarTimerOptions = {}) {
  const authStore = options.authStore ?? useAuthStore();
  const client = options.client ?? createDefaultTimeEntriesClient();
  const githubClient = options.githubClient ?? createDefaultGitHubClient();
  const toast = options.toast ?? useToast();
  const appToast = createAppToast(toast);
  const now = options.now ?? (() => Date.now());
  const setIntervalFn = options.setIntervalFn ?? setInterval;
  const clearIntervalFn = options.clearIntervalFn ?? clearInterval;
  const picker = useTopBarTaskPicker();
  const selectionUpdateErrorMessage = ref<string | null>(null);
  const isMaterializingGitHubIssue = ref(false);
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
    githubClient,
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
  const timerProjectLabel = computed(() => {
    if (summary.currentTimer.value) {
      return summary.currentTimer.value.project.name;
    }

    if (summary.selectedContext.value) {
      return summary.selectedContext.value.projectName;
    }

    return timerStatusLabel.value;
  });
  const timerTaskLabel = computed(() => {
    if (summary.currentTimer.value) {
      return summary.currentTimer.value.task.title;
    }

    if (summary.selectedContext.value) {
      return summary.selectedContext.value.taskTitle;
    }

    return 'Choose a visible project and task.';
  });
  const timerGitHubIssue = computed(() => {
    if (summary.currentTimer.value) {
      return summary.currentTimer.value.githubIssue;
    }

    return summary.selectedContext.value?.githubIssue ?? null;
  });
  const primaryActionLabel = computed(() =>
    isTimerRunning.value ? 'Stop' : 'Start',
  );
  const isNewTaskSelected = computed(
    () =>
      picker.selectedTaskId.value === TOP_BAR_TIMER_NEW_TASK_ID &&
      picker.canCreateTaskInSelectedProject.value,
  );
  const isCreateTaskDisabled = computed(() => {
    return (
      !picker.selectedWorkspaceProject.value ||
      taskCreation.isCreatingTask.value ||
      picker.isCreateTaskTitleEmpty.value
    );
  });
  const hasSelectedTimerTarget = computed(
    () =>
      picker.getSelectedTaskContext() !== null ||
      picker.selectedGitHubIssueTask.value !== null,
  );
  const isConfirmSelectionDisabled = computed(() => {
    if (isNewTaskSelected.value) {
      return isCreateTaskDisabled.value || updateTimeEntryMutation.isPending.value;
    }

    return (
      picker.isConfirmSelectionDisabled.value ||
      taskCreation.isCreatingTask.value ||
      isMaterializingGitHubIssue.value ||
      updateTimeEntryMutation.isPending.value
    );
  });
  const isDialogPrimaryActionDisabled = computed(() => {
    if (
      timerActions.isPrimaryActionPending.value ||
      summary.isLoadingSummary.value ||
      isMaterializingGitHubIssue.value ||
      updateTimeEntryMutation.isPending.value
    ) {
      return true;
    }

    if (isTimerRunning.value) {
      return false;
    }

    if (isNewTaskSelected.value) {
      return (
        isCreateTaskDisabled.value ||
        summary.summaryErrorMessage.value !== null
      );
    }

    return (
      !hasSelectedTimerTarget.value ||
      summary.summaryErrorMessage.value !== null
    );
  });
  const isDialogSecondaryActionDisabled = computed(() => {
    if (!isTimerRunning.value) {
      return true;
    }

    return (
      isConfirmSelectionDisabled.value ||
      timerActions.isPrimaryActionPending.value ||
      isMaterializingGitHubIssue.value ||
      updateTimeEntryMutation.isPending.value
    );
  });
  const isConfirmingSelection = computed(
    () => updateTimeEntryMutation.isPending.value || isMaterializingGitHubIssue.value,
  );
  const isPrimaryActionPending = computed(
    () => timerActions.isPrimaryActionPending.value || isMaterializingGitHubIssue.value,
  );

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
    if (isNewTaskSelected.value) {
      await taskCreation.createTaskFromDialog();
      return;
    }

    const context = await resolveSelectedTaskContext();

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

  async function handleDialogPrimaryAction(): Promise<void> {
    if (updateTimeEntryMutation.isPending.value) {
      return;
    }

    selectionUpdateErrorMessage.value = null;

    if (!isTimerRunning.value) {
      if (isNewTaskSelected.value) {
        await taskCreation.createTaskFromDialog();
        return;
      }

      const context = await resolveSelectedTaskContext();

      if (!context) {
        return;
      }

      summary.setIdleSelection(context, picker.getNormalizedDescription());
    }

    const didMutateTimer = await timerActions.handlePrimaryAction();

    if (didMutateTimer) {
      closeDialog();
    }
  }

  async function startTimerFromDialog(): Promise<void> {
    if (isTimerRunning.value) {
      return;
    }

    await handleDialogPrimaryAction();
  }

  async function stopTimerFromDialog(): Promise<void> {
    if (!isTimerRunning.value) {
      return;
    }

    await handleDialogPrimaryAction();
  }

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

  async function resolveSelectedTaskContext(): Promise<SelectedTaskContext | null> {
    const localContext = picker.getSelectedTaskContext();

    if (localContext) {
      return localContext;
    }

    const githubIssueTask = picker.selectedGitHubIssueTask.value;

    if (!githubIssueTask) {
      return null;
    }

    selectionUpdateErrorMessage.value = null;
    isMaterializingGitHubIssue.value = true;

    try {
      const target = await client.materializeGitHubIssueTimerTarget(
        toGitHubIssueTimerTargetInput(githubIssueTask),
      );

      return {
        githubIssue: target.task.githubIssue,
        projectId: target.project.id,
        projectName: target.project.name,
        taskId: target.task.id,
        taskTitle: target.task.title,
      };
    } catch (error) {
      const message = getErrorMessage(error);

      selectionUpdateErrorMessage.value = message;
      appToast.showErrorToast({
        detail: 'Refresh GitHub issues and try again.',
        error,
        logContext: {
          action: 'materialize-github-issue-task',
          feature: 'top-bar-timer',
        },
        summary: 'Could not prepare the GitHub issue',
      });
      return null;
    } finally {
      isMaterializingGitHubIssue.value = false;
    }
  }

  return {
    closeDialog,
    confirmSelectedTask,
    createTaskErrorMessage: picker.createTaskErrorMessage,
    createTaskFromDialog: taskCreation.createTaskFromDialog,
    createTaskTitle: picker.createTaskTitle,
    currentTimer: summary.currentTimer,
    elapsedTimeLabel,
    handleDialogPrimaryAction,
    isConfirmSelectionDisabled,
    isConfirmingSelection,
    isCreateTaskDisabled,
    isCreatingTask: taskCreation.isCreatingTask,
    isDialogPrimaryActionDisabled,
    isDialogOpen: picker.isDialogOpen,
    isDialogSecondaryActionDisabled,
    isLoadingProjects: taskOptions.isLoadingProjects,
    isLoadingSummary: summary.isLoadingSummary,
    isLoadingTasks: taskOptions.isLoadingTasks,
    isMaterializingGitHubIssue,
    isPrimaryActionPending,
    isTimerRunning,
    openDialog,
    primaryActionLabel,
    githubSourcesErrorMessage: picker.githubSourcesErrorMessage,
    projectsErrorMessage: picker.projectsErrorMessage,
    projectOptions: picker.projectOptions,
    refreshSummary: summary.refreshSummary,
    selectedContext: summary.selectedContext,
    selectedDescription: picker.selectedDescription,
    selectedProject: picker.selectedProject,
    selectedProjectId: picker.selectedProjectId,
    selectedTask: picker.selectedTask,
    selectedTaskId: picker.selectedTaskId,
    selectionUpdateErrorMessage,
    setCreateTaskTitle: picker.setCreateTaskTitle,
    setSelectedDescription,
    setSelectedProjectId,
    setSelectedTaskId,
    startTimerFromDialog,
    stopTimerFromDialog,
    summaryErrorMessage: summary.summaryErrorMessage,
    taskOptions: picker.taskOptions,
    tasksErrorMessage: picker.tasksErrorMessage,
    timerActionErrorMessage: timerActions.timerActionErrorMessage,
    timerGitHubIssue,
    timerContextLabel,
    timerProjectLabel,
    timerStatusLabel,
    timerTaskLabel,
  };
}
