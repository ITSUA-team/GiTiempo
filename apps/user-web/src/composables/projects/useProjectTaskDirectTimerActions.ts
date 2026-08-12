import type { TaskResponse, TimeEntryResponse } from "@gitiempo/shared";
import {
  createAppToast,
  getErrorMessage,
  type ToastLike,
} from "@gitiempo/web-shared";
import { computed, shallowRef, type ComputedRef } from "vue";

import {
  useCurrentTimerQuery,
  useStartTimerMutation,
  useStopTimerMutation,
} from "@/composables/query";
import { isRunningTimer } from "@/lib/top-bar-timer-helpers";
import type { UserServerStateScope } from "@/lib/query-keys";
import type { TimeEntriesClient } from "@/services/time-entries-client";
import { isApiErrorStatus } from "@gitiempo/web-shared/http";

type TimerOperation =
  | { kind: "start"; taskId: string }
  | { kind: "stop"; taskId: string };

interface UseProjectTaskDirectTimerActionsOptions {
  client: Pick<TimeEntriesClient, "getCurrentTimer" | "startTimer" | "stopTimer">;
  enabled: ComputedRef<boolean>;
  onStartConflict(): void;
  scope: ComputedRef<UserServerStateScope>;
  toast: ToastLike;
}

export function useProjectTaskDirectTimerActions({
  client,
  enabled,
  onStartConflict,
  scope,
  toast,
}: UseProjectTaskDirectTimerActionsOptions) {
  const appToast = createAppToast(toast);
  const currentTimerQuery = useCurrentTimerQuery({ client, enabled, scope });
  const startTimerMutation = useStartTimerMutation({ client, scope });
  const stopTimerMutation = useStopTimerMutation({ client, scope });
  const timerOperation = shallowRef<TimerOperation | null>(null);
  const activeTimer = computed<TimeEntryResponse | null>(() => {
    const timer = currentTimerQuery.data.value?.timeEntry ?? null;
    return isRunningTimer(timer) ? timer : null;
  });
  const activeTimerTaskId = computed(() => activeTimer.value?.taskId ?? null);
  const isCurrentTimerLoading = computed(() => currentTimerQuery.isFetching.value);
  const startingTimerTaskId = computed(() =>
    timerOperation.value?.kind === "start" ? timerOperation.value.taskId : null,
  );
  const stoppingTimerTaskId = computed(() =>
    timerOperation.value?.kind === "stop" ? timerOperation.value.taskId : null,
  );

  async function refreshTimer(): Promise<void> {
    try {
      await currentTimerQuery.refetch({ throwOnError: true });
    } catch {
      appToast.showErrorToast({
        detail: "Please retry your timer action.",
        error: new Error("Could not refresh the current timer"),
        logContext: { action: "refresh-project-task-timer", feature: "projects-page" },
        summary: "Could not refresh timer status",
      });
    }
  }

  async function startTimerForTask(task: TaskResponse): Promise<void> {
    if (
      activeTimer.value !== null ||
      isCurrentTimerLoading.value ||
      timerOperation.value !== null
    ) {
      return;
    }

    timerOperation.value = { kind: "start", taskId: task.id };
    let shouldOpenStopFirstGuidance = false;
    let shouldRefreshTimer = false;

    try {
      await startTimerMutation.mutateAsync({ taskId: task.id });
      appToast.showSuccessToast("Timer started", `Tracking ${task.title}.`);
    } catch (error) {
      const message = getErrorMessage(error);
      shouldOpenStopFirstGuidance = isApiErrorStatus(error, [409]);
      shouldRefreshTimer = true;
      appToast.showErrorToast({
        detail: message,
        error,
        logContext: { action: "start-timer-from-project-task", feature: "projects-page" },
        summary: "Could not start timer",
      });
    } finally {
      if (shouldRefreshTimer) {
        await refreshTimer();
      }
      if (shouldOpenStopFirstGuidance) {
        onStartConflict();
      }
      timerOperation.value = null;
    }
  }

  async function stopTimerForTask(task: TaskResponse): Promise<void> {
    const expectedTimer = activeTimer.value;

    if (
      expectedTimer === null ||
      expectedTimer.taskId !== task.id ||
      timerOperation.value !== null
    ) {
      return;
    }

    timerOperation.value = { kind: "stop", taskId: task.id };
    let shouldRefreshTimer = false;

    try {
      const result = await currentTimerQuery.refetch({ throwOnError: true });
      const currentTimer = result.data?.timeEntry ?? null;

      if (
        currentTimer === null ||
        currentTimer.endedAt !== null ||
        currentTimer.id !== expectedTimer.id ||
        currentTimer.taskId !== task.id
      ) {
        appToast.showInfoToast(
          "Timer status refreshed",
          "The running timer changed. Please try again.",
        );
        return;
      }

      await stopTimerMutation.mutateAsync({ expectedTimerId: expectedTimer.id });
      appToast.showSuccessToast("Timer stopped", `Stopped tracking ${task.title}.`);
    } catch (error) {
      shouldRefreshTimer = true;
      appToast.showErrorToast({
        detail: getErrorMessage(error),
        error,
        logContext: { action: "stop-timer-from-project-task", feature: "projects-page" },
        summary: "Could not stop timer",
      });
    } finally {
      if (shouldRefreshTimer) {
        await refreshTimer();
      }
      timerOperation.value = null;
    }
  }

  return {
    activeTimerTaskId,
    isCurrentTimerLoading,
    startingTimerTaskId,
    startTimerForTask,
    stoppingTimerTaskId,
    stopTimerForTask,
  };
}
