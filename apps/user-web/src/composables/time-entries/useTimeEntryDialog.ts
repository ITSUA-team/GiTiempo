import { createManualTimeEntrySchema, type TimeEntryResponse } from "@gitiempo/shared";
import { computed, ref, shallowRef } from "vue";

import {
  isTaskLookupOption,
  type TaskLookupOption,
  type TaskLookupValue,
} from "@/composables/time-entries/useTimeEntriesFilters";

type DialogMode = "create" | "edit" | null;

interface TimeEntryFormErrors {
  description: string | null;
  endedAt: string | null;
  projectId: string | null;
  startedAt: string | null;
  taskId: string | null;
}

type ValidatedTimeEntryDialogInput = {
  endedAt: string;
  isBillable: boolean;
  startedAt: string;
  taskId: string;
  description?: string | null;
};

const defaultFormErrors = (): TimeEntryFormErrors => ({
  description: null,
  endedAt: null,
  projectId: null,
  startedAt: null,
  taskId: null,
});

function toEntryTaskOption(entry: TimeEntryResponse): TaskLookupOption {
  return {
    id: entry.task.id,
    isActive: true,
    projectId: entry.projectId,
    title: entry.task.title,
  };
}

export function useTimeEntryDialog() {
  const dialogMode = shallowRef<DialogMode>(null);
  const editingEntry = shallowRef<TimeEntryResponse | null>(null);
  const dialogProjectId = shallowRef<string | null>(null);
  const dialogTaskValue = shallowRef<TaskLookupValue>(null);
  const dialogStartedAt = shallowRef<Date | null>(null);
  const dialogEndedAt = shallowRef<Date | null>(null);
  const dialogDescription = shallowRef("");
  const dialogIsBillable = shallowRef(false);
  const dialogErrors = ref<TimeEntryFormErrors>(defaultFormErrors());
  const dialogRequestErrorMessage = shallowRef<string | null>(null);
  const dialogTaskOptions = ref<TaskLookupOption[]>([]);
  const dialogTaskSuggestions = ref<TaskLookupOption[]>([]);
  const dialogTasksErrorMessage = shallowRef<string | null>(null);

  const activeDialogTask = computed(() =>
    isTaskLookupOption(dialogTaskValue.value) ? dialogTaskValue.value : null,
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

    dialogStartedAt.value = new Date(`${day}T09:00:00.000Z`);
    dialogEndedAt.value = new Date(`${day}T10:00:00.000Z`);
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

  function setDialogProjectId(value: string | null): void {
    dialogProjectId.value = value;
    dialogTaskValue.value = null;
    dialogTaskOptions.value = [];
    dialogTaskSuggestions.value = [];
    dialogErrors.value.taskId = null;
    dialogTasksErrorMessage.value = null;
    dialogRequestErrorMessage.value = null;
  }

  function setDialogTaskOptions(options: TaskLookupOption[]): void {
    dialogTaskOptions.value = options;
  }

  function setDialogTasksError(message: string | null): void {
    dialogTasksErrorMessage.value = message;
  }

  function updateDialogTaskSuggestions(query: string, options = dialogTaskOptions.value): void {
    const normalized = query.trim().toLowerCase();
    dialogTaskSuggestions.value = normalized.length === 0
      ? [...options]
      : options.filter((task) => task.title.toLowerCase().includes(normalized));
  }

  function setDialogTaskValue(value: TaskLookupValue): void {
    dialogTaskValue.value = value;
    dialogErrors.value.taskId = null;
    dialogRequestErrorMessage.value = null;
  }

  function setDialogTaskFromEntryFallback(entry: TimeEntryResponse): void {
    setDialogTaskValue(toEntryTaskOption(entry));
  }

  function setDialogStartedAt(value: Date | null): void {
    dialogStartedAt.value = value;
    dialogErrors.value.startedAt = null;
    dialogErrors.value.endedAt = null;
    dialogRequestErrorMessage.value = null;
  }

  function setDialogEndedAt(value: Date | null): void {
    dialogEndedAt.value = value;
    dialogErrors.value.startedAt = null;
    dialogErrors.value.endedAt = null;
    dialogRequestErrorMessage.value = null;
  }

  function setDialogDescription(value: string): void {
    dialogDescription.value = value;
    dialogErrors.value.description = null;
    dialogRequestErrorMessage.value = null;
  }

  function setDialogIsBillable(value: boolean): void {
    dialogIsBillable.value = value;
    dialogRequestErrorMessage.value = null;
  }

  function validateDialog(): ValidatedTimeEntryDialogInput | null {
    const nextErrors = defaultFormErrors();
    const selectedTask = activeDialogTask.value;

    if (!dialogProjectId.value) {
      nextErrors.projectId = "Select a project.";
    }

    if (!selectedTask) {
      nextErrors.taskId = "Select a visible task.";
    }

    if (!dialogStartedAt.value) {
      nextErrors.startedAt = "Select a start date and time.";
    }

    if (!dialogEndedAt.value) {
      nextErrors.endedAt = "Select an end date and time.";
    }

    dialogErrors.value = nextErrors;

    if (!selectedTask || !dialogStartedAt.value || !dialogEndedAt.value) {
      return null;
    }

    const input = {
      description:
        dialogDescription.value.trim().length > 0
          ? dialogDescription.value.trim()
          : null,
      endedAt: dialogEndedAt.value.toISOString(),
      isBillable: dialogIsBillable.value,
      startedAt: dialogStartedAt.value.toISOString(),
      taskId: selectedTask.id,
    };
    const parsed = createManualTimeEntrySchema.safeParse(input);

    if (!parsed.success) {
      dialogErrors.value = {
        description:
          parsed.error.flatten().fieldErrors.description?.[0] ?? nextErrors.description,
        endedAt: parsed.error.flatten().fieldErrors.endedAt?.[0] ?? nextErrors.endedAt,
        projectId: nextErrors.projectId,
        startedAt:
          parsed.error.flatten().fieldErrors.startedAt?.[0] ?? nextErrors.startedAt,
        taskId: parsed.error.flatten().fieldErrors.taskId?.[0] ?? nextErrors.taskId,
      };
      return null;
    }

    return input;
  }

  return {
    activeDialogTask,
    clearDialogErrors,
    closeDialog,
    dialogDescription,
    dialogEndedAt,
    dialogErrors,
    dialogIsBillable,
    dialogMode,
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
    isDialogOpen,
    openCreateDialogState,
    openEditDialogState,
    resetDialogState,
    setDialogDescription,
    setDialogEndedAt,
    setDialogIsBillable,
    setDialogProjectId,
    setDialogStartedAt,
    setDialogTaskFromEntryFallback,
    setDialogTaskOptions,
    setDialogTasksError,
    setDialogTaskValue,
    updateDialogTaskSuggestions,
    validateDialog,
  };
}
