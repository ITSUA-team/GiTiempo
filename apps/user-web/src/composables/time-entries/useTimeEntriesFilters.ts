import type { TaskResponse, TimeEntryListQuery } from "@gitiempo/shared";
import { computed, ref, shallowRef } from "vue";

import { nextUtcDay, startOfUtcDay } from "@/lib/time-entry-display";

export type TaskLookupValue = string | TaskLookupOption | null;

export interface TaskLookupOption {
  id: string;
  isActive: boolean;
  projectId: string;
  title: string;
}

export function isTaskLookupOption(value: TaskLookupValue): value is TaskLookupOption {
  return typeof value === "object" && value !== null && "id" in value;
}

export function toTaskLookupOption(task: TaskResponse): TaskLookupOption {
  return {
    id: task.id,
    isActive: task.isActive,
    projectId: task.projectId,
    title: task.title,
  };
}

export function buildTaskLookupSuggestions(
  query: string,
  options: TaskLookupOption[],
): TaskLookupOption[] {
  const normalized = query.trim().toLowerCase();

  return normalized.length === 0
    ? [...options]
    : options.filter((task) => task.title.toLowerCase().includes(normalized));
}

export function useTimeEntriesFilters() {
  const currentPage = shallowRef(1);
  const pageSize = shallowRef(20);
  const selectedDateRange = shallowRef<Date[] | null>(null);
  const selectedProjectId = shallowRef<string | null>(null);
  const selectedTaskFilter = shallowRef<TaskLookupValue>(null);
  const filterTaskOptions = ref<TaskLookupOption[]>([]);
  const filterTaskSuggestions = ref<TaskLookupOption[]>([]);
  const isLoadingFilterTasks = shallowRef(false);
  const filterTasksErrorMessage = shallowRef<string | null>(null);

  const selectedTaskId = computed(() =>
    isTaskLookupOption(selectedTaskFilter.value) ? selectedTaskFilter.value.id : null,
  );
  const listQuery = computed<Partial<TimeEntryListQuery>>(() => {
    const [startDate, endDate] = selectedDateRange.value ?? [];
    const searchValue =
      typeof selectedTaskFilter.value === "string"
        ? selectedTaskFilter.value.trim()
        : isTaskLookupOption(selectedTaskFilter.value)
          ? selectedTaskFilter.value.title
          : "";

    return {
      dateFrom: startDate ? startOfUtcDay(startDate).toISOString() : undefined,
      dateTo: endDate ? nextUtcDay(endDate).toISOString() : undefined,
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

  function setSelectedProjectId(projectId: string | null): void {
    selectedProjectId.value = projectId;
    selectedTaskFilter.value = null;
    filterTaskSuggestions.value = [];
    filterTasksErrorMessage.value = null;

    if (!projectId) {
      filterTaskOptions.value = [];
    }
  }

  function setSelectedTaskFilter(value: TaskLookupValue): void {
    selectedTaskFilter.value = value;
  }

  function setFilterTaskOptions(options: TaskLookupOption[]): void {
    filterTaskOptions.value = options;
  }

  function setFilterTasksLoading(isLoading: boolean): void {
    isLoadingFilterTasks.value = isLoading;
  }

  function setFilterTasksError(message: string | null): void {
    filterTasksErrorMessage.value = message;
  }

  function updateFilterTaskSuggestions(query: string, options: TaskLookupOption[]): void {
    filterTaskSuggestions.value = buildTaskLookupSuggestions(query, options);
  }

  return {
    currentPage,
    filterTaskOptions,
    filterTaskSuggestions,
    filterTasksErrorMessage,
    isLoadingFilterTasks,
    listQuery,
    pageSize,
    resetPagination,
    selectedDateRange,
    selectedProjectId,
    selectedTaskFilter,
    selectedTaskId,
    setDateRange,
    setFilterTaskOptions,
    setFilterTasksError,
    setFilterTasksLoading,
    setPage,
    setSelectedProjectId,
    setSelectedTaskFilter,
    updateFilterTaskSuggestions,
  };
}
