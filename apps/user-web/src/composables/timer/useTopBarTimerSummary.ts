import type {
  TaskResponse,
  TimeEntryListResponse,
  TimeEntryResponse,
} from "@gitiempo/shared";
import { createAppToast, getErrorMessage, type ToastLike } from "@gitiempo/web-shared";
import {
  useCurrentTimerQuery,
  useOwnTimeEntriesQuery,
  useProjectTasksQuery,
  useVisibleProjectsQuery,
} from "@gitiempo/web-shared/query";
import { nextTick, shallowRef, type ComputedRef } from "vue";

import {
  isConflictErrorMessage,
  toSelectedTaskContext,
  type SelectedTaskContext,
} from "@/lib/top-bar-timer-helpers";
import type { TimeEntriesClient } from "@/services/time-entries-client";

interface UseTopBarTimerSummaryOptions {
  accessToken: ComputedRef<string | null>;
  client: TimeEntriesClient;
  toast: ToastLike;
}

export function useTopBarTimerSummary({
  accessToken,
  client,
  toast,
}: UseTopBarTimerSummaryOptions) {
  const appToast = createAppToast(toast);
  const currentTimer = shallowRef<TimeEntryResponse | null>(null);
  const selectedContext = shallowRef<SelectedTaskContext | null>(null);
  const isLoadingSummary = shallowRef(false);
  const summaryErrorMessage = shallowRef<string | null>(null);
  const eligibleEntryQuery = shallowRef({ limit: 10, page: 1 });
  const projectTasksProjectId = shallowRef<string | null>(null);

  const currentTimerQuery = useCurrentTimerQuery({
    accessToken,
    client,
    enabled: false,
  });
  const visibleProjectsQuery = useVisibleProjectsQuery({
    accessToken,
    client,
    enabled: false,
  });
  const projectTasksQuery = useProjectTasksQuery({
    accessToken,
    client,
    enabled: false,
    projectId: projectTasksProjectId,
  });
  const eligibleEntriesQuery = useOwnTimeEntriesQuery({
    accessToken,
    client,
    enabled: false,
    query: eligibleEntryQuery,
  });

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
    eligibleEntryQuery.value = { limit: 10, page };
    await nextTick();

    const result = await eligibleEntriesQuery.refetch({ throwOnError: true });

    if (!result.data) {
      throw result.error ?? new Error("Could not load recent time entries.");
    }

    return result.data;
  }

  async function loadEligibleLastTrackedContext(): Promise<SelectedTaskContext | null> {
    const visibleProjectsResult = await visibleProjectsQuery.refetch({ throwOnError: true });

    if (!visibleProjectsResult.data) {
      throw visibleProjectsResult.error ?? new Error("Could not load visible projects.");
    }

    const activeProjectMap = new Map(
      visibleProjectsResult.data
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
          projectTasksProjectId.value = project.id;
          await nextTick();
          const projectTasksResult = await projectTasksQuery.refetch({ throwOnError: true });

          if (!projectTasksResult.data) {
            throw projectTasksResult.error ?? new Error("Could not load project tasks.");
          }

          projectTasks = projectTasksResult.data;
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

  async function refreshSummary(): Promise<void> {
    isLoadingSummary.value = true;
    summaryErrorMessage.value = null;

    try {
      const currentTimerResult = await currentTimerQuery.refetch({ throwOnError: true });

      if (!currentTimerResult.data) {
        throw currentTimerResult.error ?? new Error("Could not load current timer.");
      }

      const { timeEntry } = currentTimerResult.data;

      currentTimer.value = timeEntry;

      if (timeEntry) {
        setSelectedContextFromTimer(timeEntry);
        return;
      }

      selectedContext.value = await loadEligibleLastTrackedContext();
    } catch (error) {
      summaryErrorMessage.value = getErrorMessage(error);
      currentTimer.value = null;
      selectedContext.value = null;
      appToast.showErrorToast({
        detail: "Refresh and try again.",
        error,
        logContext: { action: "load-top-bar-timer", feature: "top-bar-timer" },
        summary: "Could not load the timer summary",
      });
    } finally {
      isLoadingSummary.value = false;
    }
  }

  async function refreshSummaryAfterConflict(message: string): Promise<void> {
    if (!isConflictErrorMessage(message)) {
      return;
    }

    await refreshSummary();
  }

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
