import { createAppToast, getErrorMessage, type ToastLike } from "@gitiempo/web-shared";
import { isApiErrorStatus } from "@gitiempo/web-shared/http";
import type { StartTimerInput } from "@gitiempo/shared";
import { isGitHubProjectIssueSelectedTaskContext } from "@/lib/top-bar-timer-helpers";
import {
  useStartTimerMutation,
  useStopTimerMutation,
} from "@/composables/query";
import { computed, ref, type ComputedRef } from "vue";
import type { UserServerStateScope } from "@/lib/query-keys";
import type { TimeEntriesClient } from "@/services/time-entries-client";

import type { TopBarTimerSummary } from "./useTopBarTimerSummary";

interface UseTopBarTimerActionsOptions {
  client: TimeEntriesClient;
  isTimerRunning: ComputedRef<boolean>;
  scope: ComputedRef<UserServerStateScope>;
  summary: TopBarTimerSummary;
  toast: ToastLike;
}

export function useTopBarTimerActions({
  client,
  isTimerRunning,
  scope,
  summary,
  toast,
}: UseTopBarTimerActionsOptions) {
  const appToast = createAppToast(toast);
  const timerActionErrorMessage = ref<string | null>(null);
  const startTimerMutation = useStartTimerMutation({
    client,
    scope,
  });
  const stopTimerMutation = useStopTimerMutation({
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
      const wasCrossWorkspaceTimer = summary.isCrossWorkspaceTimer.value;

      try {
        const stoppedTimer = await stopTimerMutation.mutateAsync();

        summary.currentTimer.value = null;
        if (wasCrossWorkspaceTimer) {
          await summary.refreshSummary();
        } else {
          summary.setSelectedContextFromTimer(stoppedTimer);
          summary.clearSelectedDescription();
        }
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

    const draftContext = summary.selectedContext.value;
    const draftDescription = summary.selectedDescription.value;

    if (!draftContext) {
      return false;
    }

    try {
      if (isGitHubProjectIssueSelectedTaskContext(draftContext)) {
        summary.currentTimer.value = await client.startTimerFromGitHub({
          githubProjectId: draftContext.githubProjectId,
          githubRepo: draftContext.githubIssue.githubRepo,
          issueNumber: draftContext.githubIssue.issueNumber,
          issueTitle: draftContext.issueTitle,
        });
      } else {
        const input: StartTimerInput = {
          taskId: draftContext.taskId,
        };

        if (draftDescription !== null) {
          input.description = draftDescription;
        }

        summary.currentTimer.value = await startTimerMutation.mutateAsync(input);
      }
      if (summary.currentTimer.value) {
        summary.setSelectedContextFromTimer(summary.currentTimer.value);
        summary.setSelectedDescriptionFromTimer(summary.currentTimer.value);
      }
      appToast.showSuccessToast("Timer started", "Your timer is now running.");
      return true;
    } catch (error) {
      const message = getErrorMessage(error);
      const toastCopy = isGitHubProjectIssueSelectedTaskContext(draftContext)
        ? getGitHubProjectStartErrorToastCopy(error, message)
        : getStartTimerErrorToastCopy(message);

      timerActionErrorMessage.value = message;
      appToast.showErrorToast({
        detail: toastCopy.detail,
        error,
        logContext: { action: "start-timer", feature: "top-bar-timer" },
        summary: toastCopy.summary,
      });
      await summary.refreshSummaryAfterConflict(error);
      if (summary.isCrossWorkspaceTimer.value) {
        summary.setIdleSelection(draftContext, draftDescription);
      }
      return false;
    }
  }

  function getGitHubProjectStartErrorToastCopy(
    error: unknown,
    message: string,
  ): { detail: string; summary: string } {
    if (isApiErrorStatus(error, [403])) {
      return {
        detail:
          "This repository belongs to an organization your workspace has not approved.",
        summary: "Organization not allowed",
      };
    }

    if (isApiErrorStatus(error, [404])) {
      return {
        detail:
          "Connect GitHub, or check that you can still open this repository on GitHub.",
        summary: "Repository unavailable",
      };
    }

    if (isApiErrorStatus(error, [422])) {
      return {
        detail: "The project tracking this repository is no longer active.",
        summary: "Project is inactive",
      };
    }

    return { detail: message, summary: "Could not start the timer" };
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
