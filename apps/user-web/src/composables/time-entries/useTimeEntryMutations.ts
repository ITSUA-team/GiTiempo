import {
  updateTimeEntrySchema,
  type TaskResponse,
  type TimeEntryResponse,
} from "@gitiempo/shared";
import {
  createAppToast,
  getErrorMessage,
  type ToastLike,
} from "@gitiempo/web-shared";
import {
  useCreateManualTimeEntryMutation,
  useDeleteTimeEntryMutation,
  useUpdateTimeEntryMutation,
} from "@/composables/query";
import { ref, type ComputedRef } from "vue";

import type { UserServerStateScope } from "@/lib/query-keys";
import type { TimeEntriesClient } from "@/services/time-entries-client";

import type {
  TimeEntryDialogMode,
  ValidatedTimeEntryDialogInput,
} from "./useTimeEntryDialog";
import {
  isGitHubIssueTaskLookupOption,
  type TaskLookupOption,
} from "./time-entry-task-lookup";

interface SaveTimeEntryDialogOptions {
  editingEntry: TimeEntryResponse | null;
  input: ValidatedTimeEntryDialogInput;
  mode: TimeEntryDialogMode;
  selectedTask: TaskLookupOption | null;
}

interface SaveTimeEntryDialogResult {
  errorMessage: string | null;
  materializedTask: TaskResponse | null;
}

interface UseTimeEntryMutationsOptions {
  accessToken: ComputedRef<string | null>;
  client: TimeEntriesClient;
  scope: ComputedRef<UserServerStateScope>;
  toast: ToastLike;
}

export function useTimeEntryMutations({
  accessToken,
  client,
  scope,
  toast,
}: UseTimeEntryMutationsOptions) {
  const appToast = createAppToast(toast);
  const isSavingDialog = ref(false);
  const isDeletingEntry = ref<string | null>(null);
  const lastMutationErrorMessage = ref<string | null>(null);
  const createEntryMutation = useCreateManualTimeEntryMutation({
    accessToken,
    client,
    scope,
  });
  const updateEntryMutation = useUpdateTimeEntryMutation({
    accessToken,
    client,
    scope,
  });
  const deleteEntryMutation = useDeleteTimeEntryMutation({
    accessToken,
    client,
    scope,
  });

  async function saveDialogEntry({
    editingEntry,
    input,
    mode,
    selectedTask,
  }: SaveTimeEntryDialogOptions): Promise<SaveTimeEntryDialogResult> {
    isSavingDialog.value = true;
    lastMutationErrorMessage.value = null;

    try {
      let inputToSave = input;
      let materializedTask: TaskResponse | null = null;

      if (isGitHubIssueTaskLookupOption(selectedTask)) {
        materializedTask = await client.ensureGitHubIssueTask({
          projectId: selectedTask.projectId,
          issueNumber: selectedTask.githubIssue.issueNumber,
        });
        inputToSave = {
          ...input,
          taskId: materializedTask.id,
        };
      }

      if (mode === "edit" && editingEntry) {
        await updateEntryMutation.mutateAsync({
          entryId: editingEntry.id,
          input: updateTimeEntrySchema.parse(inputToSave),
        });
        appToast.showSuccessToast(
          "Time entry updated",
          "Your changes have been saved.",
        );
      } else {
        await createEntryMutation.mutateAsync(inputToSave);
        appToast.showSuccessToast(
          "Time entry created",
          "Your manual entry has been added.",
        );
      }

      return {
        errorMessage: null,
        materializedTask,
      };
    } catch (error) {
      const message = getErrorMessage(error);

      lastMutationErrorMessage.value = message;
      appToast.showErrorToast({
        detail: "Please review the dialog values and try again.",
        error,
        logContext: {
          action: mode === "edit" ? "update-entry" : "create-entry",
          feature: "time-entries",
        },
        summary:
          mode === "edit"
            ? "Could not update time entry"
            : "Could not create time entry",
      });
      return {
        errorMessage: message,
        materializedTask: null,
      };
    } finally {
      isSavingDialog.value = false;
    }
  }

  async function deleteEntry(entry: TimeEntryResponse): Promise<boolean> {
    isDeletingEntry.value = entry.id;
    lastMutationErrorMessage.value = null;

    try {
      await deleteEntryMutation.mutateAsync(entry.id);
      appToast.showSuccessToast(
        "Time entry deleted",
        "The selected entry has been removed.",
      );
      return true;
    } catch (error) {
      lastMutationErrorMessage.value = getErrorMessage(error);
      appToast.showErrorToast({
        detail: "Please try again.",
        error,
        logContext: { action: "delete-entry", feature: "time-entries" },
        summary: "Could not delete time entry",
      });
      return false;
    } finally {
      isDeletingEntry.value = null;
    }
  }

  return {
    deleteEntry,
    isDeletingEntry,
    isSavingDialog,
    lastMutationErrorMessage,
    saveDialogEntry,
  };
}
