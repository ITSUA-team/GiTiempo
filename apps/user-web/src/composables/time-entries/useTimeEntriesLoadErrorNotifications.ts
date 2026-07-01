import { watch, type ComputedRef } from "vue";

interface UseTimeEntriesLoadErrorNotificationsOptions {
  entriesError: ComputedRef<unknown | null>;
  onLoadEntriesError(error: unknown): void;
  onLoadProjectsError(error: unknown): void;
  projectsError: ComputedRef<unknown | null>;
}

export function useTimeEntriesLoadErrorNotifications({
  entriesError,
  onLoadEntriesError,
  onLoadProjectsError,
  projectsError,
}: UseTimeEntriesLoadErrorNotificationsOptions) {
  watch(entriesError, (error) => {
    if (error) {
      onLoadEntriesError(error);
    }
  });

  watch(projectsError, (error) => {
    if (error) {
      onLoadProjectsError(error);
    }
  });
}
