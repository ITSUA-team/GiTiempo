import type { TimeEntryResponse } from "@gitiempo/shared";
import {
  createAppConfirm,
  type ConfirmLike,
} from "@gitiempo/web-shared";
import { computed } from "vue";

import type { useTimeEntryDialog } from "./useTimeEntryDialog";
import type { useTimeEntryMutations } from "./useTimeEntryMutations";

interface UseTimeEntryDeleteConfirmationOptions {
  confirm: ConfirmLike;
  dialog: ReturnType<typeof useTimeEntryDialog>;
  mutations: ReturnType<typeof useTimeEntryMutations>;
}

export function useTimeEntryDeleteConfirmation({
  confirm,
  dialog,
  mutations,
}: UseTimeEntryDeleteConfirmationOptions) {
  const appConfirm = createAppConfirm(confirm);
  const isDeletingDialogEntry = computed(() => {
    const entry = dialog.editingEntry.value;

    return !!entry && mutations.isDeletingEntry.value === entry.id;
  });

  function requestDeleteEntry(
    entry: TimeEntryResponse,
    options: { closeDialogOnSuccess?: boolean } = {},
  ): void {
    appConfirm.confirmDestructive({
      accept: async () => {
        const wasDeleted = await mutations.deleteEntry(entry);

        if (
          wasDeleted &&
          options.closeDialogOnSuccess === true &&
          dialog.editingEntry.value?.id === entry.id
        ) {
          dialog.closeDialog();
        }
      },
      acceptLabel: "Delete",
      header: "Delete entry?",
      message: "This time entry will be permanently deleted.",
    });
  }

  function requestDeleteDialogEntry(): void {
    const entry = dialog.editingEntry.value;

    if (!entry || dialog.dialogMode.value !== "edit") {
      return;
    }

    requestDeleteEntry(entry, { closeDialogOnSuccess: true });
  }

  return {
    isDeletingDialogEntry,
    requestDeleteDialogEntry,
    requestDeleteEntry,
  };
}
