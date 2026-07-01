import type { TimeEntryResponse } from "@gitiempo/shared";
import { computed, type ComputedRef, type Ref } from "vue";

import {
  formatTimeEntryDuration,
  formatTimeEntryTimeRange,
  groupTimeEntriesByLocalDay,
  type TimeEntriesDayGroup,
} from "@/lib/time-entry-display";
import { resolveDataPageState } from "@/lib/page-state";

interface UseTimeEntriesDisplayOptions {
  entries: ComputedRef<TimeEntryResponse[]>;
  isLoadingEntries: ComputedRef<boolean>;
  nowMs: Readonly<Ref<number>>;
  requestErrorMessage: ComputedRef<string | null>;
}

export function useTimeEntriesDisplay({
  entries,
  isLoadingEntries,
  nowMs,
  requestErrorMessage,
}: UseTimeEntriesDisplayOptions) {
  const pageState = computed(() =>
    resolveDataPageState({
      hasRequestError: requestErrorMessage.value !== null,
      isEmpty: entries.value.length === 0,
      isLoading: isLoadingEntries.value,
    }),
  );
  const groupedEntries = computed<TimeEntriesDayGroup[]>(() =>
    groupTimeEntriesByLocalDay(entries.value, nowMs.value),
  );

  function formatDuration(entry: TimeEntryResponse): string {
    return formatTimeEntryDuration(entry, nowMs.value);
  }

  function formatTimeRange(entry: TimeEntryResponse): string {
    return formatTimeEntryTimeRange(entry);
  }

  return {
    formatDuration,
    formatTimeRange,
    groupedEntries,
    pageState,
  };
}
