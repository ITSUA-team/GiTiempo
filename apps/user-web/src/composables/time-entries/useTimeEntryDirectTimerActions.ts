import type { TimeEntryResponse } from "@gitiempo/shared";
import {
  createAppToast,
  getErrorMessage,
  type ToastLike,
} from "@gitiempo/web-shared";
import { useQueryClient } from "@tanstack/vue-query";
import { computed, shallowRef, type ComputedRef } from "vue";

import {
  useCurrentTimerQuery,
  useStartTimerMutation,
  useStopTimerMutation,
} from "@/composables/query";
import { timerKeys, type UserServerStateScope } from "@/lib/query-keys";
import type { TimeEntriesClient } from "@/services/time-entries-client";

interface DirectTimerEntry {
  endedAt: string | null;
  id: string;
  task: Pick<TimeEntryResponse["task"], "title">;
  taskId: string;
}

interface UseTimeEntryDirectTimerActionsOptions {
  accessToken: ComputedRef<string | null>;
  client: Pick<TimeEntriesClient, "getCurrentTimer" | "startTimer" | "stopTimer">;
  logFeature?: "dashboard" | "time-entries";
  loadEntries(): Promise<void>;
  scope: ComputedRef<UserServerStateScope>;
  toast: ToastLike;
}

export function useTimeEntryDirectTimerActions({
  accessToken,
  client,
  logFeature = "time-entries",
  loadEntries,
  scope,
  toast,
}: UseTimeEntryDirectTimerActionsOptions) {
  const appToast = createAppToast(toast);
  const queryClient = useQueryClient();
  const currentTimerGuardQuery = useCurrentTimerQuery({
    accessToken,
    client,
    scope,
  });
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
  const startingTimerEntryId = shallowRef<string | null>(null);
  const stoppingTimerEntryId = shallowRef<string | null>(null);
  const isDirectStartBlockedByCurrentTimer = computed(() =>
    currentTimerGuardQuery.isFetching.value ||
    currentTimerGuardQuery.data.value?.timeEntry?.endedAt === null,
  );

  async function invalidateTimer(): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: timerKeys.all(scope.value) });
  }

  async function refreshTimerAndEntries(): Promise<void> {
    await Promise.allSettled([
      invalidateTimer(),
      loadEntries(),
    ]);
  }

  async function startTimerForEntry(entry: DirectTimerEntry): Promise<void> {
    if (
      entry.endedAt === null ||
      startingTimerEntryId.value !== null ||
      isDirectStartBlockedByCurrentTimer.value
    ) {
      return;
    }

    startingTimerEntryId.value = entry.id;

    try {
      await startTimerMutation.mutateAsync({ taskId: entry.taskId });
      appToast.showSuccessToast(
        "Timer started",
        `Tracking ${entry.task.title}.`,
      );
    } catch (error) {
      appToast.showErrorToast({
        detail: getErrorMessage(error),
        error,
        logContext: { action: "start-timer-from-entry", feature: logFeature },
        summary: "Could not start timer",
      });

      await invalidateTimer();
    } finally {
      startingTimerEntryId.value = null;
    }
  }

  async function stopTimerForEntry(entry: DirectTimerEntry): Promise<void> {
    if (entry.endedAt !== null || stoppingTimerEntryId.value !== null) {
      return;
    }

    stoppingTimerEntryId.value = entry.id;

    try {
      const currentTimerResult = await currentTimerGuardQuery.refetch({
        throwOnError: true,
      });
      const currentTimer = currentTimerResult.data?.timeEntry ?? null;

      if (currentTimer?.id !== entry.id) {
        await refreshTimerAndEntries();
        appToast.showInfoToast(
          "Timer status refreshed",
          "The running timer changed. Please try again.",
        );
        return;
      }

      await stopTimerMutation.mutateAsync();
      appToast.showSuccessToast(
        "Timer stopped",
        `Stopped tracking ${entry.task.title}.`,
      );
    } catch (error) {
      appToast.showErrorToast({
        detail: getErrorMessage(error),
        error,
        logContext: { action: "stop-timer-from-entry", feature: logFeature },
        summary: "Could not stop timer",
      });

      await invalidateTimer();
    } finally {
      stoppingTimerEntryId.value = null;
    }
  }

  return {
    isDirectStartBlockedByCurrentTimer,
    startingTimerEntryId,
    startTimerForEntry,
    stoppingTimerEntryId,
    stopTimerForEntry,
  };
}
