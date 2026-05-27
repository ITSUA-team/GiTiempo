import type {
  TaskResponse,
  TimeEntryListResponse,
  TimeEntryResponse,
} from "@gitiempo/shared";
import { createAppToast, getErrorMessage, type ToastLike } from "@gitiempo/web-shared";
import { useQuery } from "@tanstack/vue-query";
import { computed, shallowRef, watch, type ComputedRef } from "vue";

import {
  isConflictErrorMessage,
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

  function setSelectedContextFromTimer(timer: TimeEntryResponse): void {
    selectedContext.value = toSelectedTaskContext(timer);
  }

  function getDialogSelectionFromCurrentState(): { projectId: string; taskId: string } | null {
    return currentTimer.value
      ? {
          projectId: currentTimer.value.project.id,
          taskId: currentTimer.value.task.id,
        }
      : selectedContext.value
        ? {
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
          (candidate) => candidate.id === entry.task.id && candidate.isActive,
        );

        if (!task) {
          continue;
        }

        return {
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
    queryKey: computed(() => timerKeys.current(scope.value)),
    enabled: computed(() => Boolean(accessToken.value)),
    queryFn: async () => {
      const { timeEntry } = await client.getCurrentTimer();

      if (timeEntry) {
        return {
          currentTimer: timeEntry,
          selectedContext: toSelectedTaskContext(timeEntry),
        };
      }

      return {
        currentTimer: null,
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

  async function refreshSummaryAfterConflict(message: string): Promise<void> {
    if (!isConflictErrorMessage(message)) {
      return;
    }

    await refreshSummary();
  }

  watch(
    summaryQuery.data,
    (data) => {
      if (!data) return;

      currentTimer.value = data.currentTimer;
      selectedContext.value = data.selectedContext;
    },
    { immediate: true },
  );

  watch(summaryQuery.error, (error) => {
    if (!error) return;

    currentTimer.value = null;
    selectedContext.value = null;
    appToast.showErrorToast({
      detail: "Refresh and try again.",
      error,
      logContext: { action: "load-top-bar-timer", feature: "top-bar-timer" },
      summary: "Could not load the timer summary",
    });
  });

  return {
    currentTimer,
    getDialogSelectionFromCurrentState,
    isLoadingSummary,
    refreshSummary,
    refreshSummaryAfterConflict,
    selectedContext,
    setSelectedContextFromTimer,
    summaryErrorMessage,
  };
}

export type TopBarTimerSummary = ReturnType<typeof useTopBarTimerSummary>;
