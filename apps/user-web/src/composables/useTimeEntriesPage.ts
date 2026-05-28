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
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";

import {
  createTimeEntriesClient,
  type TimeEntriesClient,
} from "@/services/time-entries-client";
import { useAuthStore } from "@/stores/auth";
import {
  subscribeToTimeEntryTimerSync,
  type TimeEntryTimerSyncEvent,
} from "@/composables/timeEntryTimerSync";
import { compareTimeEntriesByRecency } from "@/composables/timeEntryListOrder";

type TaskLookupValue = string | TaskLookupOption | null;
type PageState = "empty" | "loading" | "ready" | "request-error";
type DialogMode = "create" | "edit" | null;

export interface TaskLookupOption {
  id: string;
  isActive: boolean;
  projectId: string;
  title: string;
}

export interface TimeEntriesDayGroup {
  dateKey: string;
  heading: string;
  items: TimeEntryResponse[];
}

interface TimeEntryFormErrors {
  description: string | null;
  endedAt: string | null;
  projectId: string | null;
  startedAt: string | null;
  taskId: string | null;
}

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

const defaultFormErrors = (): TimeEntryFormErrors => ({
  description: null,
  endedAt: null,
  projectId: null,
  startedAt: null,
  taskId: null,
});

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

function getUtcDateKey(isoDateTime: string): string {
  return isoDateTime.slice(0, 10);
}

function formatUtcTime(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

function formatUtcDayLabel(dateKey: string, nowMs: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const monthLabels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const target = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
  const today = new Date(nowMs);
  const todayKey = [
    today.getUTCFullYear(),
    String(today.getUTCMonth() + 1).padStart(2, "0"),
    String(today.getUTCDate()).padStart(2, "0"),
  ].join("-");
  const yesterday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 1));
  const yesterdayKey = [
    yesterday.getUTCFullYear(),
    String(yesterday.getUTCMonth() + 1).padStart(2, "0"),
    String(yesterday.getUTCDate()).padStart(2, "0"),
  ].join("-");
  const dateLabel = `${monthLabels[target.getUTCMonth()]} ${target.getUTCDate()}`;

  if (dateKey === todayKey) {
    return `Today, ${dateLabel}`;
  }

  if (dateKey === yesterdayKey) {
    return `Yesterday, ${dateLabel}`;
  }

  return dateLabel;
}

function formatCompletedDuration(durationSeconds: number | null): string {
  if (!durationSeconds) {
    return "0m";
  }

  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);

  if (hours === 0) {
    return `${Math.max(1, minutes)}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

function formatRunningDuration(startedAt: string, nowMs: number): string {
  const elapsedSeconds = Math.max(
    0,
    Math.floor((nowMs - new Date(startedAt).getTime()) / 1000),
  );

  return [
    String(Math.floor(elapsedSeconds / 3600)).padStart(2, "0"),
    String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, "0"),
    String(elapsedSeconds % 60).padStart(2, "0"),
  ].join(":");
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function nextUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
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
  const filterTaskOptions = ref<TaskLookupOption[]>([]);
  const filterTaskSuggestions = ref<TaskLookupOption[]>([]);
  const dialogTaskOptions = ref<TaskLookupOption[]>([]);
  const dialogTaskSuggestions = ref<TaskLookupOption[]>([]);

  const currentPage = shallowRef(1);
  const pageSize = shallowRef(20);
  const totalRecords = shallowRef(0);
  const totalPages = shallowRef(0);
  const nowMs = shallowRef(now());

  const isLoadingEntries = shallowRef(true);
  const isLoadingProjects = shallowRef(false);
  const isLoadingFilterTasks = shallowRef(false);
  const isLoadingDialogTasks = shallowRef(false);
  const isSavingDialog = shallowRef(false);
  const isDeletingEntry = shallowRef<string | null>(null);

  const requestErrorMessage = shallowRef<string | null>(null);
  const projectsErrorMessage = shallowRef<string | null>(null);
  const filterTasksErrorMessage = shallowRef<string | null>(null);
  const dialogTasksErrorMessage = shallowRef<string | null>(null);
  const dialogRequestErrorMessage = shallowRef<string | null>(null);
  const lastMutationErrorMessage = shallowRef<string | null>(null);

  const selectedDateRange = shallowRef<Date[] | null>(null);
  const selectedProjectId = shallowRef<string | null>(null);
  const selectedTaskFilter = shallowRef<TaskLookupValue>(null);

  const dialogMode = shallowRef<DialogMode>(null);
  const editingEntry = shallowRef<TimeEntryResponse | null>(null);
  const dialogProjectId = shallowRef<string | null>(null);
  const dialogTaskValue = shallowRef<TaskLookupValue>(null);
  const dialogStartedAt = shallowRef<Date | null>(null);
  const dialogEndedAt = shallowRef<Date | null>(null);
  const dialogDescription = shallowRef("");
  const dialogIsBillable = shallowRef(false);
  const dialogErrors = ref<TimeEntryFormErrors>(defaultFormErrors());

  const taskCache = new Map<string, TaskLookupOption[]>();
  let entriesRequestId = 0;
  let activeEntriesLoadRequestId = 0;
  let pendingEntriesTimerEvents: TimeEntryTimerSyncEvent[] = [];
  let filterTaskRequestId = 0;
  let dialogTaskRequestId = 0;
  let tickHandle: ReturnType<typeof setInterval> | null = null;
  let unsubscribeFromTimerSync: (() => void) | null = null;

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
  const selectedTaskId = computed(() =>
    isTaskLookupOption(selectedTaskFilter.value) ? selectedTaskFilter.value.id : null,
  );
  const activeDialogTask = computed(() =>
    isTaskLookupOption(dialogTaskValue.value) ? dialogTaskValue.value : null,
  );
  const groupedEntries = computed<TimeEntriesDayGroup[]>(() => {
    const groups = new Map<string, TimeEntryResponse[]>();

    for (const entry of entries.value) {
      const key = getUtcDateKey(entry.startedAt);
      const currentItems = groups.get(key) ?? [];
      currentItems.push(entry);
      groups.set(key, currentItems);
    }

    return Array.from(groups.entries()).map(([dateKey, items]) => ({
      dateKey,
      heading: formatUtcDayLabel(dateKey, nowMs.value),
      items,
    }));
  });
  const dialogTitle = computed(() =>
    dialogMode.value === "edit" ? "Edit time entry" : "New time entry",
  );
  const dialogSubtitle = computed(() =>
    dialogMode.value === "edit"
      ? "Update the selected time entry using the same popup layout as create mode."
      : "Create a completed time entry without starting the global timer."
  );
  const dialogSaveLabel = computed(() =>
    dialogMode.value === "edit" ? "Save changes" : "Save entry",
  );
  const isDialogOpen = computed(() => dialogMode.value !== null);
  const hasRunningEntries = computed(() =>
    entries.value.some((entry) => entry.endedAt === null),
  );

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

  function buildListQuery(): Partial<TimeEntryListQuery> {
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
  }

  function matchesDateRange(entry: TimeEntryResponse): boolean {
    const [startDate, endDate] = selectedDateRange.value ?? [];
    const startedAtMs = new Date(entry.startedAt).getTime();

    if (startDate && startedAtMs < startOfUtcDay(startDate).getTime()) {
      return false;
    }

    if (endDate && startedAtMs >= nextUtcDay(endDate).getTime()) {
      return false;
    }

    return true;
  }

  function matchesProjectFilter(entry: TimeEntryResponse): boolean {
    return selectedProjectId.value === null || entry.projectId === selectedProjectId.value;
  }

  function matchesTaskFilter(entry: TimeEntryResponse): boolean {
    if (isTaskLookupOption(selectedTaskFilter.value)) {
      return entry.taskId === selectedTaskFilter.value.id;
    }

    if (typeof selectedTaskFilter.value !== "string") {
      return true;
    }

    const normalizedSearch = selectedTaskFilter.value.trim().toLowerCase();

    return normalizedSearch.length === 0
      ? true
      : entry.task.title.toLowerCase().includes(normalizedSearch);
  }

  function belongsInVisibleScope(entry: TimeEntryResponse): boolean {
    return (
      currentPage.value === 1 &&
      matchesDateRange(entry) &&
      matchesProjectFilter(entry) &&
      matchesTaskFilter(entry)
    );
  }

  function updatePaginationAfterInsert(): void {
    totalRecords.value += 1;
    totalPages.value = totalRecords.value === 0
      ? 0
      : Math.max(1, Math.ceil(totalRecords.value / pageSize.value));
  }

  function reconcileTimerEvent(event: TimeEntryTimerSyncEvent): void {
    const existingIndex = entries.value.findIndex((entry) => entry.id === event.entry.id);

    if (existingIndex >= 0) {
      entries.value = entries.value
        .map((entry) => (entry.id === event.entry.id ? event.entry : entry))
        .sort(compareTimeEntriesByRecency);
      nowMs.value = now();
      syncTicker();
      return;
    }

    if (event.type !== "started" || !belongsInVisibleScope(event.entry)) {
      return;
    }

    entries.value = entries.value
      .concat(event.entry)
      .sort(compareTimeEntriesByRecency)
      .slice(0, pageSize.value);
    updatePaginationAfterInsert();
    nowMs.value = now();
    syncTicker();
  }

  function queueTimerEventIfEntriesLoadActive(event: TimeEntryTimerSyncEvent): void {
    if (activeEntriesLoadRequestId !== 0) {
      pendingEntriesTimerEvents.push(event);
    }
  }

  function replayPendingEntriesTimerEvents(requestId: number): void {
    if (activeEntriesLoadRequestId !== requestId || pendingEntriesTimerEvents.length === 0) {
      return;
    }

    const eventsToReplay = pendingEntriesTimerEvents;
    pendingEntriesTimerEvents = [];

    for (const event of eventsToReplay) {
      reconcileTimerEvent(event);
    }
  }

  function updateTaskSuggestions(
    target: "dialog" | "filter",
    query: string,
    options: TaskLookupOption[],
  ): void {
    const normalized = query.trim().toLowerCase();
    const suggestions = normalized.length === 0
      ? [...options]
      : options.filter((task) => task.title.toLowerCase().includes(normalized));

    if (target === "dialog") {
      dialogTaskSuggestions.value = suggestions;
      return;
    }

    filterTaskSuggestions.value = suggestions;
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
    dialogStartedAt.value = null;
    dialogEndedAt.value = null;
    dialogDescription.value = "";
    dialogIsBillable.value = false;
    clearDialogErrors();
  }

  async function ensureProjectsLoaded(force = false): Promise<ProjectResponse[]> {
    if (!force && projects.value.length > 0) {
      return projects.value;
    }

    isLoadingProjects.value = true;
    projectsErrorMessage.value = null;

    try {
      projects.value = await client.listVisibleProjects(requireAccessToken());
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
      dialogTasksErrorMessage.value = null;
    } else {
      isLoadingFilterTasks.value = true;
      filterTasksErrorMessage.value = null;
    }

    try {
      const cached = taskCache.get(projectId);

      if (cached) {
        if (target === "dialog" && requestId === dialogTaskRequestId) {
          dialogTaskOptions.value = cached;
        } else if (target === "filter" && requestId === filterTaskRequestId) {
          filterTaskOptions.value = cached;
        }
        return cached;
      }

      const nextTasks = (await client.listProjectTasks(requireAccessToken(), projectId))
        .filter((task) => task.isActive)
        .map(toTaskLookupOption);

      taskCache.set(projectId, nextTasks);

      if (target === "dialog" && requestId === dialogTaskRequestId) {
        dialogTaskOptions.value = nextTasks;
      } else if (target === "filter" && requestId === filterTaskRequestId) {
        filterTaskOptions.value = nextTasks;
      }

      return nextTasks;
    } catch (error) {
      const message = getErrorMessage(error);

      if (target === "dialog" && requestId === dialogTaskRequestId) {
        dialogTaskOptions.value = [];
        dialogTasksErrorMessage.value = message;
      } else if (target === "filter" && requestId === filterTaskRequestId) {
        filterTaskOptions.value = [];
        filterTasksErrorMessage.value = message;
      }

      throw error;
    } finally {
      if (target === "dialog" && requestId === dialogTaskRequestId) {
        isLoadingDialogTasks.value = false;
      } else if (target === "filter" && requestId === filterTaskRequestId) {
        isLoadingFilterTasks.value = false;
      }
    }
  }

  async function loadEntries(): Promise<void> {
    const requestId = ++entriesRequestId;

    activeEntriesLoadRequestId = requestId;
    isLoadingEntries.value = true;
    requestErrorMessage.value = null;

    try {
      const response = await client.listOwnEntries(requireAccessToken(), buildListQuery());

      if (requestId !== entriesRequestId) {
        return;
      }

      entries.value = response.items;
      currentPage.value = response.meta.page;
      pageSize.value = response.meta.limit;
      totalPages.value = response.meta.totalPages;
      totalRecords.value = response.meta.total;
      replayPendingEntriesTimerEvents(requestId);
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
        activeEntriesLoadRequestId = 0;
        pendingEntriesTimerEvents = [];
        isLoadingEntries.value = false;
      }
    }
  }

  async function refreshEntriesAfterMutation(): Promise<void> {
    await loadEntries();

    if (totalPages.value > 0 && currentPage.value > totalPages.value) {
      currentPage.value = totalPages.value;
      await loadEntries();
    }
  }

  function formatDuration(entry: TimeEntryResponse): string {
    if (entry.endedAt === null) {
      return formatRunningDuration(entry.startedAt, nowMs.value);
    }

    return formatCompletedDuration(entry.durationSeconds);
  }

  function formatTimeRange(entry: TimeEntryResponse): string {
    const start = formatUtcTime(entry.startedAt);

    if (entry.endedAt === null) {
      return `${start} - Running`;
    }

    return `${start} - ${formatUtcTime(entry.endedAt)}`;
  }

  async function applyFilters(): Promise<void> {
    currentPage.value = 1;
    await loadEntries();
  }

  async function setDateRange(range: Date[] | null): Promise<void> {
    selectedDateRange.value = range && range.length > 0 ? range : null;
    await applyFilters();
  }

  async function setSelectedProjectId(projectId: string | null): Promise<void> {
    selectedProjectId.value = projectId;
    selectedTaskFilter.value = null;
    filterTaskSuggestions.value = [];
    filterTasksErrorMessage.value = null;

    if (!projectId) {
      filterTaskOptions.value = [];
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
    selectedTaskFilter.value = value;
    await applyFilters();
  }

  function handleFilterTaskSearch(query: string): void {
    const source = selectedProjectId.value
      ? filterTaskOptions.value
      : Array.from(taskCache.values()).flat();

    updateTaskSuggestions("filter", query, source);
  }

  async function setPage(page: number): Promise<void> {
    currentPage.value = page;
    await loadEntries();
  }

  async function setDialogProjectId(projectId: string | null): Promise<void> {
    dialogProjectId.value = projectId;
    dialogTaskValue.value = null;
    dialogTaskOptions.value = [];
    dialogTaskSuggestions.value = [];
    dialogErrors.value.taskId = null;
    dialogTasksErrorMessage.value = null;
    dialogRequestErrorMessage.value = null;

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

  function setDialogTaskValue(value: TaskLookupValue): void {
    dialogTaskValue.value = value;
    dialogErrors.value.taskId = null;
    dialogRequestErrorMessage.value = null;
  }

  function handleDialogTaskSearch(query: string): void {
    updateTaskSuggestions("dialog", query, dialogTaskOptions.value);
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

  async function openCreateDialog(day: string | null = null): Promise<void> {
    resetDialogState();
    dialogMode.value = "create";

    try {
      await ensureProjectsLoaded();
    } catch {
      // Create mode can still open with the visible request error state.
    }

    if (!day) {
      return;
    }

    const preset = new Date(`${day}T09:00:00.000Z`);
    dialogStartedAt.value = preset;
    dialogEndedAt.value = new Date(`${day}T10:00:00.000Z`);
  }

  async function openEditDialog(entry: TimeEntryResponse): Promise<void> {
    resetDialogState();
    dialogMode.value = "edit";
    editingEntry.value = entry;
    dialogProjectId.value = entry.projectId;
    dialogStartedAt.value = new Date(entry.startedAt);
    dialogEndedAt.value = entry.endedAt ? new Date(entry.endedAt) : null;
    dialogDescription.value = entry.description ?? "";
    dialogIsBillable.value = entry.isBillable;

    try {
      await ensureProjectsLoaded();
      const options = await loadProjectTasks(entry.projectId, "dialog");
      dialogTaskValue.value =
        options.find((task) => task.id === entry.taskId) ?? {
          id: entry.task.id,
          isActive: true,
          projectId: entry.projectId,
          title: entry.task.title,
        };
      updateTaskSuggestions("dialog", "", options);
    } catch {
      dialogTaskValue.value = {
        id: entry.task.id,
        isActive: true,
        projectId: entry.projectId,
        title: entry.task.title,
      };
    }
  }

  function closeDialog(): void {
    resetDialogState();
  }

  function validateDialog():
    | { endedAt: string; isBillable: boolean; startedAt: string; taskId: string; description?: string | null }
    | null {
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

        await client.updateEntry(
          requireAccessToken(),
          editingEntry.value.id,
          updateInput,
        );
        appToast.showSuccessToast(
          "Time entry updated",
          "Your changes have been saved.",
        );
      } else {
        await client.createManualEntry(requireAccessToken(), validInput);
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
      await client.deleteEntry(requireAccessToken(), entry.id);
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
    unsubscribeFromTimerSync = subscribeToTimeEntryTimerSync((event) => {
      reconcileTimerEvent(event);
      queueTimerEventIfEntriesLoadActive(event);
    });

    await Promise.allSettled([ensureProjectsLoaded(), loadEntries()]);
  });

  onBeforeUnmount(() => {
    unsubscribeFromTimerSync?.();
    unsubscribeFromTimerSync = null;
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
