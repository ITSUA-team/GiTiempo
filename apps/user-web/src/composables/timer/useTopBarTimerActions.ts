import { createAppToast, getErrorMessage, type ToastLike } from "@gitiempo/web-shared";
import { isApiErrorStatus } from "@gitiempo/web-shared/http";
import type { StartTimerInput } from "@gitiempo/shared";
import {
  useStartTimerMutation,
  useStopTimerMutation,
} from "@/composables/query";
import { computed, ref, type ComputedRef } from "vue";
import type { UserServerStateScope } from "@/lib/query-keys";
import type { TimeEntriesClient } from "@/services/time-entries-client";

import type { TopBarTimerSummary } from "./useTopBarTimerSummary";

interface UseTopBarTimerActionsOptions {
  accessToken: ComputedRef<string | null>;
  client: TimeEntriesClient;
  isTimerRunning: ComputedRef<boolean>;
  scope: ComputedRef<UserServerStateScope>;
  summary: TopBarTimerSummary;
  toast: ToastLike;
}

export function useTopBarTimerActions({
  accessToken,
  client,
  isTimerRunning,
  scope,
  summary,
  toast,
}: UseTopBarTimerActionsOptions) {
  const appToast = createAppToast(toast);
  const timerActionErrorMessage = ref<string | null>(null);
  const startTimerMutation = useStartTimerMutation({
    accessToken,
    client,
    scope,
  });
  const stopTimerMutation = useStopTimerMutation({
    accessToken,
    client,
    scope,
  });
  const isStartingTimer = computed(() => startTimerMutation.isPending.value);
  const isStoppingTimer = computed(() => stopTimerMutation.isPending.value);
  const isPrimaryActionPending = computed(
    () => isStartingTimer.value || isStoppingTimer.value,
  );

  function clearTimerActionError(): void {
    timerActionErrorMessage.value = null;
  }

  async function handlePrimaryAction(): Promise<boolean> {
    timerActionErrorMessage.value = null;

    if (isTimerRunning.value) {
      try {
        const stoppedTimer = await stopTimerMutation.mutateAsync();

        summary.currentTimer.value = null;
        summary.setSelectedContextFromTimer(stoppedTimer);
        summary.clearSelectedDescription();
        appToast.showSuccessToast("Timer stopped", "Your running timer has been stopped.");
        return true;
      } catch (error) {
        const message = getErrorMessage(error);

        if (isApiErrorStatus(error, [404])) {
          await summary.refreshSummaryAfterConflict(error);
          timerActionErrorMessage.value = null;
          appToast.showInfoToast(
            "Timer already stopped",
            "The timer status has been refreshed.",
          );
          return true;
        }

        timerActionErrorMessage.value = message;
        appToast.showErrorToast({
          detail: "Please try again.",
          error,
          logContext: { action: "stop-timer", feature: "top-bar-timer" },
          summary: "Could not stop the timer",
        });
        return false;
      }
    }

    if (!summary.selectedContext.value) {
      return false;
    }

    try {
      const input: StartTimerInput = {
        taskId: summary.selectedContext.value.taskId,
      };

      if (summary.selectedDescription.value !== null) {
        input.description = summary.selectedDescription.value;
      }

      summary.currentTimer.value = await startTimerMutation.mutateAsync(input);
      if (summary.currentTimer.value) {
        summary.setSelectedContextFromTimer(summary.currentTimer.value);
        summary.setSelectedDescriptionFromTimer(summary.currentTimer.value);
      }
      appToast.showSuccessToast("Timer started", "Your timer is now running.");
      return true;
    } catch (error) {
      const message = getErrorMessage(error);
      const toastCopy = getStartTimerErrorToastCopy(message);

      timerActionErrorMessage.value = message;
      appToast.showErrorToast({
        detail: toastCopy.detail,
        error,
        logContext: { action: "start-timer", feature: "top-bar-timer" },
        summary: toastCopy.summary,
      });
      await summary.refreshSummaryAfterConflict(error);
      return false;
    }
  }

  return {
    clearTimerActionError,
    handlePrimaryAction,
    isPrimaryActionPending,
    isStartingTimer,
    isStoppingTimer,
    timerActionErrorMessage,
  };
}

function getStartTimerErrorToastCopy(message: string): {
  detail: string;
  summary: string;
} {
  if (message.toLowerCase().includes("task is closed")) {
    return {
      detail: "Choose an open task to start tracking time.",
      summary: "Couldn't track closed task",
    };
  }

  return {
    detail: "Please try again.",
    summary: "Could not start the timer",
  };
}
