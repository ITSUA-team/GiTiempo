import { type ProjectResponse, type TimeEntryResponse, updateTimeEntrySchema } from "@gitiempo/shared";
import {
  createAppConfirm,
  createAppToast,
  getErrorMessage,
  type ConfirmLike,
  type ToastLike,
} from "@gitiempo/web-shared";
import {
  useCreateManualTimeEntryMutation,
  useDeleteTimeEntryMutation,
  useOwnTimeEntriesQuery,
  useUpdateTimeEntryMutation,
  useVisibleProjectsQuery,
} from "@gitiempo/web-shared/query";
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";

import {
  createTimeEntriesClient,
  type TimeEntriesClient,
} from "@/services/time-entries-client";
import {
  formatTimeEntryDuration,
  formatTimeEntryTimeRange,
  groupTimeEntriesByUtcDay,
  type TimeEntriesDayGroup,
} from "@/lib/time-entry-display";
import { useTimeEntryDialog } from "@/composables/time-entries/useTimeEntryDialog";
import {
  toTaskLookupOption,
  useTimeEntriesFilters,
  type TaskLookupOption,
  type TaskLookupValue,
} from "@/composables/time-entries/useTimeEntriesFilters";
import { useAuthStore } from "@/stores/auth";

export type { TimeEntriesDayGroup } from "@/lib/time-entry-display";
export type { TaskLookupOption } from "@/composables/time-entries/useTimeEntriesFilters";

type PageState = "empty" | "loading" | "ready" | "request-error";

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

  const entries = ref<TimeEntryResponse[]>([]);
  const projects = ref<ProjectResponse[]>([]);
  const {
    currentPage,
    filterTaskOptions,
    filterTaskSuggestions,
    filterTasksErrorMessage,
    isLoadingFilterTasks,
    listQuery: entryListQuery,
    pageSize,
    resetPagination,
    selectedDateRange,
    selectedProjectId,
    selectedTaskFilter,
    setDateRange: setFilterDateRange,
    setFilterTaskOptions,
    setFilterTasksError,
    setFilterTasksLoading,
    setPage: setFilterPage,
    setSelectedProjectId: setFilterProjectId,
    setSelectedTaskFilter: setFilterTaskValue,
    updateFilterTaskSuggestions,
  } = useTimeEntriesFilters();

  const totalRecords = shallowRef(0);
  const totalPages = shallowRef(0);
  const nowMs = shallowRef(now());

  const isLoadingEntries = shallowRef(true);
  const isLoadingProjects = shallowRef(false);
  const isLoadingDialogTasks = shallowRef(false);
  const isSavingDialog = shallowRef(false);
  const isDeletingEntry = shallowRef<string | null>(null);

  const requestErrorMessage = shallowRef<string | null>(null);
  const projectsErrorMessage = shallowRef<string | null>(null);
  const lastMutationErrorMessage = shallowRef<string | null>(null);

  const {
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
    setDialogDescription,
    setDialogEndedAt,
    setDialogIsBillable,
    setDialogProjectId: setDialogProjectIdValue,
    setDialogStartedAt,
    setDialogTaskFromEntryFallback,
    setDialogTaskOptions,
    setDialogTasksError,
    setDialogTaskValue,
    updateDialogTaskSuggestions,
    validateDialog,
  } = useTimeEntryDialog();

  const taskCache = new Map<string, TaskLookupOption[]>();
  let entriesRequestId = 0;
  let filterTaskRequestId = 0;
  let dialogTaskRequestId = 0;
  let tickHandle: ReturnType<typeof setInterval> | null = null;

  const pageState = computed<PageState>(() => {
    if (isLoadingEntries.value) {
      return "loading";
    }

    if (requestErrorMessage.value) {
      return "request-error";
    }

    if (entries.value.length === 0) {
      return "empty";
    }

    return "ready";
  });

  const visibleProjects = computed(() => projects.value.filter((project) => project.isActive));
  const groupedEntries = computed<TimeEntriesDayGroup[]>(() =>
    groupTimeEntriesByUtcDay(entries.value, nowMs.value),
  );
  const hasRunningEntries = computed(() =>
    entries.value.some((entry) => entry.endedAt === null),
  );
  const visibleProjectsQuery = useVisibleProjectsQuery({
    accessToken: computed(() => authStore.accessToken),
    client,
    enabled: false,
  });
  const timeEntriesQuery = useOwnTimeEntriesQuery({
    accessToken: computed(() => authStore.accessToken),
    client,
    enabled: false,
    query: entryListQuery,
  });
  const createEntryMutation = useCreateManualTimeEntryMutation({
    accessToken: computed(() => authStore.accessToken),
    client,
  });
  const updateEntryMutation = useUpdateTimeEntryMutation({
    accessToken: computed(() => authStore.accessToken),
    client,
  });
  const deleteEntryMutation = useDeleteTimeEntryMutation({
    accessToken: computed(() => authStore.accessToken),
    client,
  });

  function requireAccessToken(): string {
    if (!authStore.accessToken) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    return authStore.accessToken;
  }

  function stopTicker(): void {
    if (tickHandle !== null) {
      clearIntervalFn(tickHandle);
      tickHandle = null;
    }
  }

  function syncTicker(): void {
    if (!hasRunningEntries.value) {
      stopTicker();
      return;
    }

    if (tickHandle !== null) {
      return;
    }

    tickHandle = setIntervalFn(() => {
      nowMs.value = now();
    }, 1000);
  }

  function updateTaskSuggestions(
    target: "dialog" | "filter",
    query: string,
    options: TaskLookupOption[],
  ): void {
    if (target === "filter") {
      updateFilterTaskSuggestions(query, options);
      return;
    }

    updateDialogTaskSuggestions(query, options);
  }

  async function ensureProjectsLoaded(force = false): Promise<ProjectResponse[]> {
    if (!force && projects.value.length > 0) {
      return projects.value;
    }

    isLoadingProjects.value = true;
    projectsErrorMessage.value = null;

    try {
      const result = await visibleProjectsQuery.refetch({ throwOnError: true });

      if (!result.data) {
        throw result.error ?? new Error("Could not load visible projects.");
      }

      projects.value = result.data;
      return projects.value;
    } catch (error) {
      projectsErrorMessage.value = getErrorMessage(error);
      appToast.showErrorToast({
        detail: "Please try again.",
        error,
        logContext: { action: "load-projects", feature: "time-entries" },
        summary: "Could not load visible projects",
      });
      throw error;
    } finally {
      isLoadingProjects.value = false;
    }
  }

  async function loadProjectTasks(
    projectId: string,
    target: "dialog" | "filter",
  ): Promise<TaskLookupOption[]> {
    const requestId =
      target === "dialog" ? ++dialogTaskRequestId : ++filterTaskRequestId;

    if (target === "dialog") {
      isLoadingDialogTasks.value = true;
      setDialogTasksError(null);
    } else {
      setFilterTasksLoading(true);
      setFilterTasksError(null);
    }

    try {
      const cached = taskCache.get(projectId);

      if (cached) {
        if (target === "dialog" && requestId === dialogTaskRequestId) {
          setDialogTaskOptions(cached);
        } else if (target === "filter" && requestId === filterTaskRequestId) {
          setFilterTaskOptions(cached);
        }
        return cached;
      }

      const nextTasks = (await client.listProjectTasks(requireAccessToken(), projectId))
        .filter((task) => task.isActive)
        .map(toTaskLookupOption);

      taskCache.set(projectId, nextTasks);

      if (target === "dialog" && requestId === dialogTaskRequestId) {
        setDialogTaskOptions(nextTasks);
      } else if (target === "filter" && requestId === filterTaskRequestId) {
        setFilterTaskOptions(nextTasks);
      }

      return nextTasks;
    } catch (error) {
      const message = getErrorMessage(error);

      if (target === "dialog" && requestId === dialogTaskRequestId) {
        setDialogTaskOptions([]);
        setDialogTasksError(message);
      } else if (target === "filter" && requestId === filterTaskRequestId) {
        setFilterTaskOptions([]);
        setFilterTasksError(message);
      }

      throw error;
    } finally {
      if (target === "dialog" && requestId === dialogTaskRequestId) {
        isLoadingDialogTasks.value = false;
      } else if (target === "filter" && requestId === filterTaskRequestId) {
        setFilterTasksLoading(false);
      }
    }
  }

  async function loadEntries(): Promise<void> {
    const requestId = ++entriesRequestId;

    isLoadingEntries.value = true;
    requestErrorMessage.value = null;

    try {
      const result = await timeEntriesQuery.refetch({ throwOnError: true });

      if (!result.data) {
        throw result.error ?? new Error("Could not load time entries.");
      }

      const response = result.data;

      if (requestId !== entriesRequestId) {
        return;
      }

      entries.value = response.items;
      currentPage.value = response.meta.page;
      pageSize.value = response.meta.limit;
      totalPages.value = response.meta.totalPages;
      totalRecords.value = response.meta.total;
      nowMs.value = now();
      syncTicker();
    } catch (error) {
      if (requestId === entriesRequestId) {
        entries.value = [];
        totalPages.value = 0;
        totalRecords.value = 0;
        stopTicker();
        requestErrorMessage.value = getErrorMessage(error);
        appToast.showErrorToast({
          detail: "Please try again.",
          error,
          logContext: { action: "load-entries", feature: "time-entries" },
          summary: "Could not load time entries",
        });
      }
    } finally {
      if (requestId === entriesRequestId) {
        isLoadingEntries.value = false;
      }
    }
  }

  async function refreshEntriesAfterMutation(): Promise<void> {
    await loadEntries();

    if (totalPages.value > 0 && currentPage.value > totalPages.value) {
      setFilterPage(totalPages.value);
      await loadEntries();
    }
  }

  function formatDuration(entry: TimeEntryResponse): string {
    return formatTimeEntryDuration(entry, nowMs.value);
  }

  function formatTimeRange(entry: TimeEntryResponse): string {
    return formatTimeEntryTimeRange(entry);
  }

  async function applyFilters(): Promise<void> {
    resetPagination();
    await loadEntries();
  }

  async function setDateRange(range: Date[] | null): Promise<void> {
    setFilterDateRange(range);
    await applyFilters();
  }

  async function setSelectedProjectId(projectId: string | null): Promise<void> {
    setFilterProjectId(projectId);

    if (!projectId) {
      await applyFilters();
      return;
    }

    try {
      await loadProjectTasks(projectId, "filter");
    } catch {
      // Filter task request error remains visible in the filter helper copy.
    }

    await applyFilters();
  }

  async function setSelectedTaskFilter(value: TaskLookupValue): Promise<void> {
    setFilterTaskValue(value);
    await applyFilters();
  }

  function handleFilterTaskSearch(query: string): void {
    const source = selectedProjectId.value
      ? filterTaskOptions.value
      : Array.from(taskCache.values()).flat();

    updateFilterTaskSuggestions(query, source);
  }

  async function setPage(page: number): Promise<void> {
    setFilterPage(page);
    await loadEntries();
  }

  async function setDialogProjectId(projectId: string | null): Promise<void> {
    setDialogProjectIdValue(projectId);

    if (!projectId) {
      return;
    }

    try {
      await loadProjectTasks(projectId, "dialog");
      updateTaskSuggestions("dialog", "", dialogTaskOptions.value);
    } catch {
      // Dialog keeps the request error visible for retryable correction.
    }
  }

  function handleDialogTaskSearch(query: string): void {
    updateTaskSuggestions("dialog", query, dialogTaskOptions.value);
  }

  async function openCreateDialog(day: string | null = null): Promise<void> {
    openCreateDialogState(day);

    try {
      await ensureProjectsLoaded();
    } catch {
      // Create mode can still open with the visible request error state.
    }

  }

  async function openEditDialog(entry: TimeEntryResponse): Promise<void> {
    openEditDialogState(entry);

    try {
      await ensureProjectsLoaded();
      const options = await loadProjectTasks(entry.projectId, "dialog");
      setDialogTaskValue(
        options.find((task) => task.id === entry.taskId) ?? {
          id: entry.task.id,
          isActive: true,
          projectId: entry.projectId,
          title: entry.task.title,
        },
      );
      updateTaskSuggestions("dialog", "", options);
    } catch {
      setDialogTaskFromEntryFallback(entry);
    }
  }

  async function saveDialog(): Promise<void> {
    const validInput = validateDialog();

    if (!validInput) {
      return;
    }

    isSavingDialog.value = true;
    dialogRequestErrorMessage.value = null;
    lastMutationErrorMessage.value = null;

    try {
      if (dialogMode.value === "edit" && editingEntry.value) {
        const updateInput = updateTimeEntrySchema.parse(validInput);

        await updateEntryMutation.mutateAsync({
          entryId: editingEntry.value.id,
          input: updateInput,
        });
        appToast.showSuccessToast(
          "Time entry updated",
          "Your changes have been saved.",
        );
      } else {
        await createEntryMutation.mutateAsync(validInput);
        appToast.showSuccessToast(
          "Time entry created",
          "Your manual entry has been added.",
        );
      }

      closeDialog();
      await refreshEntriesAfterMutation();
    } catch (error) {
      const message = getErrorMessage(error);

      dialogRequestErrorMessage.value = message;
      lastMutationErrorMessage.value = message;
      appToast.showErrorToast({
        detail: "Please review the dialog values and try again.",
        error,
        logContext: {
          action: dialogMode.value === "edit" ? "update-entry" : "create-entry",
          feature: "time-entries",
        },
        summary:
          dialogMode.value === "edit"
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
      await deleteEntryMutation.mutateAsync(entry.id);
      appToast.showSuccessToast(
        "Time entry deleted",
        "The selected entry has been removed.",
      );
      await refreshEntriesAfterMutation();
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
    await loadEntries();
  }

  onMounted(async () => {
    await Promise.allSettled([ensureProjectsLoaded(), loadEntries()]);
  });

  onBeforeUnmount(() => {
    stopTicker();
  });

  return {
    closeDialog,
    currentPage,
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
    dialogTasksErrorMessage,
    dialogTaskSuggestions,
    dialogTaskValue,
    dialogTitle,
    entries,
    filterTaskSuggestions,
    filterTasksErrorMessage,
    formatDuration,
    formatTimeRange,
    groupedEntries,
    handleDialogTaskSearch,
    handleFilterTaskSearch,
    isDeletingEntry,
    isDialogOpen,
    isLoadingDialogTasks,
    isLoadingEntries,
    isLoadingFilterTasks,
    isLoadingProjects,
    isSavingDialog,
    lastMutationErrorMessage,
    openCreateDialog,
    openEditDialog,
    pageSize,
    pageState,
    projectsErrorMessage,
    requestDeleteEntry,
    requestErrorMessage,
    retryLoadEntries,
    saveDialog,
    selectedDateRange,
    selectedProjectId,
    selectedTaskFilter,
    setDateRange,
    setDialogDescription,
    setDialogEndedAt,
    setDialogIsBillable,
    setDialogProjectId,
    setDialogStartedAt,
    setDialogTaskValue,
    setPage,
    setSelectedProjectId,
    setSelectedTaskFilter,
    totalRecords,
    totalPages,
    visibleProjects,
  };
}
