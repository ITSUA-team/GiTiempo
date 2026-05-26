import type {
  ProjectResponse,
  TimeEntryListQuery,
  TimeEntryResponse,
} from "@gitiempo/shared";
import { getErrorMessage } from "@gitiempo/web-shared";
import {
  useOwnTimeEntriesQuery,
  useVisibleProjectsQuery,
} from "@gitiempo/web-shared/query";
import { computed, ref, shallowRef, type ComputedRef, type Ref } from "vue";

import {
  formatTimeEntryDuration,
  formatTimeEntryTimeRange,
  groupTimeEntriesByUtcDay,
  type TimeEntriesDayGroup,
} from "@/lib/time-entry-display";
import { resolveDataPageState } from "@/lib/page-state";
import type { TimeEntriesClient } from "@/services/time-entries-client";

/* eslint-disable no-unused-vars */
interface UseTimeEntriesDataOptions {
  accessToken: ComputedRef<string | null>;
  clearIntervalFn: typeof clearInterval;
  client: TimeEntriesClient;
  currentPage: Ref<number>;
  entryListQuery: ComputedRef<Partial<TimeEntryListQuery>>;
  now: () => number;
  onLoadEntriesError(error: unknown): void;
  onLoadProjectsError(error: unknown): void;
  pageSize: Ref<number>;
  setIntervalFn: typeof setInterval;
}
/* eslint-enable no-unused-vars */

export function useTimeEntriesData({
  accessToken,
  clearIntervalFn,
  client,
  currentPage,
  entryListQuery,
  now,
  onLoadEntriesError,
  onLoadProjectsError,
  pageSize,
  setIntervalFn,
}: UseTimeEntriesDataOptions) {
  const entries = ref<TimeEntryResponse[]>([]);
  const projects = ref<ProjectResponse[]>([]);
  const totalRecords = shallowRef(0);
  const totalPages = shallowRef(0);
  const nowMs = shallowRef(now());
  const isLoadingEntries = shallowRef(true);
  const isLoadingProjects = shallowRef(false);
  const requestErrorMessage = shallowRef<string | null>(null);
  const projectsErrorMessage = shallowRef<string | null>(null);
  let entriesRequestId = 0;
  let tickHandle: ReturnType<typeof setInterval> | null = null;

  const pageState = computed(() =>
    resolveDataPageState({
      hasRequestError: requestErrorMessage.value !== null,
      isEmpty: entries.value.length === 0,
      isLoading: isLoadingEntries.value,
    }),
  );
  const visibleProjects = computed(() => projects.value.filter((project) => project.isActive));
  const groupedEntries = computed<TimeEntriesDayGroup[]>(() =>
    groupTimeEntriesByUtcDay(entries.value, nowMs.value),
  );
  const hasRunningEntries = computed(() =>
    entries.value.some((entry) => entry.endedAt === null),
  );
  const visibleProjectsQuery = useVisibleProjectsQuery({
    accessToken,
    client,
    enabled: false,
  });
  const timeEntriesQuery = useOwnTimeEntriesQuery({
    accessToken,
    client,
    enabled: false,
    query: entryListQuery,
  });

  function stopTicker(): void {
    if (tickHandle !== null) {
      clearIntervalFn(tickHandle);
      tickHandle = null;
    }
  }

  function syncTicker(): void {
    if (!hasRunningEntries.value) {
      stopTicker();
      return;
    }

    if (tickHandle !== null) {
      return;
    }

    tickHandle = setIntervalFn(() => {
      nowMs.value = now();
    }, 1000);
  }

  async function ensureProjectsLoaded(force = false): Promise<ProjectResponse[]> {
    if (!force && projects.value.length > 0) {
      return projects.value;
    }

    isLoadingProjects.value = true;
    projectsErrorMessage.value = null;

    try {
      const result = await visibleProjectsQuery.refetch({ throwOnError: true });

      if (!result.data) {
        throw result.error ?? new Error("Could not load visible projects.");
      }

      projects.value = result.data;
      return projects.value;
    } catch (error) {
      projectsErrorMessage.value = getErrorMessage(error);
      onLoadProjectsError(error);
      throw error;
    } finally {
      isLoadingProjects.value = false;
    }
  }

  async function loadEntries(): Promise<void> {
    const requestId = ++entriesRequestId;

    isLoadingEntries.value = true;
    requestErrorMessage.value = null;

    try {
      const result = await timeEntriesQuery.refetch({ throwOnError: true });

      if (!result.data) {
        throw result.error ?? new Error("Could not load time entries.");
      }

      const response = result.data;

      if (requestId !== entriesRequestId) {
        return;
      }

      entries.value = response.items;
      currentPage.value = response.meta.page;
      pageSize.value = response.meta.limit;
      totalPages.value = response.meta.totalPages;
      totalRecords.value = response.meta.total;
      nowMs.value = now();
      syncTicker();
    } catch (error) {
      if (requestId === entriesRequestId) {
        entries.value = [];
        totalPages.value = 0;
        totalRecords.value = 0;
        stopTicker();
        requestErrorMessage.value = getErrorMessage(error);
        onLoadEntriesError(error);
      }
    } finally {
      if (requestId === entriesRequestId) {
        isLoadingEntries.value = false;
      }
    }
  }

  async function refreshEntriesAfterMutation(): Promise<void> {
    await loadEntries();

    if (totalPages.value > 0 && currentPage.value > totalPages.value) {
      currentPage.value = totalPages.value;
      await loadEntries();
    }
  }

  function formatDuration(entry: TimeEntryResponse): string {
    return formatTimeEntryDuration(entry, nowMs.value);
  }

  function formatTimeRange(entry: TimeEntryResponse): string {
    return formatTimeEntryTimeRange(entry);
  }

  return {
    ensureProjectsLoaded,
    entries,
    formatDuration,
    formatTimeRange,
    groupedEntries,
    isLoadingEntries,
    isLoadingProjects,
    loadEntries,
    pageState,
    projectsErrorMessage,
    refreshEntriesAfterMutation,
    requestErrorMessage,
    stopTicker,
    totalPages,
    totalRecords,
    visibleProjects,
  };
}
