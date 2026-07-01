<script setup lang="ts">
import Paginator from "primevue/paginator";
import type { ProjectResponse } from "@gitiempo/shared";
import {
  createAppToast,
  EntryActionButton,
  RequestStateCard,
  SurfaceCard,
  filterAutocompleteOptions,
} from "@gitiempo/web-shared";
import { computed, onMounted, ref } from "vue";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import { PlusIcon } from "@heroicons/vue/24/outline";

import TimeEntriesDaySection from "@/components/time-entries/TimeEntriesDaySection.vue";
import TimeEntriesFilters from "@/components/time-entries/TimeEntriesFilters.vue";
import TimeEntriesLoadingState from "@/components/time-entries/TimeEntriesLoadingState.vue";
import TimeEntryDialog from "@/components/time-entries/TimeEntryDialog.vue";
import {
  toEntryTaskOption,
  type TaskLookupOption,
  type TaskLookupValue,
} from "@/composables/time-entries/time-entry-task-lookup";
import { useRunningEntryTicker } from "@/composables/time-entries/useRunningEntryTicker";
import { useTimeEntriesData } from "@/composables/time-entries/useTimeEntriesData";
import { useTimeEntriesDisplay } from "@/composables/time-entries/useTimeEntriesDisplay";
import { useTimeEntriesLoadErrorNotifications } from "@/composables/time-entries/useTimeEntriesLoadErrorNotifications";
import { useTimeEntriesPaginationSync } from "@/composables/time-entries/useTimeEntriesPaginationSync";
import { useTimeEntryDialog } from "@/composables/time-entries/useTimeEntryDialog";
import { useTimeEntryDialogWorkflow } from "@/composables/time-entries/useTimeEntryDialogWorkflow";
import { useTimeEntryDirectTimerActions } from "@/composables/time-entries/useTimeEntryDirectTimerActions";
import { useTimeEntryFilters } from "@/composables/time-entries/useTimeEntryFilters";
import { useTimeEntryMutations } from "@/composables/time-entries/useTimeEntryMutations";
import { useTimeEntryTaskOptions } from "@/composables/time-entries/useTimeEntryTaskOptions";
import { useTopBarTimerDialogController } from "@/composables/timer/useTopBarTimerDialogController";
import { createDefaultTimeEntriesClient } from "@/config/clients";
import { getUserServerStateScope } from "@/lib/server-state-scope";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const client = createDefaultTimeEntriesClient();
const confirm = useConfirm();
const toast = useToast();
const appToast = createAppToast(toast);
const topBarTimerDialogController = useTopBarTimerDialogController();
const accessToken = computed(() => authStore.accessToken);
const scope = computed(() => getUserServerStateScope(authStore.accessToken));
const filters = useTimeEntryFilters();
const dialog = useTimeEntryDialog();
const data = useTimeEntriesData({
  accessToken,
  client,
  entryListQuery: filters.entryListQuery,
  scope,
});

useTimeEntriesPaginationSync({
  currentPage: filters.currentPage,
  isFetchingEntries: data.isFetchingEntries,
  pageMeta: data.entriesMeta,
  pageSize: filters.pageSize,
});
useTimeEntriesLoadErrorNotifications({
  entriesError: data.entriesError,
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
  projectsError: data.projectsError,
});

const runningEntryTicker = useRunningEntryTicker({
  clearIntervalFn: clearInterval,
  entries: data.entries,
  now: () => Date.now(),
  setIntervalFn: setInterval,
});
const display = useTimeEntriesDisplay({
  entries: data.entries,
  isLoadingEntries: data.isLoadingEntries,
  nowMs: runningEntryTicker.nowMs,
  requestErrorMessage: data.requestErrorMessage,
});
const taskOptions = useTimeEntryTaskOptions({
  client,
  getProjectById(projectId) {
    return data.visibleProjects.value.find((project) => project.id === projectId) ?? null;
  },
});
const mutations = useTimeEntryMutations({
  accessToken,
  client,
  scope,
  toast,
});
const dialogWorkflow = useTimeEntryDialogWorkflow({
  accessToken,
  client,
  confirm,
  dialog,
  ensureProjectsLoaded: data.ensureProjectsLoaded,
  mutations,
  scope,
  taskOptions,
  toast,
  visibleProjects: data.visibleProjects,
});
const directTimerActions = useTimeEntryDirectTimerActions({
  accessToken,
  client,
  loadEntries: data.loadEntries,
  scope,
  toast,
});

const {
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
  isLoadingProjects,
  projectsErrorMessage,
  requestErrorMessage,
  totalRecords,
  visibleProjects,
} = data;
const {
  formatDuration,
  formatTimeRange,
  groupedEntries,
  pageState,
} = display;
const {
  handleDialogTaskSearch,
  isDeletingDialogEntry,
  isSavingDialogFlow,
  openCreateDialog,
  openEditDialog,
  requestDeleteDialogEntry,
  saveDialog,
  setDialogProjectId,
  setDialogTaskValue,
} = dialogWorkflow;
const {
  isDirectStartBlockedByCurrentTimer,
  startingTimerEntryId,
  startTimerForEntry,
  stoppingTimerEntryId,
  stopTimerForEntry,
} = directTimerActions;
const projectFilterSuggestions = ref<ProjectResponse[]>([]);
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

function handleProjectFilterComplete(query: string): void {
  projectFilterSuggestions.value = filterAutocompleteOptions(
    visibleProjects.value,
    query,
    (project) => project.name,
  );
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

function openActiveTimerDialog(): void {
  topBarTimerDialogController.requestOpen();
}

async function retryLoadEntries(): Promise<void> {
  await data.loadEntries();
}

onMounted(async () => {
  await Promise.allSettled([data.ensureProjectsLoaded()]);
});
</script>

<template>
  <section class="flex flex-col gap-6 pb-20 sm:pb-0">
    <TimeEntriesLoadingState v-if="pageState === 'loading'" />

    <template v-else>
      <TimeEntriesFilters
        :is-loading-projects="isLoadingProjects"
        :project-suggestions="projectFilterSuggestions"
        :projects-error-message="projectsErrorMessage"
        :selected-date-range="selectedDateRange"
        :selected-project="selectedProjectFilterOption"
        :selected-task="selectedTaskFilter"
        :task-suggestions="filterTaskSuggestions"
        @project-complete="handleProjectFilterComplete"
        @task-search="handleFilterTaskSearch"
        @update:date-range="(value) => void setDateRange(value)"
        @update:project-value="(value) => void setSelectedProjectFilterValue(value)"
        @update:task-value="(value) => void setSelectedTaskFilter(value)"
      />

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
