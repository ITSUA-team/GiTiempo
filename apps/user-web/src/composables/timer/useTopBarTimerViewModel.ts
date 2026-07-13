import { computed, type ComputedRef, type Ref } from 'vue';

import { TOP_BAR_TIMER_NEW_TASK_ID } from '@/lib/top-bar-timer-helpers';

import { useElapsedTimerTicker } from './useElapsedTimerTicker';
import type { useTopBarTaskCreation } from './useTopBarTaskCreation';
import type { TopBarTaskPicker } from './useTopBarTaskPicker';
import type { useTopBarTimerActions } from './useTopBarTimerActions';
import type { TopBarTimerSummary } from './useTopBarTimerSummary';

interface UseTopBarTimerViewModelOptions {
  clearIntervalFn: typeof clearInterval;
  isSelectionUpdatePending: Readonly<Ref<boolean>> | ComputedRef<boolean>;
  isTimerRunning: ComputedRef<boolean>;
  now: () => number;
  picker: TopBarTaskPicker;
  setIntervalFn: typeof setInterval;
  summary: TopBarTimerSummary;
  taskCreation: ReturnType<typeof useTopBarTaskCreation>;
  timerActions: ReturnType<typeof useTopBarTimerActions>;
}

export function useTopBarTimerViewModel({
  clearIntervalFn,
  isSelectionUpdatePending,
  isTimerRunning,
  now,
  picker,
  setIntervalFn,
  summary,
  taskCreation,
  timerActions,
}: UseTopBarTimerViewModelOptions) {
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
  const timerWorkspaceContextLabel = computed(() => {
    if (!summary.isCrossWorkspaceTimer.value) {
      return null;
    }

    const workspaceName = summary.currentTimerWorkspaceLabel.value;

    return workspaceName ? `Running in ${workspaceName}` : 'Running in another workspace';
  });
  const primaryActionLabel = computed(() =>
    isTimerRunning.value ? 'Stop' : 'Start',
  );
  const isNewTaskSelected = computed(
    () => picker.selectedTaskId.value === TOP_BAR_TIMER_NEW_TASK_ID,
  );
  const isCreateTaskDisabled = computed(() => {
    return (
      !picker.selectedProjectId.value ||
      taskCreation.isCreatingTask.value ||
      picker.isCreateTaskTitleEmpty.value
    );
  });
  const isConfirmSelectionDisabled = computed(() => {
    if (summary.isCrossWorkspaceTimer.value) {
      return true;
    }

    if (isNewTaskSelected.value) {
      return isCreateTaskDisabled.value || isSelectionUpdatePending.value;
    }

    return (
      picker.isConfirmSelectionDisabled.value ||
      taskCreation.isCreatingTask.value ||
      isSelectionUpdatePending.value
    );
  });
  const isDialogPrimaryActionDisabled = computed(() => {
    if (
      timerActions.isPrimaryActionPending.value ||
      summary.isLoadingSummary.value ||
      isSelectionUpdatePending.value
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
      picker.getSelectedTaskContext() === null ||
      summary.summaryErrorMessage.value !== null
    );
  });
  const isDialogSecondaryActionDisabled = computed(() => {
    if (!isTimerRunning.value || summary.isCrossWorkspaceTimer.value) {
      return true;
    }

    return (
      isConfirmSelectionDisabled.value ||
      timerActions.isPrimaryActionPending.value ||
      isSelectionUpdatePending.value
    );
  });

  return {
    elapsedTimeLabel,
    isConfirmSelectionDisabled,
    isCreateTaskDisabled,
    isCrossWorkspaceTimer: summary.isCrossWorkspaceTimer,
    isDialogPrimaryActionDisabled,
    isDialogSecondaryActionDisabled,
    isNewTaskSelected,
    primaryActionLabel,
    timerContextLabel,
    timerGitHubIssue,
    timerProjectLabel,
    timerStatusLabel,
    timerTaskLabel,
    timerWorkspaceContextLabel,
  };
}
