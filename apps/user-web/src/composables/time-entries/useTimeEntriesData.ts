import type {
  ProjectResponse,
  TimeEntryListQuery,
} from "@gitiempo/shared";
import { getErrorMessage } from "@gitiempo/web-shared";
import {
  useOwnTimeEntriesQuery,
  useVisibleProjectsQuery,
} from "@/composables/query";
import { computed, nextTick, type ComputedRef } from "vue";

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

  const entries = computed(() => timeEntriesQuery.data.value?.items ?? []);
  const entriesError = computed(() => timeEntriesQuery.error.value ?? null);
  const entriesMeta = computed(() => timeEntriesQuery.data.value?.meta ?? null);
  const projects = computed(() => visibleProjectsQuery.data.value ?? []);
  const projectsError = computed(() => visibleProjectsQuery.error.value ?? null);
  const totalRecords = computed(() => timeEntriesQuery.data.value?.meta.total ?? 0);
  const totalPages = computed(() => timeEntriesQuery.data.value?.meta.totalPages ?? 0);
  const isFetchingEntries = computed(() => timeEntriesQuery.isFetching.value);
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
  const visibleProjects = computed(() => projects.value.filter((project) => project.isActive));

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

  return {
    ensureProjectsLoaded,
    entries,
    entriesError,
    entriesMeta,
    isFetchingEntries,
    isLoadingEntries,
    isLoadingProjects,
    loadEntries,
    projectsError,
    projectsErrorMessage,
    requestErrorMessage,
    totalPages,
    totalRecords,
    visibleProjects,
  };
}
