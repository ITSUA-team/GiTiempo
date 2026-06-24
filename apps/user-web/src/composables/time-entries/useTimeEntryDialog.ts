import {
  createManualTimeEntrySchema,
  createTaskSchema,
  type TimeEntryResponse,
} from "@gitiempo/shared";
import { computed, ref, shallowRef } from "vue";

import {
  buildTaskLookupSuggestions,
  isNewTaskLookupOption,
  isTaskLookupOption,
  toEntryTaskOption,
  type TaskLookupOption,
  type TaskLookupValue,
} from "./time-entry-task-lookup";

export type TimeEntryDialogMode = "create" | "edit" | null;

export interface TimeEntryFormErrors {
  description: string | null;
  endedAt: string | null;
  projectId: string | null;
  newTaskTitle: string | null;
  startedAt: string | null;
  taskId: string | null;
}

export type ValidatedTimeEntryDialogInput = {
  description?: string | null;
  endedAt: string;
  isBillable: boolean;
  startedAt: string;
  taskId: string;
};

function defaultFormErrors(): TimeEntryFormErrors {
  return {
    description: null,
    endedAt: null,
    newTaskTitle: null,
    projectId: null,
    startedAt: null,
    taskId: null,
  };
}

function createLocalPresetDate(
  dayKey: string,
  hour: number,
): Date | null {
  const [yearText, monthText, dayText] = dayKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  const value = new Date(year, month - 1, day, hour, 0, 0, 0);

  if (
    value.getFullYear() !== year ||
    value.getMonth() !== month - 1 ||
    value.getDate() !== day
  ) {
    return null;
  }

  return value;
}

export function useTimeEntryDialog() {
  const dialogMode = ref<TimeEntryDialogMode>(null);
  const editingEntry = shallowRef<TimeEntryResponse | null>(null);
  const dialogProjectId = ref<string | null>(null);
  const dialogTaskValue = shallowRef<TaskLookupValue>(null);
  const dialogStartedAt = shallowRef<Date | null>(null);
  const dialogEndedAt = shallowRef<Date | null>(null);
  const dialogDescription = ref("");
  const dialogIsBillable = ref(false);
  const dialogNewTaskTitle = ref("");
  const dialogErrors = ref<TimeEntryFormErrors>(defaultFormErrors());
  const dialogRequestErrorMessage = ref<string | null>(null);
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
  const dialogTitle = computed(() =>
    dialogMode.value === "edit" ? "Edit time entry" : "New time entry",
  );
  const dialogSubtitle = computed(() =>
    dialogMode.value === "edit"
      ? "Update the selected time entry using the same popup layout as create mode."
      : "Create a completed time entry without starting the global timer.",
  );
  const dialogSaveLabel = computed(() =>
    dialogMode.value === "edit" ? "Save changes" : "Save entry",
  );
  const isDialogOpen = computed(() => dialogMode.value !== null);

  function beginTaskRequest(): number {
    taskRequestId += 1;
    return taskRequestId;
  }

  function isCurrentTaskRequest(requestId: number): boolean {
    return requestId === taskRequestId;
  }

  function clearDialogErrors(): void {
    dialogErrors.value = defaultFormErrors();
    dialogRequestErrorMessage.value = null;
  }

  function resetDialogState(): void {
    dialogMode.value = null;
    editingEntry.value = null;
    dialogProjectId.value = null;
    dialogTaskValue.value = null;
    dialogTaskOptions.value = [];
    dialogTaskSuggestions.value = [];
    dialogTasksErrorMessage.value = null;
    dialogNewTaskTitle.value = "";
    dialogStartedAt.value = null;
    dialogEndedAt.value = null;
    dialogDescription.value = "";
    dialogIsBillable.value = false;
    clearDialogErrors();
  }

  function openCreateDialogState(day: string | null = null): void {
    resetDialogState();
    dialogMode.value = "create";

    if (!day) {
      return;
    }

    dialogStartedAt.value = createLocalPresetDate(day, 9);
    dialogEndedAt.value = createLocalPresetDate(day, 10);
  }

  function openEditDialogState(entry: TimeEntryResponse): void {
    resetDialogState();
    dialogMode.value = "edit";
    editingEntry.value = entry;
    dialogProjectId.value = entry.projectId;
    dialogStartedAt.value = new Date(entry.startedAt);
    dialogEndedAt.value = entry.endedAt ? new Date(entry.endedAt) : null;
    dialogDescription.value = entry.description ?? "";
    dialogIsBillable.value = entry.isBillable;
  }

  function closeDialog(): void {
    resetDialogState();
  }

  function setProjectId(value: string | null): void {
    dialogProjectId.value = value;
    dialogTaskValue.value = null;
    dialogTaskOptions.value = [];
    dialogTaskSuggestions.value = [];
    dialogErrors.value.taskId = null;
    dialogTasksErrorMessage.value = null;
    dialogRequestErrorMessage.value = null;
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

  function updateTaskSuggestions(query: string, options = dialogTaskOptions.value): void {
    dialogTaskSuggestions.value = buildTaskLookupSuggestions(
      query,
      options,
      dialogProjectId.value,
    );
  }

  function setTaskValue(value: TaskLookupValue): void {
    dialogTaskValue.value = value;
    dialogErrors.value.taskId = null;
    dialogErrors.value.newTaskTitle = null;
    dialogRequestErrorMessage.value = null;

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

  function setStartedAt(value: Date | null): void {
    dialogStartedAt.value = value;
    dialogErrors.value.startedAt = null;
    dialogErrors.value.endedAt = null;
    dialogRequestErrorMessage.value = null;
  }

  function setEndedAt(value: Date | null): void {
    dialogEndedAt.value = value;
    dialogErrors.value.startedAt = null;
    dialogErrors.value.endedAt = null;
    dialogRequestErrorMessage.value = null;
  }

  function setDescription(value: string): void {
    dialogDescription.value = value;
    dialogErrors.value.description = null;
    dialogRequestErrorMessage.value = null;
  }

  function setNewTaskTitle(value: string): void {
    dialogNewTaskTitle.value = value;
    dialogErrors.value.newTaskTitle = null;
    dialogRequestErrorMessage.value = null;
  }

  function setIsBillable(value: boolean): void {
    dialogIsBillable.value = value;
    dialogRequestErrorMessage.value = null;
  }

  function setRequestError(message: string | null): void {
    dialogRequestErrorMessage.value = message;
  }

  function setNewTaskTitleError(message: string | null): void {
    dialogErrors.value.newTaskTitle = message;
  }

  function validateDialog(): ValidatedTimeEntryDialogInput | null {
    const nextErrors = defaultFormErrors();
    const selectedTask = activeDialogTask.value;
    const isCreatingNewTask = isNewTaskLookupOption(selectedTask);

    if (!dialogProjectId.value) {
      nextErrors.projectId = "Select a project.";
    }

    if (!selectedTask) {
      nextErrors.taskId = "Select a visible task.";
    }

    if (isCreatingNewTask) {
      const parsedTaskInput = createTaskSchema.safeParse({
        title: dialogNewTaskTitle.value.trim(),
      });

      if (!parsedTaskInput.success) {
        nextErrors.newTaskTitle =
          parsedTaskInput.error.flatten().fieldErrors.title?.[0] ??
          "Task title is invalid.";
      }
    }

    if (!dialogStartedAt.value) {
      nextErrors.startedAt = "Select a start date and time.";
    }

    if (!dialogEndedAt.value) {
      nextErrors.endedAt = "Select an end date and time.";
    }

    dialogErrors.value = nextErrors;

    if (
      !selectedTask ||
      !dialogProjectId.value ||
      !dialogStartedAt.value ||
      !dialogEndedAt.value ||
      nextErrors.newTaskTitle
    ) {
      return null;
    }

    const validatedTaskId = isCreatingNewTask
      ? dialogProjectId.value
      : selectedTask.id;
    const input = {
      description:
        dialogDescription.value.trim().length > 0
          ? dialogDescription.value.trim()
          : null,
      endedAt: dialogEndedAt.value.toISOString(),
      isBillable: dialogIsBillable.value,
      startedAt: dialogStartedAt.value.toISOString(),
      taskId: validatedTaskId,
    };
    const parsed = createManualTimeEntrySchema.safeParse(input);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;

      dialogErrors.value = {
        description: fieldErrors.description?.[0] ?? nextErrors.description,
        endedAt: fieldErrors.endedAt?.[0] ?? nextErrors.endedAt,
        newTaskTitle: nextErrors.newTaskTitle,
        projectId: nextErrors.projectId,
        startedAt: fieldErrors.startedAt?.[0] ?? nextErrors.startedAt,
        taskId: fieldErrors.taskId?.[0] ?? nextErrors.taskId,
      };
      return null;
    }

    return {
      ...input,
      taskId: selectedTask.id,
    };
  }

  return {
    beginTaskRequest,
    closeDialog,
    dialogDescription,
    dialogEndedAt,
    dialogErrors,
    dialogIsBillable,
    dialogMode,
    dialogNewTaskTitle,
    dialogProjectId,
    dialogRequestErrorMessage,
    dialogSaveLabel,
    dialogStartedAt,
    dialogSubtitle,
    dialogTaskOptions,
    dialogTasksErrorMessage,
    dialogTaskSuggestions,
    dialogTaskValue,
    dialogTitle,
    editingEntry,
    isCurrentTaskRequest,
    isDialogOpen,
    isLoadingDialogTasks,
    isNewTaskSelected,
    openCreateDialogState,
    openEditDialogState,
    setDescription,
    setEndedAt,
    setIsBillable,
    setNewTaskTitle,
    setNewTaskTitleError,
    setProjectId,
    setRequestError,
    setStartedAt,
    setTaskFromEntryFallback,
    setTaskOptions,
    setTasksError,
    setTasksLoading,
    setTaskValue,
    updateTaskSuggestions,
    validateDialog,
  };
}
