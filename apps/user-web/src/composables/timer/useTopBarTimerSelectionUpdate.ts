import {
  createAppToast,
  getErrorMessage,
  type ToastLike,
} from '@gitiempo/web-shared';
import { ref, type ComputedRef } from 'vue';

import { useUpdateTimeEntryMutation } from '@/composables/query';
import type { UserServerStateScope } from '@/lib/query-keys';
import type { TimeEntriesClient } from '@/services/time-entries-client';

import type { TopBarTaskPicker } from './useTopBarTaskPicker';
import type { TopBarTimerSummary } from './useTopBarTimerSummary';

interface UseTopBarTimerSelectionUpdateOptions {
  accessToken: ComputedRef<string | null>;
  client: TimeEntriesClient;
  picker: TopBarTaskPicker;
  scope: ComputedRef<UserServerStateScope>;
  summary: TopBarTimerSummary;
  toast: ToastLike;
}

export function useTopBarTimerSelectionUpdate({
  accessToken,
  client,
  picker,
  scope,
  summary,
  toast,
}: UseTopBarTimerSelectionUpdateOptions) {
  const appToast = createAppToast(toast);
  const selectionUpdateErrorMessage = ref<string | null>(null);
  const updateTimeEntryMutation = useUpdateTimeEntryMutation({
    accessToken,
    client,
    scope,
  });

  function clearSelectionUpdateError(): void {
    selectionUpdateErrorMessage.value = null;
  }

  async function applySelectedTaskContext(): Promise<boolean> {
    const context = picker.getSelectedTaskContext();

    if (!context) {
      return false;
    }

    selectionUpdateErrorMessage.value = null;
    const description = picker.getNormalizedDescription();

    if (!summary.currentTimer.value) {
      summary.setIdleSelection(context, description);
      return true;
    }

    const currentTimerId = summary.currentTimer.value.id;
    const currentDescription = summary.currentTimer.value.description ?? null;

    if (
      summary.currentTimer.value.task.id === context.taskId &&
      currentDescription === description
    ) {
      return true;
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
      appToast.showSuccessToast(
        'Timer updated',
        'Your running timer has been updated.',
      );
      return true;
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
      return false;
    }
  }

  return {
    applySelectedTaskContext,
    clearSelectionUpdateError,
    isUpdatingSelection: updateTimeEntryMutation.isPending,
    selectionUpdateErrorMessage,
  };
}

export type TopBarTimerSelectionUpdate = ReturnType<
  typeof useTopBarTimerSelectionUpdate
>;
