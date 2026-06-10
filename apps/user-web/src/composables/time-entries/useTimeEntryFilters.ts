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
  const selectedDateRange = shallowRef<Date[] | null>(getDefaultDateRange());
  const selectedProjectId = ref<string | null>(null);
  const selectedTaskFilter = shallowRef<TaskLookupValue>(null);
  const filterTaskOptions = ref<TaskLookupOption[]>([]);
  const filterTaskSuggestions = ref<TaskLookupOption[]>([]);
  const isLoadingFilterTasks = ref(false);
  const filterTasksErrorMessage = ref<string | null>(null);
  let taskRequestId = 0;

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

  function beginTaskRequest(): number {
    taskRequestId += 1;
    return taskRequestId;
  }

  function isCurrentTaskRequest(requestId: number): boolean {
    return requestId === taskRequestId;
  }

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
    filterTasksErrorMessage.value = null;

    if (!projectId) {
      filterTaskOptions.value = [];
    }
  }

  function setTaskValue(value: TaskLookupValue): void {
    selectedTaskFilter.value = value;
  }

  function setTaskOptions(options: TaskLookupOption[]): void {
    filterTaskOptions.value = options;
  }

  function setTasksLoading(isLoading: boolean): void {
    isLoadingFilterTasks.value = isLoading;
  }

  function setTasksError(message: string | null): void {
    filterTasksErrorMessage.value = message;
  }

  function updateTaskSuggestions(
    query: string,
    options: TaskLookupOption[],
  ): void {
    filterTaskSuggestions.value = buildTaskLookupSuggestions(query, options);
  }

  return {
    beginTaskRequest,
    currentPage,
    entryListQuery,
    filterTaskOptions,
    filterTaskSuggestions,
    filterTasksErrorMessage,
    isCurrentTaskRequest,
    isLoadingFilterTasks,
    pageSize,
    resetPagination,
    selectedDateRange,
    selectedProjectId,
    selectedTaskFilter,
    selectedTaskId,
    setDateRange,
    setPage,
    setProjectId,
    setTaskOptions,
    setTasksError,
    setTasksLoading,
    setTaskValue,
    updateTaskSuggestions,
  };
}

function getDefaultDateRange(now = new Date()): Date[] {
  return [
    new Date(now.getFullYear(), now.getMonth(), 1),
    new Date(now.getFullYear(), now.getMonth(), now.getDate()),
  ];
}
