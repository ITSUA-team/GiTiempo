import type { TimeEntryResponse } from "@gitiempo/shared";
import { createAppToast, getErrorMessage, type ToastLike } from "@gitiempo/web-shared";
import { isApiErrorStatus } from "@gitiempo/web-shared/http";
import { useQuery } from "@tanstack/vue-query";
import { computed, ref, shallowRef, watch, type ComputedRef } from "vue";

import {
  toSelectedTaskContext,
  type SelectedTaskContext,
} from "@/lib/top-bar-timer-helpers";
import { timerKeys, type UserServerStateScope } from "@/lib/query-keys";
import type { TimeEntriesClient } from "@/services/time-entries-client";

interface UseTopBarTimerSummaryOptions {
  accessToken: ComputedRef<string | null>;
  client: TimeEntriesClient;
  scope: ComputedRef<UserServerStateScope>;
  toast: ToastLike;
}

export function useTopBarTimerSummary({
  accessToken,
  client,
  scope,
  toast,
}: UseTopBarTimerSummaryOptions) {
  const appToast = createAppToast(toast);
  const currentTimer = shallowRef<TimeEntryResponse | null>(null);
  const selectedContext = shallowRef<SelectedTaskContext | null>(null);
  const selectedDescription = ref<string | null>(null);
  const hasExplicitIdleSelection = ref(false);

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
      : selectedContext.value
        ? {
            description: selectedDescription.value ?? "",
            githubIssue: selectedContext.value.githubIssue,
            projectId: selectedContext.value.projectId,
            taskId: selectedContext.value.taskId,
          }
        : null;
  }

  async function loadEligibleLastTrackedContext(): Promise<SelectedTaskContext | null> {
    const latestEntryResponse = await client.listOwnEntries({ limit: 1 });
    const latestEntry = latestEntryResponse.items[0];

    if (!latestEntry) {
      return null;
    }

    const visibleProjects = await client.listVisibleProjects();
    const project = visibleProjects.find(
      (candidate) => candidate.id === latestEntry.project.id && candidate.isActive,
    );

    if (!project) {
      return null;
    }

    const projectTasks = await client.listProjectTasks(project.id);
    const task = projectTasks.find(
      (candidate) =>
        candidate.id === latestEntry.task.id &&
        candidate.isActive &&
        candidate.status === "open",
    );

    if (!task) {
      return null;
    }

    return {
      githubIssue: task.githubIssue,
      projectId: project.id,
      projectName: project.name,
      source: "local",
      taskId: task.id,
      taskTitle: task.title,
    };
  }

  const summaryQuery = useQuery({
    queryKey: computed(() => timerKeys.summary(scope.value)),
    enabled: computed(() => Boolean(accessToken.value)),
    queryFn: async () => {
      const { timeEntry } = await client.getCurrentTimer();

      if (timeEntry) {
        return {
          currentTimer: timeEntry,
          selectedDescription: timeEntry.description ?? null,
          selectedContext: toSelectedTaskContext(timeEntry),
        };
      }

      return {
        currentTimer: null,
        selectedDescription: null,
        selectedContext: await loadEligibleLastTrackedContext(),
      };
    },
  });
  const isLoadingSummary = computed(() => summaryQuery.isFetching.value);
  const summaryErrorMessage = computed(() =>
    summaryQuery.error.value ? getErrorMessage(summaryQuery.error.value) : null,
  );

  async function refreshSummary(): Promise<void> {
    await summaryQuery.refetch();
  }

  async function refreshSummaryAfterConflict(error: unknown): Promise<void> {
    if (!isApiErrorStatus(error, [403, 404, 409, 422])) {
      return;
    }

    await refreshSummary();
  }

  watch(
    summaryQuery.data,
    (data) => {
      if (!data) return;

      currentTimer.value = data.currentTimer;

      if (data.currentTimer) {
        hasExplicitIdleSelection.value = false;
        selectedContext.value = data.selectedContext;
        selectedDescription.value = data.selectedDescription;
        return;
      }

      if (hasExplicitIdleSelection.value) {
        return;
      }

      selectedContext.value = data.selectedContext;
      selectedDescription.value = data.selectedDescription;
    },
    { immediate: true },
  );

  watch(summaryQuery.error, (error) => {
    if (!error) return;

    currentTimer.value = null;
    selectedContext.value = null;
    selectedDescription.value = null;
    hasExplicitIdleSelection.value = false;
    appToast.showErrorToast({
      detail: "Refresh and try again.",
      error,
      logContext: { action: "load-top-bar-timer", feature: "top-bar-timer" },
      summary: "Could not load the timer summary",
    });
  });

  return {
    currentTimer,
    clearSelectedDescription,
    getDialogSelectionFromCurrentState,
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
