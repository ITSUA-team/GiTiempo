import { ref, shallowRef } from 'vue';

import {
  defaultReportGrouping,
  getDefaultReportDateRange,
  isReportDateRangeValid,
  reportGroupingApiValue,
  type ReportDateRange,
  type ReportGrouping,
  type ReportSetupFilters,
} from '@/lib/report-view-model';

export function useReportFilters() {
  const selectedProjectId = ref<string | null>(null);
  const selectedMemberId = ref<string | null>(null);
  const dateRange = shallowRef<ReportDateRange>(getDefaultReportDateRange());
  const grouping = ref<ReportGrouping>(defaultReportGrouping);

  /** Export scope: grouping travels to the CSV as metadata. */
  function getCurrentSetupFilters(): ReportSetupFilters {
    return {
      dateRange: dateRange.value,
      groupBy: reportGroupingApiValue[grouping.value],
      memberId: selectedMemberId.value,
      projectId: selectedProjectId.value,
    };
  }

  /**
   * What the table actually fetches. Always member granularity, and grouping is
   * deliberately absent: both groupings are presented from these same rows, so
   * grouping must not reach the query key or switching it would refetch
   * identical data.
   */
  function getCurrentFetchFilters(): ReportSetupFilters {
    return {
      dateRange: dateRange.value,
      groupBy: 'user',
      memberId: selectedMemberId.value,
      projectId: selectedProjectId.value,
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
    getCurrentSetupFilters,
    grouping,
    selectedMemberId,
    selectedProjectId,
  };
}

export type ReportFiltersState = ReturnType<typeof useReportFilters>;
