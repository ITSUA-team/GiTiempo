import type {
  ProjectResponse,
  TimeEntryListQuery,
} from "@gitiempo/shared";
import { getErrorMessage } from "@gitiempo/web-shared";
import {
  useOwnTimeEntriesQuery,
  useVisibleProjectsQuery,
} from "@/composables/query";
import { computed, nextTick, ref, watch, type ComputedRef } from "vue";

import { timeEntriesKeys, userProjectsKeys, type UserServerStateScope } from "@/lib/query-keys";
import type { TimeEntriesClient } from "@/services/time-entries-client";

interface UseTimeEntriesDataOptions {
  client: TimeEntriesClient;
  enabled: ComputedRef<boolean>;
  entryListQuery: ComputedRef<Partial<TimeEntryListQuery>>;
  scope: ComputedRef<UserServerStateScope>;
}

export function useTimeEntriesData({
  client,
  enabled,
  entryListQuery,
  scope,
}: UseTimeEntriesDataOptions) {
  const visibleProjectsQuery = useVisibleProjectsQuery({
    client,
    enabled,
    queryKey: computed(() => userProjectsKeys.visibleProjects(scope.value)),
    scope,
  });
  const timeEntriesQuery = useOwnTimeEntriesQuery({
    client,
    enabled,
    query: entryListQuery,
    queryKey: computed(() => timeEntriesKeys.list(scope.value, entryListQuery.value)),
    scope,
  });

  const projects = computed(() => visibleProjectsQuery.data.value ?? []);
  const revokedProjectIds = ref(new Set<string>());

  watch(
    () => JSON.stringify(scope.value),
    () => {
      revokedProjectIds.value = new Set();
    },
  );
  watch(projects, (nextProjects, previousProjects) => {
    const nextProjectIds = new Set(nextProjects.map((project) => project.id));
    const nextRevokedProjectIds = new Set(revokedProjectIds.value);

    for (const project of previousProjects) {
      if (!nextProjectIds.has(project.id)) {
        nextRevokedProjectIds.add(project.id);
      }
    }

    for (const project of nextProjects) {
      nextRevokedProjectIds.delete(project.id);
    }

    revokedProjectIds.value = nextRevokedProjectIds;
  });
  const hasUnauthorizedEntry = computed(() => {
    if (!timeEntriesQuery.isDataForCurrentScope.value) {
      return false;
    }

    return (timeEntriesQuery.data.value?.items ?? []).some(
      (entry) => revokedProjectIds.value.has(entry.projectId),
    );
  });
  const hasSafeEntries = computed(
    () =>
      timeEntriesQuery.isDataForCurrentScope.value &&
      timeEntriesQuery.data.value !== undefined &&
      !hasUnauthorizedEntry.value,
  );
  const entries = computed(() =>
    hasSafeEntries.value ? timeEntriesQuery.data.value?.items ?? [] : [],
  );
  const entriesError = computed(() => timeEntriesQuery.error.value ?? null);
  const entriesMeta = computed(() =>
    hasSafeEntries.value ? timeEntriesQuery.data.value?.meta ?? null : null,
  );
  const projectsError = computed(() => visibleProjectsQuery.error.value ?? null);
  const totalRecords = computed(() => entriesMeta.value?.total ?? 0);
  const totalPages = computed(() => entriesMeta.value?.totalPages ?? 0);
  const isFetchingEntries = computed(() => timeEntriesQuery.isFetching.value);
  const isLoadingEntries = computed(
    () => timeEntriesQuery.isPending.value && !timeEntriesQuery.isDataForCurrentScope.value,
  );
  const hasLoadedEntries = computed(() => hasSafeEntries.value);
  const isRefreshingEntries = computed(
    () => timeEntriesQuery.isFetching.value && hasLoadedEntries.value,
  );
  const isShowingPreviousEntries = computed(
    () => hasSafeEntries.value && timeEntriesQuery.isPlaceholderData.value,
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
  const visibleProjects = computed(() => projects.value.filter((project) => project.isActive));

  async function ensureProjectsLoaded(force = false): Promise<ProjectResponse[]> {
    if (!force && projects.value.length > 0) {
      return projects.value;
    }

    const result = await visibleProjectsQuery.refetch({
      cancelRefetch: false,
      throwOnError: true,
    });

    if (!result.data) {
      throw result.error ?? new Error("Could not load visible projects.");
    }

    return result.data;
  }

  async function loadEntries(): Promise<void> {
    try {
      await nextTick();
      const result = await timeEntriesQuery.refetch({
        cancelRefetch: false,
        throwOnError: true,
      });

      if (!result.data) {
        throw result.error ?? new Error("Could not load time entries.");
      }
    } catch {
      // Query error state drives the visible error and toast watcher.
    }
  }

  return {
    ensureProjectsLoaded,
    entries,
    entriesError,
    entriesMeta,
    hasLoadedEntries,
    isFetchingEntries,
    isLoadingEntries,
    isLoadingProjects,
    isRefreshingEntries,
    isShowingPreviousEntries,
    loadEntries,
    projectsError,
    projectsErrorMessage,
    requestErrorMessage,
    totalPages,
    totalRecords,
    visibleProjects,
  };
}
