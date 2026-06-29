import type { TimeEntryResponse } from "@gitiempo/shared";

import {
  validateTimeEntryDialogInput,
  type ValidatedTimeEntryDialogInput,
} from "./timeEntryDialogValidation";
import { useTimeEntryDialogState } from "./useTimeEntryDialogState";
import { useTimeEntryTaskLookupState } from "./useTimeEntryTaskLookupState";

export type { TimeEntryDialogMode } from "./useTimeEntryDialogState";
export type {
  TimeEntryFormErrors,
  ValidatedTimeEntryDialogInput,
} from "./timeEntryDialogValidation";

export function useTimeEntryDialog() {
  const state = useTimeEntryDialogState();
  const taskLookup = useTimeEntryTaskLookupState({
    clearRequestError: state.clearRequestError,
    clearTaskValidationError: state.clearTaskValidationError,
    dialogIsBillable: state.dialogIsBillable,
    dialogMode: state.dialogMode,
  });

  function openCreateDialogState(day: string | null = null): void {
    taskLookup.resetTaskLookupState();
    state.openCreateDialogState(day);
  }

  function openEditDialogState(entry: TimeEntryResponse): void {
    taskLookup.resetTaskLookupState();
    state.openEditDialogState(entry);
  }

  function closeDialog(): void {
    taskLookup.resetTaskLookupState();
    state.closeDialog();
  }

  function setProjectId(value: string | null): void {
    state.setProjectId(value);
    taskLookup.resetTaskLookupState();
  }

  function validateDialog(): ValidatedTimeEntryDialogInput | null {
    const { errors, input } = validateTimeEntryDialogInput({
      description: state.dialogDescription.value,
      endedAt: state.dialogEndedAt.value,
      isBillable: state.dialogIsBillable.value,
      projectId: state.dialogProjectId.value,
      selectedTask: taskLookup.activeDialogTask.value,
      startedAt: state.dialogStartedAt.value,
    });

    state.dialogErrors.value = errors;
    return input;
  }

  return {
    beginTaskRequest: taskLookup.beginTaskRequest,
    closeDialog,
    dialogDescription: state.dialogDescription,
    dialogEndedAt: state.dialogEndedAt,
    dialogErrors: state.dialogErrors,
    dialogIsBillable: state.dialogIsBillable,
    dialogMode: state.dialogMode,
    dialogProjectId: state.dialogProjectId,
    dialogRequestErrorMessage: state.dialogRequestErrorMessage,
    dialogSaveLabel: state.dialogSaveLabel,
    dialogStartedAt: state.dialogStartedAt,
    dialogSubtitle: state.dialogSubtitle,
    dialogTaskOptions: taskLookup.dialogTaskOptions,
    dialogTasksErrorMessage: taskLookup.dialogTasksErrorMessage,
    dialogTaskSuggestions: taskLookup.dialogTaskSuggestions,
    dialogTaskValue: taskLookup.dialogTaskValue,
    dialogTitle: state.dialogTitle,
    editingEntry: state.editingEntry,
    isCurrentTaskRequest: taskLookup.isCurrentTaskRequest,
    isDialogOpen: state.isDialogOpen,
    isLoadingDialogTasks: taskLookup.isLoadingDialogTasks,
    openCreateDialogState,
    openEditDialogState,
    setDescription: state.setDescription,
    setEndedAt: state.setEndedAt,
    setIsBillable: state.setIsBillable,
    setProjectId,
    setRequestError: state.setRequestError,
    setStartedAt: state.setStartedAt,
    setTaskFromEntryFallback: taskLookup.setTaskFromEntryFallback,
    setTaskOptions: taskLookup.setTaskOptions,
    setTasksError: taskLookup.setTasksError,
    setTasksLoading: taskLookup.setTasksLoading,
    setTaskValue: taskLookup.setTaskValue,
    updateTaskSuggestions: taskLookup.updateTaskSuggestions,
    validateDialog,
  };
}
