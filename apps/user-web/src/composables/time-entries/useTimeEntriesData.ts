import type {
  ProjectResponse,
  TimeEntryListQuery,
  TimeEntryResponse,
} from "@gitiempo/shared";
import { getErrorMessage } from "@gitiempo/web-shared";
import {
  useOwnTimeEntriesQuery,
  useVisibleProjectsQuery,
} from "@/composables/query";
import { computed, nextTick, ref, watch, type ComputedRef, type Ref } from "vue";

import {
  formatTimeEntryDuration,
  formatTimeEntryTimeRange,
  groupTimeEntriesByLocalDay,
  type TimeEntriesDayGroup,
} from "@/lib/time-entry-display";
import { resolveDataPageState } from "@/lib/page-state";
import { timeEntriesKeys, userProjectsKeys, type UserServerStateScope } from "@/lib/query-keys";
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
  scope: ComputedRef<UserServerStateScope>;
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
  scope,
  setIntervalFn,
}: UseTimeEntriesDataOptions) {
  const nowMs = ref(now());
  let tickHandle: ReturnType<typeof setInterval> | null = null;

  const visibleProjectsQuery = useVisibleProjectsQuery({
    accessToken,
    client,
    queryKey: computed(() => userProjectsKeys.visibleProjects(scope.value)),
    scope,
  });
  const timeEntriesQuery = useOwnTimeEntriesQuery({
    accessToken,
    client,
    query: entryListQuery,
    queryKey: computed(() => timeEntriesKeys.list(scope.value, entryListQuery.value)),
    scope,
  });

  const entries = computed(() => timeEntriesQuery.data.value?.items ?? []);
  const projects = computed(() => visibleProjectsQuery.data.value ?? []);
  const totalRecords = computed(() => timeEntriesQuery.data.value?.meta.total ?? 0);
  const totalPages = computed(() => timeEntriesQuery.data.value?.meta.totalPages ?? 0);
  const isLoadingEntries = computed(
    () => timeEntriesQuery.isPending.value || timeEntriesQuery.isFetching.value,
  );
  const isLoadingProjects = computed(() => visibleProjectsQuery.isFetching.value);
  const requestErrorMessage = computed(() =>
    timeEntriesQuery.error.value ? getErrorMessage(timeEntriesQuery.error.value) : null,
  );
  const projectsErrorMessage = computed(() =>
    visibleProjectsQuery.error.value
      ? getErrorMessage(visibleProjectsQuery.error.value)
      : null,
  );

  const pageState = computed(() =>
    resolveDataPageState({
      hasRequestError: requestErrorMessage.value !== null,
      isEmpty: entries.value.length === 0,
      isLoading: isLoadingEntries.value,
    }),
  );
  const visibleProjects = computed(() => projects.value.filter((project) => project.isActive));
  const groupedEntries = computed<TimeEntriesDayGroup[]>(() =>
    groupTimeEntriesByLocalDay(entries.value, nowMs.value),
  );
  const hasRunningEntries = computed(() =>
    entries.value.some((entry) => entry.endedAt === null),
  );

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

    const result = await visibleProjectsQuery.refetch({ throwOnError: true });

    if (!result.data) {
      throw result.error ?? new Error("Could not load visible projects.");
    }

    return result.data;
  }

  async function loadEntries(): Promise<void> {
    try {
      await nextTick();
      const result = await timeEntriesQuery.refetch({ throwOnError: true });

      if (!result.data) {
        throw result.error ?? new Error("Could not load time entries.");
      }
    } catch {
      // Query error state drives the visible error and toast watcher.
    }
  }

  function formatDuration(entry: TimeEntryResponse): string {
    return formatTimeEntryDuration(entry, nowMs.value);
  }

  function formatTimeRange(entry: TimeEntryResponse): string {
    return formatTimeEntryTimeRange(entry);
  }

  watch(
    [() => timeEntriesQuery.data.value?.meta, timeEntriesQuery.isFetching],
    ([meta, isFetching]) => {
      if (!meta || isFetching) {
        return;
      }

      pageSize.value = meta.limit;

      if (meta.totalPages > 0 && currentPage.value > meta.totalPages) {
        currentPage.value = meta.totalPages;
      }
    },
    { immediate: true },
  );

  watch(
    entries,
    () => {
      nowMs.value = now();
      syncTicker();
    },
    { immediate: true },
  );

  watch(timeEntriesQuery.error, (error) => {
    if (error) {
      onLoadEntriesError(error);
    }
  });

  watch(visibleProjectsQuery.error, (error) => {
    if (error) {
      onLoadProjectsError(error);
    }
  });

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
    requestErrorMessage,
    stopTicker,
    totalPages,
    totalRecords,
    visibleProjects,
  };
}
