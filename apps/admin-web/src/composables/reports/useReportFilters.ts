import { ref, shallowRef } from 'vue';

import {
  defaultReportGrouping,
  getDefaultReportDateRange,
  isReportDateRangeValid,
  type ReportDateRange,
  type ReportGrouping,
  type ReportSetupFilters,
} from '@/lib/report-view-model';

export function useReportFilters() {
  const dateRange = shallowRef<ReportDateRange>(getDefaultReportDateRange());
  const grouping = ref<ReportGrouping>(defaultReportGrouping);

  /**
   * What the table fetches. Always member granularity, and grouping is
   * deliberately absent: both groupings are presented from these same rows, so
   * grouping must not reach the query key or switching it would refetch
   * identical data. Identity scope is absent too — the fetch always covers the
   * visible-project loop, and export-time identity comes from the table's own
   * filters, never from here.
   */
  function getCurrentFetchFilters(): ReportSetupFilters {
    return {
      dateRange: dateRange.value,
      groupBy: 'user',
      memberId: null,
      projectId: null,
      // search is omitted: the table's global search filters loaded rows
      // client-side, so sending it would narrow the fetch and desync the table
      // from its own search box.
    };
  }

  const appliedFilters = shallowRef<ReportSetupFilters>(
    getCurrentFetchFilters(),
  );

  function applyCurrentFilters(): boolean {
    if (!isReportDateRangeValid(dateRange.value)) {
      return false;
    }

    appliedFilters.value = getCurrentFetchFilters();
    return true;
  }

  return {
    appliedFilters,
    applyCurrentFilters,
    dateRange,
    grouping,
  };
}

export type ReportFiltersState = ReturnType<typeof useReportFilters>;
