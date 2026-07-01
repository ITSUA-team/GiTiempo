import { ref, shallowRef } from 'vue';

import {
  getDefaultReportDateRange,
  isReportDateRangeValid,
  type ReportDateRange,
  type ReportSetupFilters,
} from '@/lib/report-view-model';

export function useReportFilters() {
  const selectedProjectId = ref<string | null>(null);
  const selectedMemberId = ref<string | null>(null);
  const dateRange = shallowRef<ReportDateRange>(getDefaultReportDateRange());
  const groupBy = ref<ReportSetupFilters['groupBy']>('project');
  const appliedFilters = shallowRef<ReportSetupFilters>({
    dateRange: dateRange.value,
    groupBy: groupBy.value,
    memberId: selectedMemberId.value,
    projectId: selectedProjectId.value,
  });

  function getCurrentSetupFilters(): ReportSetupFilters {
    return {
      dateRange: dateRange.value,
      groupBy: groupBy.value,
      memberId: selectedMemberId.value,
      projectId: selectedProjectId.value,
    };
  }

  function applyCurrentFilters(): boolean {
    if (!isReportDateRangeValid(dateRange.value)) {
      return false;
    }

    appliedFilters.value = getCurrentSetupFilters();
    return true;
  }

  return {
    appliedFilters,
    applyCurrentFilters,
    dateRange,
    getCurrentSetupFilters,
    groupBy,
    selectedMemberId,
    selectedProjectId,
  };
}

export type ReportFiltersState = ReturnType<typeof useReportFilters>;
