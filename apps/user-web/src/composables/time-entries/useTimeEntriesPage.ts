import {
  createManualTimeEntrySchema,
  type ProjectResponse,
  type TaskResponse,
  type TimeEntryListQuery,
  type TimeEntryResponse,
  updateTimeEntrySchema,
} from "@gitiempo/shared";
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
  nextUtcDay,
  startOfUtcDay,
  type TimeEntriesDayGroup,
} from "@/lib/time-entry-display";
import { useAuthStore } from "@/stores/auth";

export type { TimeEntriesDayGroup } from "@/lib/time-entry-display";

type DialogMode = "create" | "edit" | null;
type TaskLookupValue = string | TaskLookupOption | null;

export interface TaskLookupOption {
  id: string;
  isActive: boolean;
  projectId: string;
  title: string;
}

interface TimeEntryFormErrors {
  description: string | null;
  endedAt: string | null;
  projectId: string | null;
  startedAt: string | null;
  taskId: string | null;
}

type ValidatedTimeEntryDialogInput = {
  description?: string | null;
  endedAt: string;
  isBillable: boolean;
  startedAt: string;
  taskId: string;
};

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

function defaultFormErrors(): TimeEntryFormErrors {
  return {
    description: null,
    endedAt: null,
    projectId: null,
    startedAt: null,
    taskId: null,
  };
}

function isTaskLookupOption(value: TaskLookupValue): value is TaskLookupOption {
  return typeof value === "object" && value !== null && "id" in value;
}

function toTaskLookupOption(task: TaskResponse): TaskLookupOption {
  return {
    id: task.id,
    isActive: task.isActive,
    projectId: task.projectId,
    title: task.title,
  };
}

function buildTaskLookupSuggestions(
  query: string,
  options: TaskLookupOption[],
): TaskLookupOption[] {
  const normalized = query.trim().toLowerCase();

  return normalized.length === 0
    ? [...options]
    : options.filter((task) => task.title.toLowerCase().includes(normalized));
}

function toEntryTaskOption(entry: TimeEntryResponse): TaskLookupOption {
  return {
    id: entry.task.id,
    isActive: true,
    projectId: entry.projectId,
    title: entry.task.title,
  };
}

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
  const currentPage = shallowRef(1);
  const pageSize = shallowRef(20);
  const selectedDateRange = shallowRef<Date[] | null>(null);
  const selectedProjectId = shallowRef<string | null>(null);
  const selectedTaskFilter = shallowRef<TaskLookupValue>(null);
  const filterTaskOptions = ref<TaskLookupOption[]>([]);
  const filterTaskSuggestions = ref<TaskLookupOption[]>([]);
  const isLoadingFilterTasks = shallowRef(false);
  const filterTasksErrorMessage = shallowRef<string | null>(null);
  const selectedTaskId = computed(() =>
    isTaskLookupOption(selectedTaskFilter.value) ? selectedTaskFilter.value.id : null,
  );
  const entryListQuery = computed<Partial<TimeEntryListQuery>>(() => {
    const [startDate, endDate] = selectedDateRange.value ?? [];
    const searchValue =
      typeof selectedTaskFilter.value === "string"
        ? selectedTaskFilter.value.trim()
        : isTaskLookupOption(selectedTaskFilter.value)
          ? selectedTaskFilter.value.title
          : "";

    return {
      dateFrom: startDate ? startOfUtcDay(startDate).toISOString() : undefined,
      dateTo: endDate ? nextUtcDay(endDate).toISOString() : undefined,
      limit: pageSize.value,
      page: currentPage.value,
      projectId: selectedProjectId.value ?? undefined,
      search: searchValue.length > 0 ? searchValue : undefined,
      taskId: selectedTaskId.value ?? undefined,
    };
  });

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

  const taskCache = new Map<string, TaskLookupOption[]>();
  let entriesRequestId = 0;
  let filterTaskRequestId = 0;
  let dialogTaskRequestId = 0;
  let tickHandle: ReturnType<typeof setInterval> | null = null;

  const pageState = computed(() => {
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

  function resetPagination(): void {
    currentPage.value = 1;
  }

  function setFilterPage(page: number): void {
    currentPage.value = page;
  }

  function setFilterDateRange(range: Date[] | null): void {
    selectedDateRange.value = range && range.length > 0 ? range : null;
  }

  function setFilterProjectId(projectId: string | null): void {
    selectedProjectId.value = projectId;
    selectedTaskFilter.value = null;
    filterTaskSuggestions.value = [];
    filterTasksErrorMessage.value = null;

    if (!projectId) {
      filterTaskOptions.value = [];
    }
  }

  function setFilterTaskValue(value: TaskLookupValue): void {
    selectedTaskFilter.value = value;
  }

  function setFilterTaskOptions(options: TaskLookupOption[]): void {
    filterTaskOptions.value = options;
  }

  function setFilterTasksLoading(isLoading: boolean): void {
    isLoadingFilterTasks.value = isLoading;
  }

  function setFilterTasksError(message: string | null): void {
    filterTasksErrorMessage.value = message;
  }

  function updateFilterTaskSuggestions(query: string, options: TaskLookupOption[]): void {
    filterTaskSuggestions.value = buildTaskLookupSuggestions(query, options);
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

  function setDialogProjectIdValue(value: string | null): void {
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

  function updateDialogTaskSuggestions(
    query: string,
    options = dialogTaskOptions.value,
  ): void {
    dialogTaskSuggestions.value = buildTaskLookupSuggestions(query, options);
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
      const fieldErrors = parsed.error.flatten().fieldErrors;

      dialogErrors.value = {
        description: fieldErrors.description?.[0] ?? nextErrors.description,
        endedAt: fieldErrors.endedAt?.[0] ?? nextErrors.endedAt,
        projectId: nextErrors.projectId,
        startedAt: fieldErrors.startedAt?.[0] ?? nextErrors.startedAt,
        taskId: fieldErrors.taskId?.[0] ?? nextErrors.taskId,
      };
      return null;
    }

    return input;
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
