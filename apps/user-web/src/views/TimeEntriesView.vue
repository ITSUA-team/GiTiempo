<script setup lang="ts">
import AutoComplete from "primevue/autocomplete";
import DatePicker from "primevue/datepicker";
import type { DatePickerPassThroughOptions } from "primevue/datepicker";
import Paginator from "primevue/paginator";
import {
  createManualTimeEntrySchema,
  type ProjectResponse,
  type TimeEntryResponse,
} from "@gitiempo/shared";
import { giTiempoSelfAppendedAutoCompletePt } from "@gitiempo/web-config/theme";
import {
  createAppConfirm,
  createAppToast,
  EntryActionButton,
  getErrorMessage,
  RequestStateCard,
  SurfaceCard,
  filterAutocompleteOptions,
} from "@gitiempo/web-shared";
import { useQueryClient } from "@tanstack/vue-query";
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import { PlusIcon } from "@heroicons/vue/24/outline";

import TimeEntriesDaySection from "@/components/time-entries/TimeEntriesDaySection.vue";
import TimeEntriesLoadingState from "@/components/time-entries/TimeEntriesLoadingState.vue";
import TimeEntryDialog from "@/components/time-entries/TimeEntryDialog.vue";
import {
  isGitHubIssueTaskLookupOption,
  isNewTaskLookupOption,
  toEntryTaskOption,
  toTaskLookupOption,
  type TaskLookupOption,
  type TaskLookupValue,
} from "@/composables/time-entries/time-entry-task-lookup";
import {
  useCurrentTimerQuery,
  useCreateTaskMutation,
  useStartTimerMutation,
  useStopTimerMutation,
} from "@/composables/query";
import { useTimeEntriesData } from "@/composables/time-entries/useTimeEntriesData";
import {
  useTimeEntryDialog,
  type ValidatedTimeEntryDialogInput,
} from "@/composables/time-entries/useTimeEntryDialog";
import {
  useTimeEntryFilters,
  type TimeEntryDatePickerRangeValue,
} from "@/composables/time-entries/useTimeEntryFilters";
import { useTimeEntryMutations } from "@/composables/time-entries/useTimeEntryMutations";
import { useTimeEntryTaskOptions } from "@/composables/time-entries/useTimeEntryTaskOptions";
import { useTopBarTimerDialogController } from "@/composables/timer/useTopBarTimerDialogController";
import { createDefaultTimeEntriesClient } from "@/config/clients";
import { validateInlineNewTaskInput } from "@/lib/inline-new-task";
import { timerKeys } from "@/lib/query-keys";
import { getUserServerStateScope } from "@/lib/server-state-scope";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const client = createDefaultTimeEntriesClient();
const confirm = useConfirm();
const toast = useToast();
const appConfirm = createAppConfirm(confirm);
const appToast = createAppToast(toast);
const topBarTimerDialogController = useTopBarTimerDialogController();
const queryClient = useQueryClient();
const accessToken = computed(() => authStore.accessToken);
const scope = computed(() => getUserServerStateScope(authStore.accessToken));
const filters = useTimeEntryFilters();
const dialog = useTimeEntryDialog();
const data = useTimeEntriesData({
  accessToken,
  clearIntervalFn: clearInterval,
  client,
  currentPage: filters.currentPage,
  entryListQuery: filters.entryListQuery,
  now: () => Date.now(),
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
  scope,
  setIntervalFn: setInterval,
});
const taskOptions = useTimeEntryTaskOptions({
  client,
  getProjectById(projectId) {
    return data.visibleProjects.value.find((project) => project.id === projectId) ?? null;
  },
});
const createTaskMutation = useCreateTaskMutation({
  accessToken,
  client,
  scope,
});
const currentTimerGuardQuery = useCurrentTimerQuery({
  accessToken,
  client,
  scope,
});
const startTimerMutation = useStartTimerMutation({
  accessToken,
  client,
  scope,
});
const stopTimerMutation = useStopTimerMutation({
  accessToken,
  client,
  scope,
});
const mutations = useTimeEntryMutations({
  accessToken,
  client,
  scope,
  toast,
});
const {
  activeDialogTask,
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
  dialogTasksErrorMessage,
  dialogTaskSuggestions,
  dialogTaskValue,
  dialogTitle,
  isDialogOpen,
  isLoadingDialogTasks,
  setDescription: setDialogDescription,
  setEndedAt: setDialogEndedAt,
  setIsBillable: setDialogIsBillable,
  setNewTaskTitle: setDialogNewTaskTitle,
  setStartedAt: setDialogStartedAt,
  setTaskValue: setRawDialogTaskValue,
} = dialog;
const {
  currentPage,
  filterTaskSuggestions,
  pageSize,
  selectedDateRange,
  selectedProjectId,
  selectedTaskFilter,
} = filters;
const {
  entries,
  formatDuration,
  formatTimeRange,
  groupedEntries,
  isLoadingProjects,
  pageState,
  projectsErrorMessage,
  requestErrorMessage,
  totalRecords,
  visibleProjects,
} = data;
const { isDeletingEntry, isSavingDialog } = mutations;
const isSavingDialogFlow = computed(
  () => isSavingDialog.value || createTaskMutation.isPending.value,
);
const isDeletingDialogEntry = computed(() => {
  const entry = dialog.editingEntry.value;

  return !!entry && isDeletingEntry.value === entry.id;
});
const projectFilterSuggestions = ref<ProjectResponse[]>([]);
const startingTimerEntryId = shallowRef<string | null>(null);
const stoppingTimerEntryId = shallowRef<string | null>(null);
const isDirectStartBlockedByCurrentTimer = computed(() =>
  currentTimerGuardQuery.isFetching.value ||
  currentTimerGuardQuery.data.value?.timeEntry?.endedAt === null,
);
const selectedProjectFilterOption = computed(
  () =>
    visibleProjects.value.find((project) => project.id === selectedProjectId.value) ??
    null,
);
const filteredEntryTaskOptions = computed<TaskLookupOption[]>(() => {
  const optionsByTaskId = new Map<string, TaskLookupOption>();

  for (const entry of entries.value) {
    if (!optionsByTaskId.has(entry.task.id)) {
      optionsByTaskId.set(entry.task.id, toEntryTaskOption(entry));
    }
  }

  return [...optionsByTaskId.values()];
});
const datePickerPt = {
  panel: {
    class:
      "border-divider bg-surface-primary rounded-md border text-text-dark shadow-popover",
  },
} satisfies DatePickerPassThroughOptions;

function getProjectDefaultBillable(projectId: string | null): boolean {
  return (
    visibleProjects.value.find((project) => project.id === projectId)
      ?.defaultBillableForTasks ?? true
  );
}

function handleProjectFilterComplete(event: { query: string }): void {
  projectFilterSuggestions.value = filterAutocompleteOptions(
    visibleProjects.value,
    event.query,
    (project) => project.name,
  );
}

async function loadDialogProjectTasks(projectId: string) {
  return taskOptions.loadTargetProjectTaskOptions(projectId, dialog, {
    trackableOnly: true,
  });
}

async function applyFilters(): Promise<void> {
  filters.resetPagination();
  await data.loadEntries();
}

async function setDateRange(
  range: TimeEntryDatePickerRangeValue,
): Promise<void> {
  filters.setDateRange(range);
  await applyFilters();
}

function handleDateRangeUpdate(value: TimeEntryDatePickerRangeValue): void {
  void setDateRange(value);
}

async function setSelectedProjectId(projectId: string | null): Promise<void> {
  filters.setProjectId(projectId);
  await applyFilters();
}

async function setSelectedProjectFilterValue(
  value: ProjectResponse | string | null,
): Promise<void> {
  if (typeof value === "string") {
    if (value.trim().length === 0) {
      await setSelectedProjectId(null);
    }

    return;
  }

  await setSelectedProjectId(value?.id ?? null);
}

async function setSelectedTaskFilter(value: TaskLookupValue): Promise<void> {
  filters.setTaskValue(value);
  await applyFilters();
}

function handleFilterTaskSearch(query: string): void {
  filters.updateTaskSuggestions(query, filteredEntryTaskOptions.value);
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

function setDialogTaskValue(value: TaskLookupValue): void {
  setRawDialogTaskValue(value);

  if (dialog.dialogMode.value === "create" && isNewTaskLookupOption(value)) {
    setDialogIsBillable(getProjectDefaultBillable(dialog.dialogProjectId.value));
  }
}

function handleDialogTaskSearch(query: string): void {
  dialog.updateTaskSuggestions(query);
}

async function createDialogTaskFromSelection(
  taskTitle: string,
): Promise<TaskLookupOption | null> {
  const projectId = dialog.dialogProjectId.value;

  if (!projectId) {
    return null;
  }

  const parsedTaskInput = validateInlineNewTaskInput({
    defaultBillableForTimeEntries: getProjectDefaultBillable(projectId),
    title: taskTitle,
  });

  if (!parsedTaskInput.success) {
    dialog.setNewTaskTitleError(
      parsedTaskInput.error.flatten().fieldErrors.title?.[0] ??
        "Task title is invalid.",
    );
    return null;
  }

  try {
    const task = await createTaskMutation.mutateAsync({
      input: parsedTaskInput.data,
      projectId,
    });
    const options = taskOptions.upsertProjectTask(task, { trackableOnly: true });
    const taskOption = toTaskLookupOption(task);

    dialog.setTaskOptions(options);
    dialog.setTaskValue(taskOption);
    dialog.updateTaskSuggestions("", options);
    dialog.setNewTaskTitle("");
    appToast.showSuccessToast(
      "Task created",
      "The new task is ready to use for time entries.",
    );

    return taskOption;
  } catch (error) {
    const message = getErrorMessage(error);

    dialog.setNewTaskTitleError(message);
    appToast.showErrorToast({
      detail: "Please review the task title and try again.",
      error,
      logContext: { action: "create-task", feature: "time-entries" },
      summary: "Could not create the task",
    });

    return null;
  }
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
  const validationResult = dialog.validateDialog();

  if (!validationResult) {
    return;
  }

  dialog.setRequestError(null);
  let validInput: ValidatedTimeEntryDialogInput;

  if (validationResult.kind === "new-task") {
    const createdTask = await createDialogTaskFromSelection(
      validationResult.taskTitle,
    );

    if (!createdTask) {
      return;
    }

    const parsedEntryInput = createManualTimeEntrySchema.safeParse({
      ...validationResult.draftInput,
      taskId: createdTask.id,
    });

    if (!parsedEntryInput.success) {
      dialog.setRequestError("Time entry values are invalid.");
      return;
    }

    validInput = {
      ...parsedEntryInput.data,
      isBillable: validationResult.draftInput.isBillable,
    };
  } else {
    validInput = validationResult.input;
  }

  const result = await mutations.saveDialogEntry({
    editingEntry: dialog.editingEntry.value,
    input: validInput,
    mode: dialog.dialogMode.value,
    selectedTask: activeDialogTask.value,
  });

  if (result.materializedTask) {
    taskOptions.invalidateProjectTaskOptions(result.materializedTask.projectId);

    if (isGitHubIssueTaskLookupOption(activeDialogTask.value)) {
      dialog.setTaskValue(toTaskLookupOption(result.materializedTask));
    }
  }

  if (result.errorMessage) {
    dialog.setRequestError(result.errorMessage);
    return;
  }

  dialog.closeDialog();
}

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

function openActiveTimerDialog(): void {
  topBarTimerDialogController.requestOpen();
}

async function startTimerForEntry(entry: TimeEntryResponse): Promise<void> {
  if (
    entry.endedAt === null ||
    startingTimerEntryId.value !== null ||
    isDirectStartBlockedByCurrentTimer.value
  ) {
    return;
  }

  startingTimerEntryId.value = entry.id;

  try {
    await startTimerMutation.mutateAsync({ taskId: entry.taskId });
    appToast.showSuccessToast(
      "Timer started",
      `Tracking ${entry.task.title}.`,
    );
  } catch (error) {
    appToast.showErrorToast({
      detail: getErrorMessage(error),
      error,
      logContext: { action: "start-timer-from-entry", feature: "time-entries" },
      summary: "Could not start timer",
    });

    await queryClient.invalidateQueries({ queryKey: timerKeys.all(scope.value) });
  } finally {
    startingTimerEntryId.value = null;
  }
}

async function refreshTimerAndEntries(): Promise<void> {
  await Promise.allSettled([
    queryClient.invalidateQueries({ queryKey: timerKeys.all(scope.value) }),
    data.loadEntries(),
  ]);
}

async function stopTimerForEntry(entry: TimeEntryResponse): Promise<void> {
  if (entry.endedAt !== null || stoppingTimerEntryId.value !== null) {
    return;
  }

  stoppingTimerEntryId.value = entry.id;

  try {
    const currentTimerResult = await currentTimerGuardQuery.refetch({
      throwOnError: true,
    });
    const currentTimer = currentTimerResult.data?.timeEntry ?? null;

    if (currentTimer?.id !== entry.id) {
      await refreshTimerAndEntries();
      appToast.showInfoToast(
        "Timer status refreshed",
        "The running timer changed. Please try again.",
      );
      return;
    }

    await stopTimerMutation.mutateAsync();
    appToast.showSuccessToast(
      "Timer stopped",
      `Stopped tracking ${entry.task.title}.`,
    );
  } catch (error) {
    appToast.showErrorToast({
      detail: getErrorMessage(error),
      error,
      logContext: { action: "stop-timer-from-entry", feature: "time-entries" },
      summary: "Could not stop timer",
    });

    await queryClient.invalidateQueries({ queryKey: timerKeys.all(scope.value) });
  } finally {
    stoppingTimerEntryId.value = null;
  }
}

async function retryLoadEntries(): Promise<void> {
  await data.loadEntries();
}

onMounted(async () => {
  await Promise.allSettled([data.ensureProjectsLoaded()]);
});

onBeforeUnmount(() => {
  data.stopTicker();
});
</script>

<template>
  <section class="flex flex-col gap-6 pb-20 sm:pb-0">
    <TimeEntriesLoadingState v-if="pageState === 'loading'" />

    <template v-else>
      <SurfaceCard
        body-class="flex flex-col gap-3"
        padding-class="p-4"
      >
        <div class="grid gap-3 xl:grid-cols-[220px_220px_minmax(0,1fr)]">
          <div class="flex flex-col gap-1">
            <label
              for="time-entries-date-range"
              class="text-text-dark text-[13px] font-medium"
            >
              Date range
            </label>
            <DatePicker
              date-format="M d, yy"
              input-id="time-entries-date-range"
              :manual-input="false"
              :model-value="selectedDateRange"
              selection-mode="range"
              fluid
              show-button-bar
              show-icon
              show-clear
              :pt="datePickerPt"
              @update:model-value="handleDateRangeUpdate"
            />
          </div>

          <div class="flex flex-col gap-1">
            <label
              for="time-entries-project-filter"
              class="text-text-dark text-[13px] font-medium"
            >
              Project
            </label>
            <AutoComplete
              append-to="self"
              class="w-full max-w-full min-w-0"
              input-id="time-entries-project-filter"
              option-label="name"
              placeholder="All projects"
              :suggestions="projectFilterSuggestions"
              complete-on-focus
              :disabled="isLoadingProjects"
              dropdown
              dropdown-mode="blank"
              force-selection
              :loading="isLoadingProjects"
              :min-length="0"
              :model-value="selectedProjectFilterOption"
              :pt="giTiempoSelfAppendedAutoCompletePt"
              fluid
              show-clear
              @complete="handleProjectFilterComplete"
              @update:model-value="(value) => void setSelectedProjectFilterValue((value ?? null) as ProjectResponse | string | null)"
            />
          </div>

          <div class="flex flex-col gap-1">
            <label
              for="time-entries-task-filter"
              class="text-text-dark text-[13px] font-medium"
            >
              Task
            </label>
            <AutoComplete
              append-to="self"
              class="w-full max-w-full min-w-0"
              input-id="time-entries-task-filter"
              option-label="title"
              placeholder="Search tasks"
              :model-value="selectedTaskFilter"
              :suggestions="filterTaskSuggestions"
              complete-on-focus
              dropdown
              dropdown-mode="blank"
              fluid
              :min-length="0"
              :pt="giTiempoSelfAppendedAutoCompletePt"
              @complete="(event) => void handleFilterTaskSearch(event.query)"
              @update:model-value="(value) => void setSelectedTaskFilter(value ?? null)"
            />
          </div>
        </div>

        <p
          v-if="projectsErrorMessage"
          class="text-destructive text-xs"
        >
          {{ projectsErrorMessage }}
        </p>
      </SurfaceCard>

      <RequestStateCard
        v-if="pageState === 'request-error'"
        data-testid="time-entries-request-error"
        :description="requestErrorMessage"
        retry-label="Retry"
        title="Could not load time entries"
        @retry="void retryLoadEntries()"
      />

      <RequestStateCard
        v-else-if="pageState === 'empty'"
        data-testid="time-entries-empty-state"
        description="Add a new time entry or adjust the current filters."
        title="No time entries match these filters"
      >
        <template #actions>
          <EntryActionButton
            :icon="PlusIcon"
            label="New time entry"
            @click="void openCreateDialog()"
          />
        </template>
      </RequestStateCard>

      <div
        v-else
        class="flex flex-col gap-5"
        data-testid="time-entries-groups"
      >
        <TimeEntriesDaySection
          v-for="(group, groupIndex) in groupedEntries"
          :key="group.dateKey"
          :format-duration="formatDuration"
          :format-time-range="formatTimeRange"
          :group="group"
          :is-start-timer-disabled="isDirectStartBlockedByCurrentTimer"
          :show-header="groupIndex === 0"
          :starting-timer-entry-id="startingTimerEntryId"
          :stopping-timer-entry-id="stoppingTimerEntryId"
          @create-for-day="(day) => void openCreateDialog(day)"
          @edit-entry="(entry) => void openEditDialog(entry)"
          @open-active-timer="openActiveTimerDialog"
          @start-timer="(entry) => void startTimerForEntry(entry)"
          @stop-timer="(entry) => void stopTimerForEntry(entry)"
        />

        <SurfaceCard
          border
          body-class="flex items-center justify-between gap-4"
          padding-class="p-3 sm:p-4"
        >
          <p class="text-text-muted text-[13px]">
            Showing {{ entries.length ? (currentPage - 1) * pageSize + 1 : 0 }} to
            {{ (currentPage - 1) * pageSize + entries.length }} of {{ totalRecords }}
          </p>
          <Paginator
            :first="(currentPage - 1) * pageSize"
            :rows="pageSize"
            :total-records="totalRecords"
            current-page-report-template="Showing {first} to {last} of {totalRecords}"
            template="PrevPageLink PageLinks NextPageLink"
            @page="({ page }) => void setPage(page + 1)"
          />
        </SurfaceCard>
      </div>
    </template>

    <TimeEntryDialog
      :dialog-error-message="dialogRequestErrorMessage"
      :ended-at="dialogEndedAt"
      :errors="dialogErrors"
      :is-deleting="isDeletingDialogEntry"
      :is-loading-projects="isLoadingProjects"
      :is-loading-tasks="isLoadingDialogTasks"
      :is-open="isDialogOpen"
      :is-saving="isSavingDialogFlow"
      :mode="dialogMode"
      :new-task-title="dialogNewTaskTitle"
      :project-id="dialogProjectId"
      :projects="visibleProjects"
      :projects-error-message="projectsErrorMessage"
      :save-label="dialogSaveLabel"
      :started-at="dialogStartedAt"
      :subtitle="dialogSubtitle"
      :task-suggestions="dialogTaskSuggestions"
      :task-value="dialogTaskValue"
      :tasks-error-message="dialogTasksErrorMessage"
      :title="dialogTitle"
      :value-description="dialogDescription"
      :value-is-billable="dialogIsBillable"
      @close="closeDialog"
      @delete-entry="requestDeleteDialogEntry"
      @save="void saveDialog()"
      @task-search="handleDialogTaskSearch"
      @update:description="setDialogDescription"
      @update:ended-at="setDialogEndedAt"
      @update:is-billable="setDialogIsBillable"
      @update:new-task-title="setDialogNewTaskTitle"
      @update:project-id="(value) => void setDialogProjectId(value)"
      @update:started-at="setDialogStartedAt"
      @update:task-value="setDialogTaskValue"
    />
  </section>
</template>
