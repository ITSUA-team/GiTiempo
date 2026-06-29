import { createAppToast, type ToastLike } from '@gitiempo/web-shared';
import { watch, type ComputedRef } from 'vue';

import type { useTopBarTaskCreation } from './useTopBarTaskCreation';
import type { useTopBarTaskOptions } from './useTopBarTaskOptions';
import type { TopBarTaskPicker } from './useTopBarTaskPicker';
import type { useTopBarTimerActions } from './useTopBarTimerActions';
import type { TopBarTimerSelectionUpdate } from './useTopBarTimerSelectionUpdate';
import type { TopBarTimerSummary } from './useTopBarTimerSummary';

interface UseTopBarTimerDialogFlowOptions {
  isNewTaskSelected: ComputedRef<boolean>;
  isTimerRunning: ComputedRef<boolean>;
  picker: TopBarTaskPicker;
  selectionUpdate: TopBarTimerSelectionUpdate;
  summary: TopBarTimerSummary;
  taskCreation: ReturnType<typeof useTopBarTaskCreation>;
  taskOptions: ReturnType<typeof useTopBarTaskOptions>;
  timerActions: ReturnType<typeof useTopBarTimerActions>;
  toast: ToastLike;
}

export function useTopBarTimerDialogFlow({
  isNewTaskSelected,
  isTimerRunning,
  picker,
  selectionUpdate,
  summary,
  taskCreation,
  taskOptions,
  timerActions,
  toast,
}: UseTopBarTimerDialogFlowOptions) {
  const appToast = createAppToast(toast);

  function clearDialogActionErrors(): void {
    selectionUpdate.clearSelectionUpdateError();
    timerActions.clearTimerActionError();
  }

  async function openDialog(): Promise<void> {
    clearDialogActionErrors();
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
    clearDialogActionErrors();
    picker.closeDialog();
  }

  function setSelectedProjectId(projectId: string | null): void {
    clearDialogActionErrors();
    const shouldClearSelectedTask =
      picker.selectedProjectId.value !== projectId;

    picker.setSelectedProjectId(projectId);

    if (shouldClearSelectedTask) {
      picker.setSelectedTaskId(null);
    }
  }

  function setSelectedTaskId(taskId: string | null): void {
    clearDialogActionErrors();
    picker.setSelectedTaskId(taskId);
  }

  function setSelectedDescription(description: string): void {
    clearDialogActionErrors();
    picker.setSelectedDescription(description);
  }

  async function confirmSelectedTask(): Promise<void> {
    if (isNewTaskSelected.value) {
      await taskCreation.createTaskFromDialog();
      return;
    }

    const didApplySelection = await selectionUpdate.applySelectedTaskContext();

    if (didApplySelection) {
      closeDialog();
    }
  }

  async function handleDialogPrimaryAction(): Promise<void> {
    if (selectionUpdate.isUpdatingSelection.value) {
      return;
    }

    selectionUpdate.clearSelectionUpdateError();

    if (!isTimerRunning.value) {
      if (isNewTaskSelected.value) {
        await taskCreation.createTaskFromDialog();
        return;
      }

      const context = picker.getSelectedTaskContext();

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

  return {
    closeDialog,
    confirmSelectedTask,
    handleDialogPrimaryAction,
    openDialog,
    setSelectedDescription,
    setSelectedProjectId,
    setSelectedTaskId,
    startTimerFromDialog,
    stopTimerFromDialog,
  };
}
