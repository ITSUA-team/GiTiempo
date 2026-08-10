import type { ProjectResponse, TimeEntryListQuery } from '@gitiempo/shared';
import { INPUT_DEBOUNCE_MS } from '@gitiempo/web-shared';
import { nextLocalDay, startOfLocalDay } from '@gitiempo/web-shared/time';
import { computed, onScopeDispose, ref, shallowRef } from 'vue';

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

function createTypingDebounce() {
  let pending: ReturnType<typeof setTimeout> | null = null;

  function cancel(): void {
    if (pending !== null) {
      clearTimeout(pending);
      pending = null;
    }
  }

  function commit(apply: () => void): void {
    cancel();
    apply();
  }

  function schedule(apply: () => void): void {
    cancel();
    pending = setTimeout(() => {
      pending = null;
      apply();
    }, INPUT_DEBOUNCE_MS);
  }

  return { cancel, commit, schedule };
}

export function useTimeEntryFilters() {
  const currentPage = ref(1);
  const pageSize = ref(20);
  const selectedDateRange = shallowRef<TimeEntryDateRange>(null);
  const selectedProjectId = ref<string | null>(null);
  const selectedTaskFilter = shallowRef<TaskLookupValue>(null);
  const appliedTaskFilter = shallowRef<TaskLookupValue>(null);
  const filterTaskSuggestions = ref<TaskLookupOption[]>([]);
  const projectFilterDebounce = createTypingDebounce();
  const taskFilterDebounce = createTypingDebounce();

  const selectedTaskId = computed(() =>
    isTaskLookupOption(appliedTaskFilter.value)
      ? appliedTaskFilter.value.id
      : null,
  );
  const entryListQuery = computed<Partial<TimeEntryListQuery>>(() => {
    const [startDate, endDate] = selectedDateRange.value ?? [];
    const searchValue =
      typeof appliedTaskFilter.value === 'string'
        ? appliedTaskFilter.value.trim()
        : isTaskLookupOption(appliedTaskFilter.value)
          ? appliedTaskFilter.value.title
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

  function applyProjectId(projectId: string | null): void {
    selectedProjectId.value = projectId;
    taskFilterDebounce.cancel();
    selectedTaskFilter.value = null;
    appliedTaskFilter.value = null;
    filterTaskSuggestions.value = [];
    currentPage.value = 1;
  }

  function setProjectValue(value: ProjectResponse | string | null): void {
    if (typeof value === 'string') {
      if (value.trim().length === 0) {
        projectFilterDebounce.schedule(() => applyProjectId(null));
      }

      return;
    }

    projectFilterDebounce.commit(() => applyProjectId(value?.id ?? null));
  }

  function applyTaskFilter(value: TaskLookupValue): void {
    appliedTaskFilter.value = value;
    currentPage.value = 1;
  }

  function setTaskValue(value: TaskLookupValue): void {
    selectedTaskFilter.value = value;

    if (typeof value === 'string') {
      taskFilterDebounce.schedule(() => applyTaskFilter(value));
      return;
    }

    taskFilterDebounce.commit(() => applyTaskFilter(value));
  }

  function updateTaskSuggestions(
    query: string,
    options: TaskLookupOption[],
  ): void {
    filterTaskSuggestions.value = buildTaskLookupSuggestions(query, options);
  }

  onScopeDispose(() => {
    projectFilterDebounce.cancel();
    taskFilterDebounce.cancel();
  });

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
    setProjectValue,
    setTaskValue,
    updateTaskSuggestions,
  };
}
