import type { TimeEntryResponse } from "@gitiempo/shared";
import { computed, ref, shallowRef, type Ref } from "vue";

import {
  buildTaskLookupSuggestions,
  isNewTaskLookupOption,
  isTaskLookupOption,
  toEntryTaskOption,
  type TaskLookupOption,
  type TaskLookupValue,
} from "./time-entry-task-lookup";
import type { TimeEntryDialogMode } from "./useTimeEntryDialogState";

interface UseTimeEntryTaskLookupStateOptions {
  clearRequestError(): void;
  clearTaskValidationError(): void;
  dialogIsBillable: Ref<boolean>;
  dialogMode: Ref<TimeEntryDialogMode>;
  dialogProjectId: Ref<string | null>;
}

export function useTimeEntryTaskLookupState({
  clearRequestError,
  clearTaskValidationError,
  dialogIsBillable,
  dialogMode,
  dialogProjectId,
}: UseTimeEntryTaskLookupStateOptions) {
  const dialogTaskValue = shallowRef<TaskLookupValue>(null);
  const dialogTaskOptions = ref<TaskLookupOption[]>([]);
  const dialogTaskSuggestions = ref<TaskLookupOption[]>([]);
  const dialogTasksErrorMessage = ref<string | null>(null);
  const isLoadingDialogTasks = ref(false);
  let taskRequestId = 0;
  const activeDialogTask = computed(() =>
    isTaskLookupOption(dialogTaskValue.value) ? dialogTaskValue.value : null,
  );
  const isNewTaskSelected = computed(() =>
    isNewTaskLookupOption(dialogTaskValue.value),
  );

  function beginTaskRequest(): number {
    taskRequestId += 1;
    return taskRequestId;
  }

  function isCurrentTaskRequest(requestId: number): boolean {
    return requestId === taskRequestId;
  }

  function resetTaskLookupState(): void {
    dialogTaskValue.value = null;
    dialogTaskOptions.value = [];
    dialogTaskSuggestions.value = [];
    dialogTasksErrorMessage.value = null;
  }

  function setTaskOptions(options: TaskLookupOption[]): void {
    dialogTaskOptions.value = options;
  }

  function setTasksError(message: string | null): void {
    dialogTasksErrorMessage.value = message;
  }

  function setTasksLoading(isLoading: boolean): void {
    isLoadingDialogTasks.value = isLoading;
  }

  function updateTaskSuggestions(
    query: string,
    options = dialogTaskOptions.value,
  ): void {
    dialogTaskSuggestions.value = buildTaskLookupSuggestions(
      query,
      options,
      dialogProjectId.value,
    );
  }

  function setTaskValue(value: TaskLookupValue): void {
    dialogTaskValue.value = value;
    clearTaskValidationError();
    clearRequestError();

    if (
      dialogMode.value === "create" &&
      isTaskLookupOption(value) &&
      typeof value.defaultBillableForTimeEntries === "boolean"
    ) {
      dialogIsBillable.value = value.defaultBillableForTimeEntries;
    }
  }

  function setTaskFromEntryFallback(entry: TimeEntryResponse): void {
    setTaskValue(toEntryTaskOption(entry));
  }

  return {
    activeDialogTask,
    beginTaskRequest,
    dialogTaskOptions,
    dialogTasksErrorMessage,
    dialogTaskSuggestions,
    dialogTaskValue,
    isCurrentTaskRequest,
    isLoadingDialogTasks,
    isNewTaskSelected,
    resetTaskLookupState,
    setTaskFromEntryFallback,
    setTaskOptions,
    setTasksError,
    setTasksLoading,
    setTaskValue,
    updateTaskSuggestions,
  };
}
