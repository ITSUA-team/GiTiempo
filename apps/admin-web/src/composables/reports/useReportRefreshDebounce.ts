import { onUnmounted, watch, type ComputedRef, type Ref } from 'vue';

import type { ReportDateRange } from '@/lib/report-view-model';

interface UseReportRefreshDebounceOptions {
  applyCurrentFilters: () => boolean;
  dateRange: Ref<ReportDateRange>;
  initialLoaded: ComputedRef<boolean>;
  onRefreshScheduled: () => void;
  selectedProjectId: Ref<string | null>;
}

export function useReportRefreshDebounce({
  applyCurrentFilters,
  dateRange,
  initialLoaded,
  onRefreshScheduled,
  selectedProjectId,
}: UseReportRefreshDebounceOptions) {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function clearDebounceTimer(): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  }

  function scheduleReportRefresh(): void {
    if (!initialLoaded.value) {
      return;
    }

    onRefreshScheduled();
    clearDebounceTimer();
    debounceTimer = setTimeout(applyCurrentFilters, 300);
  }

  watch(
    [
      selectedProjectId,
      () => dateRange.value?.[0]?.getTime() ?? null,
      () => dateRange.value?.[1]?.getTime() ?? null,
    ],
    scheduleReportRefresh,
  );

  onUnmounted(clearDebounceTimer);

  return {
    clearDebounceTimer,
    scheduleReportRefresh,
  };
}
