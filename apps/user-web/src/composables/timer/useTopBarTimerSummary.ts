import type { TimeEntryResponse } from "@gitiempo/shared";
import {
  createAppToast,
  getErrorMessage,
  type ToastLike,
} from "@gitiempo/web-shared";
import { isApiErrorStatus } from "@gitiempo/web-shared/http";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import {
  computed,
  nextTick,
  ref,
  shallowRef,
  watch,
  type ComputedRef,
} from "vue";

import { useCurrentTimerQuery } from "@/composables/query";
import {
  toSelectedTaskContext,
  type SelectedTaskContext,
  isGitHubProjectIssueSelectedTaskContext,
} from "@/lib/top-bar-timer-helpers";
import { loadEligibleLastTrackedContext } from "@/lib/top-bar-timer-last-context";
import { timerKeys, type UserServerStateScope } from "@/lib/query-keys";
import type { TimeEntriesClient } from "@/services/time-entries-client";

interface UseTopBarTimerSummaryOptions {
  client: TimeEntriesClient;
  enabled: ComputedRef<boolean>;
  scope: ComputedRef<UserServerStateScope>;
  toast: ToastLike;
}

export function useTopBarTimerSummary({
  client,
  enabled,
  scope,
  toast,
}: UseTopBarTimerSummaryOptions) {
  const appToast = createAppToast(toast);
  const queryClient = useQueryClient();
  const currentTimer = shallowRef<TimeEntryResponse | null>(null);
  const selectedContext = shallowRef<SelectedTaskContext | null>(null);
  const selectedDescription = ref<string | null>(null);
  const hasExplicitIdleSelection = ref(false);

  const isCrossWorkspaceTimer = computed(() => {
    const timer = currentTimer.value;
    const activeWorkspaceId = scope.value.workspaceId;

    return (
      timer !== null &&
      timer.endedAt === null &&
      typeof activeWorkspaceId === "string" &&
      timer.workspaceId !== activeWorkspaceId
    );
  });
  const currentTimerWorkspaceLabel = computed(
    () => currentTimer.value?.workspace.name ?? null,
  );

  function setSelectedContextFromTimer(timer: TimeEntryResponse): void {
    hasExplicitIdleSelection.value = false;
    selectedContext.value = toSelectedTaskContext(timer);
  }

  function setSelectedDescriptionFromTimer(timer: TimeEntryResponse): void {
    hasExplicitIdleSelection.value = false;
    selectedDescription.value = timer.description ?? null;
  }

  function setIdleSelection(
    context: SelectedTaskContext,
    description: string | null,
  ): void {
    hasExplicitIdleSelection.value = true;
    selectedContext.value = context;
    selectedDescription.value = description;
  }

  function clearSelectedDescription(): void {
    hasExplicitIdleSelection.value = false;
    selectedDescription.value = null;
  }

  function getDialogSelectionFromCurrentState(): {
    githubIssue: TimeEntryResponse["githubIssue"];
    projectId: string;
    taskId: string;
    description: string;
  } | null {
    return currentTimer.value
      ? {
          description: currentTimer.value.description ?? "",
          githubIssue: currentTimer.value.githubIssue,
          projectId: currentTimer.value.project.id,
          taskId: currentTimer.value.task.id,
        }
      : selectedContext.value &&
          !isGitHubProjectIssueSelectedTaskContext(selectedContext.value)
        ? {
            description: selectedDescription.value ?? "",
            githubIssue: selectedContext.value.githubIssue,
            projectId: selectedContext.value.projectId,
            taskId: selectedContext.value.taskId,
          }
        : null;
  }

  const currentTimerQuery = useCurrentTimerQuery({ client, enabled, scope });

  const isCurrentTimerIdle = computed(
    () => enabled.value && currentTimerQuery.data.value?.timeEntry === null,
  );
  const eligibleLastContextQuery = useQuery({
    queryKey: computed(() =>
      timerKeys.eligibleLastEntry(scope.value, { limit: 1 }),
    ),
    enabled: isCurrentTimerIdle,
    queryFn: ({ signal }) =>
      loadEligibleLastTrackedContext({
        client,
        queryClient,
        signal,
        scope: scope.value,
      }),
    refetchOnWindowFocus: true,
  });
  const isLoadingSummary = computed(
    () =>
      currentTimerQuery.isFetching.value ||
      eligibleLastContextQuery.isFetching.value,
  );
  const summaryErrorMessage = computed(() =>
    currentTimerQuery.error.value
      ? getErrorMessage(currentTimerQuery.error.value)
      : isCurrentTimerIdle.value && eligibleLastContextQuery.error.value
        ? getErrorMessage(eligibleLastContextQuery.error.value)
        : null,
  );

  async function refreshSummary(): Promise<void> {
    const eligibleQuery = queryClient.getQueryCache().find({
      exact: true,
      queryKey: timerKeys.eligibleLastEntry(scope.value, { limit: 1 }),
    });
    const eligibleDataUpdateCount = eligibleQuery?.state.dataUpdateCount ?? 0;
    const result = await currentTimerQuery.refetch();

    if (result.data?.timeEntry === null) {
      await nextTick();
      const latestEligibleQuery = queryClient.getQueryCache().find({
        exact: true,
        queryKey: timerKeys.eligibleLastEntry(scope.value, { limit: 1 }),
      });

      if (
        latestEligibleQuery?.state.fetchStatus === "fetching" ||
        (latestEligibleQuery?.state.dataUpdateCount ?? 0) <=
          eligibleDataUpdateCount
      ) {
        await eligibleLastContextQuery.refetch({ cancelRefetch: false });
      }
    }
  }

  async function refreshSummaryAfterConflict(error: unknown): Promise<void> {
    if (!isApiErrorStatus(error, [403, 404, 409, 422])) {
      return;
    }

    await refreshSummary();
  }

  watch(
    [
      currentTimerQuery.data,
      currentTimerQuery.error,
      eligibleLastContextQuery.data,
      eligibleLastContextQuery.error,
    ],
    ([currentData, currentError, eligibleLastContext]) => {
      if (!enabled.value || currentError || !currentData) return;

      const timer = currentData.timeEntry;
      currentTimer.value = timer;

      if (timer) {
        queryClient.removeQueries({
          exact: true,
          queryKey: timerKeys.eligibleLastEntryWave(scope.value),
        });
        if (isCrossWorkspaceTimer.value && hasExplicitIdleSelection.value) {
          return;
        }

        hasExplicitIdleSelection.value = false;
        selectedContext.value = toSelectedTaskContext(timer);
        selectedDescription.value = timer.description ?? null;
        return;
      }

      if (hasExplicitIdleSelection.value) {
        return;
      }

      selectedContext.value = eligibleLastContext ?? null;
      selectedDescription.value = null;
    },
    { immediate: true },
  );

  function clearSummaryState(): void {
    currentTimer.value = null;
    selectedContext.value = null;
    selectedDescription.value = null;
    hasExplicitIdleSelection.value = false;
  }

  watch(
    [enabled, scope],
    ([isEnabled, nextScope], [wasEnabled, previousScope]) => {
      if (
        !isEnabled ||
        !wasEnabled ||
        previousScope.userId !== nextScope.userId ||
        previousScope.workspaceId !== nextScope.workspaceId
      ) {
        clearSummaryState();
        queryClient.removeQueries({
          exact: true,
          queryKey: timerKeys.eligibleLastEntryWave(previousScope),
        });
      }
    },
    { flush: "sync" },
  );

  watch(
    [isCurrentTimerIdle, eligibleLastContextQuery.fetchStatus],
    ([isIdle, fetchStatus], [wasIdle, previousFetchStatus]) => {
      if (!isIdle) {
        queryClient.removeQueries({
          exact: true,
          queryKey: timerKeys.eligibleLastEntryWave(scope.value),
        });
        return;
      }

      if (
        wasIdle &&
        previousFetchStatus === "fetching" &&
        fetchStatus === "idle"
      ) {
        queryClient.removeQueries({
          exact: true,
          queryKey: timerKeys.eligibleLastEntryWave(scope.value),
        });
      }
    },
    { flush: "sync" },
  );

  watch(
    [currentTimerQuery.error, eligibleLastContextQuery.error],
    ([currentError, eligibleError]) => {
      if (currentError) {
        queryClient.removeQueries({
          exact: true,
          queryKey: timerKeys.eligibleLastEntryWave(scope.value),
        });
      }
      const error =
        currentError ?? (isCurrentTimerIdle.value ? eligibleError : null);
      if (!error) return;

      clearSummaryState();
      appToast.showErrorToast({
        detail: "Refresh and try again.",
        error,
        logContext: { action: "load-top-bar-timer", feature: "top-bar-timer" },
        summary: "Could not load the timer summary",
      });
    },
  );

  return {
    currentTimer,
    currentTimerWorkspaceLabel,
    clearSelectedDescription,
    getDialogSelectionFromCurrentState,
    isCrossWorkspaceTimer,
    isLoadingSummary,
    refreshSummary,
    refreshSummaryAfterConflict,
    selectedContext,
    selectedDescription,
    setIdleSelection,
    setSelectedDescriptionFromTimer,
    setSelectedContextFromTimer,
    summaryErrorMessage,
  };
}

export type TopBarTimerSummary = ReturnType<typeof useTopBarTimerSummary>;
