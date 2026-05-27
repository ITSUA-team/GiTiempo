import { updateTimeEntrySchema, type TimeEntryResponse } from "@gitiempo/shared";
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
import { shallowRef, type ComputedRef } from "vue";

import type { UserServerStateScope } from "@/lib/query-keys";
import type { TimeEntriesClient } from "@/services/time-entries-client";

import type {
  TimeEntryDialogMode,
  ValidatedTimeEntryDialogInput,
} from "./useTimeEntryDialog";

interface SaveTimeEntryDialogOptions {
  editingEntry: TimeEntryResponse | null;
  input: ValidatedTimeEntryDialogInput;
  mode: TimeEntryDialogMode;
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
  const isSavingDialog = shallowRef(false);
  const isDeletingEntry = shallowRef<string | null>(null);
  const lastMutationErrorMessage = shallowRef<string | null>(null);
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
  }: SaveTimeEntryDialogOptions): Promise<string | null> {
    isSavingDialog.value = true;
    lastMutationErrorMessage.value = null;

    try {
      if (mode === "edit" && editingEntry) {
        await updateEntryMutation.mutateAsync({
          entryId: editingEntry.id,
          input: updateTimeEntrySchema.parse(input),
        });
        appToast.showSuccessToast(
          "Time entry updated",
          "Your changes have been saved.",
        );
      } else {
        await createEntryMutation.mutateAsync(input);
        appToast.showSuccessToast(
          "Time entry created",
          "Your manual entry has been added.",
        );
      }

      return null;
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
      return message;
    } finally {
      isSavingDialog.value = false;
    }
  }

  async function deleteEntry(entry: TimeEntryResponse): Promise<void> {
    isDeletingEntry.value = entry.id;
    lastMutationErrorMessage.value = null;

    try {
      await deleteEntryMutation.mutateAsync(entry.id);
      appToast.showSuccessToast(
        "Time entry deleted",
        "The selected entry has been removed.",
      );
    } catch (error) {
      lastMutationErrorMessage.value = getErrorMessage(error);
      appToast.showErrorToast({
        detail: "Please try again.",
        error,
        logContext: { action: "delete-entry", feature: "time-entries" },
        summary: "Could not delete time entry",
      });
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
