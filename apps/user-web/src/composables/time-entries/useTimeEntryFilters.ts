import type { TimeEntryListQuery } from '@gitiempo/shared';
import { nextLocalDay, startOfLocalDay } from '@gitiempo/web-shared/time';
import { computed, ref, shallowRef } from 'vue';

import {
  buildTaskLookupSuggestions,
  isTaskLookupOption,
  type TaskLookupOption,
  type TaskLookupValue,
} from './time-entry-task-lookup';

export function useTimeEntryFilters() {
  const currentPage = ref(1);
  const pageSize = ref(20);
  const selectedDateRange = shallowRef<Date[] | null>(null);
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

  function setDateRange(range: Date[] | null): void {
    selectedDateRange.value = range && range.length > 0 ? range : null;
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
