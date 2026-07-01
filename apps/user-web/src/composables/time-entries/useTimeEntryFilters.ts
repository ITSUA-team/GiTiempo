import type { TimeEntryListQuery } from '@gitiempo/shared';
import { nextLocalDay, startOfLocalDay } from '@gitiempo/web-shared/time';
import { computed, ref, shallowRef } from 'vue';

import {
  buildTaskLookupSuggestions,
  isTaskLookupOption,
  type TaskLookupOption,
  type TaskLookupValue,
} from './time-entry-task-lookup';

export type TimeEntryDateRange = [Date | null, Date | null] | null;
export type TimeEntryDatePickerRangeValue =
  | Date
  | (Date | null)[]
  | null
  | undefined;

function normalizeDateRange(
  value: TimeEntryDatePickerRangeValue,
): TimeEntryDateRange {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return [value, null];
  }

  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const startDate = value[0] ?? null;
  const endDate = value[1] ?? null;

  return startDate || endDate ? [startDate, endDate] : null;
}

export function useTimeEntryFilters() {
  const currentPage = ref(1);
  const pageSize = ref(20);
  const selectedDateRange = shallowRef<TimeEntryDateRange>(null);
  const selectedProjectId = ref<string | null>(null);
  const selectedTaskFilter = shallowRef<TaskLookupValue>(null);
  const filterTaskSuggestions = ref<TaskLookupOption[]>([]);

  const selectedTaskId = computed(() =>
    isTaskLookupOption(selectedTaskFilter.value)
      ? selectedTaskFilter.value.id
      : null,
  );
  const entryListQuery = computed<Partial<TimeEntryListQuery>>(() => {
    const [startDate, endDate] = selectedDateRange.value ?? [];
    const searchValue =
      typeof selectedTaskFilter.value === 'string'
        ? selectedTaskFilter.value.trim()
        : isTaskLookupOption(selectedTaskFilter.value)
          ? selectedTaskFilter.value.title
          : '';

    return {
      dateFrom: startDate ? startOfLocalDay(startDate).toISOString() : undefined,
      dateTo: endDate ? nextLocalDay(endDate).toISOString() : undefined,
      limit: pageSize.value,
      page: currentPage.value,
      projectId: selectedProjectId.value ?? undefined,
      search: searchValue.length > 0 ? searchValue : undefined,
      taskId: selectedTaskId.value ?? undefined,
    };
  });

  function resetPagination(): void {
    currentPage.value = 1;
  }

  function setPage(page: number): void {
    currentPage.value = page;
  }

  function setDateRange(range: TimeEntryDatePickerRangeValue): void {
    selectedDateRange.value = normalizeDateRange(range);
  }

  function setProjectId(projectId: string | null): void {
    selectedProjectId.value = projectId;
    selectedTaskFilter.value = null;
    filterTaskSuggestions.value = [];
  }

  function setTaskValue(value: TaskLookupValue): void {
    selectedTaskFilter.value = value;
  }

  function updateTaskSuggestions(
    query: string,
    options: TaskLookupOption[],
  ): void {
    filterTaskSuggestions.value = buildTaskLookupSuggestions(query, options);
  }

  return {
    currentPage,
    entryListQuery,
    filterTaskSuggestions,
    pageSize,
    resetPagination,
    selectedDateRange,
    selectedProjectId,
    selectedTaskFilter,
    selectedTaskId,
    setDateRange,
    setPage,
    setProjectId,
    setTaskValue,
    updateTaskSuggestions,
  };
}
