import type { TimeEntryResponse } from "@gitiempo/shared";
import { computed, ref, shallowRef } from "vue";

import { createTimeEntryDialogDayPreset } from "./timeEntryDialogPresets";
import {
  createDefaultTimeEntryFormErrors,
  type TimeEntryFormErrors,
} from "./timeEntryDialogValidation";

export type TimeEntryDialogMode = "create" | "edit" | null;

export function useTimeEntryDialogState() {
  const dialogMode = ref<TimeEntryDialogMode>(null);
  const editingEntry = shallowRef<TimeEntryResponse | null>(null);
  const dialogProjectId = ref<string | null>(null);
  const dialogStartedAt = shallowRef<Date | null>(null);
  const dialogEndedAt = shallowRef<Date | null>(null);
  const dialogDescription = ref("");
  const dialogIsBillable = ref(false);
  const dialogNewTaskTitle = ref("");
  const dialogErrors = ref<TimeEntryFormErrors>(
    createDefaultTimeEntryFormErrors(),
  );
  const dialogRequestErrorMessage = ref<string | null>(null);
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
    dialogErrors.value = createDefaultTimeEntryFormErrors();
    dialogRequestErrorMessage.value = null;
  }

  function clearTaskValidationError(): void {
    dialogErrors.value.newTaskTitle = null;
    dialogErrors.value.taskId = null;
  }

  function clearRequestError(): void {
    dialogRequestErrorMessage.value = null;
  }

  function resetDialogState(): void {
    dialogMode.value = null;
    editingEntry.value = null;
    dialogProjectId.value = null;
    dialogStartedAt.value = null;
    dialogEndedAt.value = null;
    dialogDescription.value = "";
    dialogIsBillable.value = false;
    dialogNewTaskTitle.value = "";
    clearDialogErrors();
  }

  function openCreateDialogState(day: string | null = null): void {
    resetDialogState();
    dialogMode.value = "create";
    const preset = createTimeEntryDialogDayPreset(day);

    dialogStartedAt.value = preset.startedAt;
    dialogEndedAt.value = preset.endedAt;
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
    clearTaskValidationError();
    clearRequestError();
  }

  function setStartedAt(value: Date | null): void {
    dialogStartedAt.value = value;
    dialogErrors.value.startedAt = null;
    dialogErrors.value.endedAt = null;
    clearRequestError();
  }

  function setEndedAt(value: Date | null): void {
    dialogEndedAt.value = value;
    dialogErrors.value.startedAt = null;
    dialogErrors.value.endedAt = null;
    clearRequestError();
  }

  function setDescription(value: string): void {
    dialogDescription.value = value;
    dialogErrors.value.description = null;
    clearRequestError();
  }

  function setNewTaskTitle(value: string): void {
    dialogNewTaskTitle.value = value;
    dialogErrors.value.newTaskTitle = null;
    clearRequestError();
  }

  function setIsBillable(value: boolean): void {
    dialogIsBillable.value = value;
    clearRequestError();
  }

  function setRequestError(message: string | null): void {
    dialogRequestErrorMessage.value = message;
  }

  function setNewTaskTitleError(message: string | null): void {
    dialogErrors.value.newTaskTitle = message;
  }

  return {
    clearDialogErrors,
    clearRequestError,
    clearTaskValidationError,
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
    dialogTitle,
    editingEntry,
    isDialogOpen,
    openCreateDialogState,
    openEditDialogState,
    resetDialogState,
    setDescription,
    setEndedAt,
    setIsBillable,
    setNewTaskTitle,
    setNewTaskTitleError,
    setProjectId,
    setRequestError,
    setStartedAt,
  };
}

export type TimeEntryDialogState = ReturnType<typeof useTimeEntryDialogState>;
