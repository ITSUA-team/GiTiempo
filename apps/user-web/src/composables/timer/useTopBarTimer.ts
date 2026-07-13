import type { ToastLike } from '@gitiempo/web-shared';
import { computed } from 'vue';
import { useToast } from 'primevue/usetoast';

import { createDefaultTimeEntriesClient } from '@/config/clients';
import { getUserServerStateScope } from '@/lib/server-state-scope';
import { isRunningTimer } from '@/lib/top-bar-timer-helpers';
import type { TimeEntriesClient } from '@/services/time-entries-client';
import { useAuthStore } from '@/stores/auth';

import { useTopBarTaskCreation } from './useTopBarTaskCreation';
import { useTopBarTaskOptions } from './useTopBarTaskOptions';
import { useTopBarTaskPicker } from './useTopBarTaskPicker';
import { useTopBarTimerActions } from './useTopBarTimerActions';
import { useTopBarTimerDialogFlow } from './useTopBarTimerDialogFlow';
import { useTopBarTimerSelectionUpdate } from './useTopBarTimerSelectionUpdate';
import { useTopBarTimerSummary } from './useTopBarTimerSummary';
import { useTopBarTimerViewModel } from './useTopBarTimerViewModel';

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
  const now = options.now ?? (() => Date.now());
  const setIntervalFn = options.setIntervalFn ?? setInterval;
  const clearIntervalFn = options.clearIntervalFn ?? clearInterval;
  const picker = useTopBarTaskPicker();
  const isAuthenticated = computed(() => Boolean(authStore.accessToken));
  const scope = computed(() => getUserServerStateScope(authStore.accessToken));
  const summary = useTopBarTimerSummary({
    client,
    enabled: isAuthenticated,
    scope,
    toast,
  });
  const isTimerRunning = computed(() =>
    isRunningTimer(summary.currentTimer.value),
  );
  const taskOptions = useTopBarTaskOptions({
    client,
    enabled: isAuthenticated,
    picker,
    scope,
  });
  const taskCreation = useTopBarTaskCreation({
    client,
    picker,
    scope,
    toast,
  });
  const timerActions = useTopBarTimerActions({
    client,
    isTimerRunning,
    scope,
    summary,
    toast,
  });
  const selectionUpdate = useTopBarTimerSelectionUpdate({
    client,
    picker,
    scope,
    summary,
    toast,
  });
  const viewModel = useTopBarTimerViewModel({
    clearIntervalFn,
    isSelectionUpdatePending: selectionUpdate.isUpdatingSelection,
    isTimerRunning,
    now,
    picker,
    setIntervalFn,
    summary,
    taskCreation,
    timerActions,
  });
  const dialogFlow = useTopBarTimerDialogFlow({
    isNewTaskSelected: viewModel.isNewTaskSelected,
    isTimerRunning,
    picker,
    selectionUpdate,
    summary,
    taskCreation,
    taskOptions,
    timerActions,
    toast,
  });

  return {
    closeDialog: dialogFlow.closeDialog,
    confirmSelectedTask: dialogFlow.confirmSelectedTask,
    createTaskErrorMessage: picker.createTaskErrorMessage,
    createTaskFromDialog: taskCreation.createTaskFromDialog,
    createTaskTitle: picker.createTaskTitle,
    currentTimer: summary.currentTimer,
    elapsedTimeLabel: viewModel.elapsedTimeLabel,
    handleDialogPrimaryAction: dialogFlow.handleDialogPrimaryAction,
    isConfirmSelectionDisabled: viewModel.isConfirmSelectionDisabled,
    isConfirmingSelection: selectionUpdate.isUpdatingSelection,
    isCreateTaskDisabled: viewModel.isCreateTaskDisabled,
    isCreatingTask: taskCreation.isCreatingTask,
    isCrossWorkspaceTimer: viewModel.isCrossWorkspaceTimer,
    isDialogPrimaryActionDisabled: viewModel.isDialogPrimaryActionDisabled,
    isDialogOpen: picker.isDialogOpen,
    isDialogSecondaryActionDisabled: viewModel.isDialogSecondaryActionDisabled,
    isLoadingProjects: taskOptions.isLoadingProjects,
    isLoadingSummary: summary.isLoadingSummary,
    isLoadingTasks: taskOptions.isLoadingTasks,
    isPrimaryActionPending: timerActions.isPrimaryActionPending,
    isTimerRunning,
    openDialog: dialogFlow.openDialog,
    primaryActionLabel: viewModel.primaryActionLabel,
    projectsErrorMessage: picker.projectsErrorMessage,
    projectOptions: picker.activeProjects,
    refreshSummary: summary.refreshSummary,
    selectedContext: summary.selectedContext,
    selectedDescription: picker.selectedDescription,
    selectedProject: picker.selectedProject,
    selectedProjectId: picker.selectedProjectId,
    selectedTask: picker.selectedTask,
    selectedTaskId: picker.selectedTaskId,
    selectionUpdateErrorMessage: selectionUpdate.selectionUpdateErrorMessage,
    setCreateTaskTitle: picker.setCreateTaskTitle,
    setSelectedDescription: dialogFlow.setSelectedDescription,
    setSelectedProjectId: dialogFlow.setSelectedProjectId,
    setSelectedTaskId: dialogFlow.setSelectedTaskId,
    startTimerFromDialog: dialogFlow.startTimerFromDialog,
    stopTimerFromDialog: dialogFlow.stopTimerFromDialog,
    summaryErrorMessage: summary.summaryErrorMessage,
    taskOptions: picker.activeTasks,
    tasksErrorMessage: picker.tasksErrorMessage,
    timerActionErrorMessage: timerActions.timerActionErrorMessage,
    timerGitHubIssue: viewModel.timerGitHubIssue,
    timerContextLabel: viewModel.timerContextLabel,
    timerProjectLabel: viewModel.timerProjectLabel,
    timerStatusLabel: viewModel.timerStatusLabel,
    timerTaskLabel: viewModel.timerTaskLabel,
    timerWorkspaceContextLabel: viewModel.timerWorkspaceContextLabel,
  };
}
