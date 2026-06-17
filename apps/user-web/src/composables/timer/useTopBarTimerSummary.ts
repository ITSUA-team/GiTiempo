import type {
  TaskResponse,
  TimeEntryListResponse,
  TimeEntryResponse,
} from "@gitiempo/shared";
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
    projectId: string;
    taskId: string;
    description: string;
  } | null {
    return currentTimer.value
      ? {
          description: currentTimer.value.description ?? "",
          projectId: currentTimer.value.project.id,
          taskId: currentTimer.value.task.id,
        }
      : selectedContext.value
        ? {
            description: selectedDescription.value ?? "",
            projectId: selectedContext.value.projectId,
            taskId: selectedContext.value.taskId,
          }
        : null;
  }

  async function loadOwnEntriesPage(page: number): Promise<TimeEntryListResponse> {
    return client.listOwnEntries({ limit: 10, page });
  }

  async function loadEligibleLastTrackedContext(): Promise<SelectedTaskContext | null> {
    const visibleProjects = await client.listVisibleProjects();

    const activeProjectMap = new Map(
      visibleProjects
        .filter((project) => project.isActive)
        .map((project) => [project.id, project]),
    );
    const taskCache = new Map<string, TaskResponse[]>();

    if (activeProjectMap.size === 0) {
      return null;
    }

    for (let page = 1; page <= 3; page += 1) {
      const response = await loadOwnEntriesPage(page);

      for (const entry of response.items) {
        const project = activeProjectMap.get(entry.project.id);

        if (!project) {
          continue;
        }

        let projectTasks = taskCache.get(project.id);

        if (!projectTasks) {
          projectTasks = await client.listProjectTasks(project.id);
          taskCache.set(project.id, projectTasks);
        }

        const task = projectTasks.find(
          (candidate) =>
            candidate.id === entry.task.id &&
            candidate.isActive &&
            candidate.status === "open",
        );

        if (!task) {
          continue;
        }

        return {
          githubIssue: task.githubIssue,
          projectId: project.id,
          projectName: project.name,
          taskId: task.id,
          taskTitle: task.title,
        };
      }

      if (page >= response.meta.totalPages) {
        break;
      }
    }

    return null;
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
