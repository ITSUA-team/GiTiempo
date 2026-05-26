import { updateTimeEntrySchema, type TimeEntryResponse } from "@gitiempo/shared";
import {
  createAppConfirm,
  createAppToast,
  getErrorMessage,
  type ConfirmLike,
  type ToastLike,
} from "@gitiempo/web-shared";
import { computed, onBeforeUnmount, onMounted, shallowRef } from "vue";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";

import {
  createTimeEntriesClient,
  type TimeEntriesClient,
} from "@/services/time-entries-client";
import { useAuthStore } from "@/stores/auth";

import {
  type TaskLookupValue,
  type TaskLookupOption,
} from "./time-entry-task-lookup";
import { useTimeEntriesData } from "./useTimeEntriesData";
import { useTimeEntryDialog } from "./useTimeEntryDialog";
import { useTimeEntryFilters } from "./useTimeEntryFilters";

export type { TimeEntriesDayGroup } from "@/lib/time-entry-display";
export type { TaskLookupOption, TaskLookupValue } from "./time-entry-task-lookup";

interface UseTimeEntriesPageOptions {
  authStore?: ReturnType<typeof useAuthStore>;
  client?: TimeEntriesClient;
  confirm?: ConfirmLike;
  now?: () => number;
  setIntervalFn?: typeof setInterval;
  clearIntervalFn?: typeof clearInterval;
  toast?: ToastLike;
}

const defaultClient = createTimeEntriesClient({
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
});

export function useTimeEntriesPage(options: UseTimeEntriesPageOptions = {}) {
  const authStore = options.authStore ?? useAuthStore();
  const client = options.client ?? defaultClient;
  const confirm = options.confirm ?? useConfirm();
  const toast = options.toast ?? useToast();
  const appConfirm = createAppConfirm(confirm);
  const appToast = createAppToast(toast);
  const now = options.now ?? (() => Date.now());
  const setIntervalFn = options.setIntervalFn ?? setInterval;
  const clearIntervalFn = options.clearIntervalFn ?? clearInterval;

  const filters = useTimeEntryFilters();
  const dialog = useTimeEntryDialog();
  const isSavingDialog = shallowRef(false);
  const isDeletingEntry = shallowRef<string | null>(null);
  const lastMutationErrorMessage = shallowRef<string | null>(null);

  const data = useTimeEntriesData({
    accessToken: computed(() => authStore.accessToken),
    clearIntervalFn,
    client,
    currentPage: filters.currentPage,
    entryListQuery: filters.entryListQuery,
    now,
    onLoadEntriesError(error) {
      appToast.showErrorToast({
        detail: "Please try again.",
        error,
        logContext: { action: "load-entries", feature: "time-entries" },
        summary: "Could not load time entries",
      });
    },
    onLoadProjectsError(error) {
      appToast.showErrorToast({
        detail: "Please try again.",
        error,
        logContext: { action: "load-projects", feature: "time-entries" },
        summary: "Could not load visible projects",
      });
    },
    pageSize: filters.pageSize,
    setIntervalFn,
  });

  async function loadFilterProjectTasks(projectId: string): Promise<TaskLookupOption[]> {
    const requestId = filters.beginTaskRequest();

    filters.setTasksLoading(true);
    filters.setTasksError(null);

    try {
      const tasks = await data.loadProjectTasks(projectId);

      if (filters.isCurrentTaskRequest(requestId)) {
        filters.setTaskOptions(tasks);
      }

      return tasks;
    } catch (error) {
      if (filters.isCurrentTaskRequest(requestId)) {
        filters.setTaskOptions([]);
        filters.setTasksError(getErrorMessage(error));
      }

      throw error;
    } finally {
      if (filters.isCurrentTaskRequest(requestId)) {
        filters.setTasksLoading(false);
      }
    }
  }

  async function loadDialogProjectTasks(projectId: string): Promise<TaskLookupOption[]> {
    const requestId = dialog.beginTaskRequest();

    dialog.setTasksLoading(true);
    dialog.setTasksError(null);

    try {
      const tasks = await data.loadProjectTasks(projectId);

      if (dialog.isCurrentTaskRequest(requestId)) {
        dialog.setTaskOptions(tasks);
      }

      return tasks;
    } catch (error) {
      if (dialog.isCurrentTaskRequest(requestId)) {
        dialog.setTaskOptions([]);
        dialog.setTasksError(getErrorMessage(error));
      }

      throw error;
    } finally {
      if (dialog.isCurrentTaskRequest(requestId)) {
        dialog.setTasksLoading(false);
      }
    }
  }

  async function applyFilters(): Promise<void> {
    filters.resetPagination();
    await data.loadEntries();
  }

  async function setDateRange(range: Date[] | null): Promise<void> {
    filters.setDateRange(range);
    await applyFilters();
  }

  async function setSelectedProjectId(projectId: string | null): Promise<void> {
    filters.setProjectId(projectId);

    if (!projectId) {
      await applyFilters();
      return;
    }

    try {
      await loadFilterProjectTasks(projectId);
    } catch {
      // Filter task request error remains visible in the filter helper copy.
    }

    await applyFilters();
  }

  async function setSelectedTaskFilter(value: TaskLookupValue): Promise<void> {
    filters.setTaskValue(value);
    await applyFilters();
  }

  function handleFilterTaskSearch(query: string): void {
    const source = filters.selectedProjectId.value
      ? filters.filterTaskOptions.value
      : data.getCachedTaskOptions();

    filters.updateTaskSuggestions(query, source);
  }

  async function setPage(page: number): Promise<void> {
    filters.setPage(page);
    await data.loadEntries();
  }

  async function setDialogProjectId(projectId: string | null): Promise<void> {
    dialog.setProjectId(projectId);

    if (!projectId) {
      return;
    }

    try {
      const tasks = await loadDialogProjectTasks(projectId);

      if (dialog.dialogProjectId.value === projectId) {
        dialog.updateTaskSuggestions("", tasks);
      }
    } catch {
      // Dialog keeps the request error visible for retryable correction.
    }
  }

  function handleDialogTaskSearch(query: string): void {
    dialog.updateTaskSuggestions(query);
  }

  async function openCreateDialog(day: string | null = null): Promise<void> {
    dialog.openCreateDialogState(day);

    try {
      await data.ensureProjectsLoaded();
    } catch {
      // Create mode can still open with the visible request error state.
    }
  }

  async function openEditDialog(entry: TimeEntryResponse): Promise<void> {
    dialog.openEditDialogState(entry);

    try {
      await data.ensureProjectsLoaded();
      const options = await loadDialogProjectTasks(entry.projectId);
      dialog.setTaskValue(
        options.find((task) => task.id === entry.taskId) ?? {
          id: entry.task.id,
          isActive: true,
          projectId: entry.projectId,
          title: entry.task.title,
        },
      );
      dialog.updateTaskSuggestions("", options);
    } catch {
      dialog.setTaskFromEntryFallback(entry);
    }
  }

  async function saveDialog(): Promise<void> {
    const validInput = dialog.validateDialog();

    if (!validInput) {
      return;
    }

    isSavingDialog.value = true;
    dialog.setRequestError(null);
    lastMutationErrorMessage.value = null;

    try {
      if (dialog.dialogMode.value === "edit" && dialog.editingEntry.value) {
        const updateInput = updateTimeEntrySchema.parse(validInput);

        await data.updateEntryMutation.mutateAsync({
          entryId: dialog.editingEntry.value.id,
          input: updateInput,
        });
        appToast.showSuccessToast(
          "Time entry updated",
          "Your changes have been saved.",
        );
      } else {
        await data.createEntryMutation.mutateAsync(validInput);
        appToast.showSuccessToast(
          "Time entry created",
          "Your manual entry has been added.",
        );
      }

      dialog.closeDialog();
      await data.refreshEntriesAfterMutation();
    } catch (error) {
      const message = getErrorMessage(error);

      dialog.setRequestError(message);
      lastMutationErrorMessage.value = message;
      appToast.showErrorToast({
        detail: "Please review the dialog values and try again.",
        error,
        logContext: {
          action: dialog.dialogMode.value === "edit" ? "update-entry" : "create-entry",
          feature: "time-entries",
        },
        summary:
          dialog.dialogMode.value === "edit"
            ? "Could not update time entry"
            : "Could not create time entry",
      });
    } finally {
      isSavingDialog.value = false;
    }
  }

  async function deleteEntry(entry: TimeEntryResponse): Promise<void> {
    isDeletingEntry.value = entry.id;
    lastMutationErrorMessage.value = null;

    try {
      await data.deleteEntryMutation.mutateAsync(entry.id);
      appToast.showSuccessToast(
        "Time entry deleted",
        "The selected entry has been removed.",
      );
      await data.refreshEntriesAfterMutation();
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

  function requestDeleteEntry(entry: TimeEntryResponse): void {
    appConfirm.confirmDestructive({
      accept: async () => deleteEntry(entry),
      acceptLabel: "Delete",
      header: "Delete entry?",
      message: "This time entry will be permanently deleted.",
    });
  }

  async function retryLoadEntries(): Promise<void> {
    await data.loadEntries();
  }

  onMounted(async () => {
    await Promise.allSettled([data.ensureProjectsLoaded(), data.loadEntries()]);
  });

  onBeforeUnmount(() => {
    data.stopTicker();
  });

  return {
    closeDialog: dialog.closeDialog,
    currentPage: filters.currentPage,
    dialogDescription: dialog.dialogDescription,
    dialogEndedAt: dialog.dialogEndedAt,
    dialogErrors: dialog.dialogErrors,
    dialogIsBillable: dialog.dialogIsBillable,
    dialogMode: dialog.dialogMode,
    dialogProjectId: dialog.dialogProjectId,
    dialogRequestErrorMessage: dialog.dialogRequestErrorMessage,
    dialogSaveLabel: dialog.dialogSaveLabel,
    dialogStartedAt: dialog.dialogStartedAt,
    dialogSubtitle: dialog.dialogSubtitle,
    dialogTasksErrorMessage: dialog.dialogTasksErrorMessage,
    dialogTaskSuggestions: dialog.dialogTaskSuggestions,
    dialogTaskValue: dialog.dialogTaskValue,
    dialogTitle: dialog.dialogTitle,
    entries: data.entries,
    filterTaskSuggestions: filters.filterTaskSuggestions,
    filterTasksErrorMessage: filters.filterTasksErrorMessage,
    formatDuration: data.formatDuration,
    formatTimeRange: data.formatTimeRange,
    groupedEntries: data.groupedEntries,
    handleDialogTaskSearch,
    handleFilterTaskSearch,
    isDeletingEntry,
    isDialogOpen: dialog.isDialogOpen,
    isLoadingDialogTasks: dialog.isLoadingDialogTasks,
    isLoadingEntries: data.isLoadingEntries,
    isLoadingFilterTasks: filters.isLoadingFilterTasks,
    isLoadingProjects: data.isLoadingProjects,
    isSavingDialog,
    lastMutationErrorMessage,
    openCreateDialog,
    openEditDialog,
    pageSize: filters.pageSize,
    pageState: data.pageState,
    projectsErrorMessage: data.projectsErrorMessage,
    requestDeleteEntry,
    requestErrorMessage: data.requestErrorMessage,
    retryLoadEntries,
    saveDialog,
    selectedDateRange: filters.selectedDateRange,
    selectedProjectId: filters.selectedProjectId,
    selectedTaskFilter: filters.selectedTaskFilter,
    setDateRange,
    setDialogDescription: dialog.setDescription,
    setDialogEndedAt: dialog.setEndedAt,
    setDialogIsBillable: dialog.setIsBillable,
    setDialogProjectId,
    setDialogStartedAt: dialog.setStartedAt,
    setDialogTaskValue: dialog.setTaskValue,
    setPage,
    setSelectedProjectId,
    setSelectedTaskFilter,
    totalRecords: data.totalRecords,
    totalPages: data.totalPages,
    visibleProjects: data.visibleProjects,
  };
}
