<script setup lang="ts">
import AutoComplete from "primevue/autocomplete";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Paginator from "primevue/paginator";
import ProgressSpinner from "primevue/progressspinner";
import type { ProjectResponse, TimeEntryResponse } from "@gitiempo/shared";
import {
  createAppConfirm,
  createAppToast,
  EntryActionButton,
  SurfaceCard,
} from "@gitiempo/web-shared";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import { PlusIcon } from "@heroicons/vue/24/outline";

import TimeEntriesDaySection from "@/components/time-entries/TimeEntriesDaySection.vue";
import TimeEntryDialog from "@/components/time-entries/TimeEntryDialog.vue";
import {
  toEntryTaskOption,
  type TaskLookupOption,
  type TaskLookupValue,
} from "@/composables/time-entries/time-entry-task-lookup";
import { useTimeEntriesData } from "@/composables/time-entries/useTimeEntriesData";
import { useTimeEntryDialog } from "@/composables/time-entries/useTimeEntryDialog";
import { useTimeEntryFilters } from "@/composables/time-entries/useTimeEntryFilters";
import { useTimeEntryMutations } from "@/composables/time-entries/useTimeEntryMutations";
import { useTimeEntryTaskOptions } from "@/composables/time-entries/useTimeEntryTaskOptions";
import { createDefaultTimeEntriesClient } from "@/config/clients";
import { getUserServerStateScope } from "@/lib/server-state-scope";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const client = createDefaultTimeEntriesClient();
const confirm = useConfirm();
const toast = useToast();
const appConfirm = createAppConfirm(confirm);
const appToast = createAppToast(toast);
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
const taskOptions = useTimeEntryTaskOptions({ client });
const mutations = useTimeEntryMutations({
  accessToken,
  client,
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
  setStartedAt: setDialogStartedAt,
  setTaskValue: setDialogTaskValue,
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
const filterAutoCompleteOverlayClass = "max-w-[calc(100vw-2rem)]";
const filterAutoCompletePt = {
  listContainer: { class: "max-w-full overflow-x-hidden" },
  option: { class: "max-w-full min-w-0 truncate" },
  overlay: { class: "max-w-[calc(100vw-2rem)] overflow-hidden" },
  pcInputText: { root: { class: "truncate" } },
  root: { class: "max-w-full min-w-0" },
} as const;
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

function filterProjectOptions(query: string): ProjectResponse[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return [...visibleProjects.value];
  }

  return visibleProjects.value.filter((project) =>
    project.name.toLowerCase().includes(normalizedQuery),
  );
}

function handleProjectFilterComplete(event: { query: string }): void {
  projectFilterSuggestions.value = filterProjectOptions(event.query);
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

  dialog.setRequestError(null);
  const errorMessage = await mutations.saveDialogEntry({
    editingEntry: dialog.editingEntry.value,
    input: validInput,
    mode: dialog.dialogMode.value,
  });

  if (errorMessage) {
    dialog.setRequestError(errorMessage);
    return;
  }

  dialog.closeDialog();
}

function requestDeleteEntry(entry: TimeEntryResponse): void {
  appConfirm.confirmDestructive({
    accept: async () => mutations.deleteEntry(entry),
    acceptLabel: "Delete",
    header: "Delete entry?",
    message: "This time entry will be permanently deleted.",
  });
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
            show-icon
            @update:model-value="(value) => void setDateRange(value as Date[] | null)"
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
            :overlay-class="filterAutoCompleteOverlayClass"
            :pt="filterAutoCompletePt"
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
            :overlay-class="filterAutoCompleteOverlayClass"
            :pt="filterAutoCompletePt"
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

    <SurfaceCard
      v-if="pageState === 'loading'"
      body-class="flex min-h-52 flex-col items-center justify-center gap-3"
    >
      <ProgressSpinner
        stroke-width="3"
        style="width:32px;height:32px"
      />
      <p class="text-text-muted text-sm">
        Loading your time entries.
      </p>
    </SurfaceCard>

    <SurfaceCard
      v-else-if="pageState === 'request-error'"
      body-class="flex min-h-52 flex-col items-center justify-center gap-3 text-center"
      data-testid="time-entries-request-error"
    >
      <div class="flex flex-col gap-1">
        <h2 class="text-text-dark text-lg font-semibold">
          Could not load time entries
        </h2>
        <p class="text-text-muted text-sm">
          {{ requestErrorMessage }}
        </p>
      </div>
      <Button
        label="Retry"
        severity="secondary"
        variant="outlined"
        @click="void retryLoadEntries()"
      />
    </SurfaceCard>

    <SurfaceCard
      v-else-if="pageState === 'empty'"
      body-class="flex min-h-52 flex-col items-center justify-center gap-3 text-center"
      data-testid="time-entries-empty-state"
    >
      <div class="flex flex-col gap-1">
        <h2 class="text-text-dark text-lg font-semibold">
          No time entries match these filters
        </h2>
        <p class="text-text-muted text-sm">
          Add a new time entry or adjust the current filters.
        </p>
      </div>
      <EntryActionButton
        :icon="PlusIcon"
        label="New time entry"
        @click="void openCreateDialog()"
      />
    </SurfaceCard>

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
        :is-deleting-entry="isDeletingEntry"
        :show-header="groupIndex === 0"
        @create-for-day="(day) => void openCreateDialog(day)"
        @delete-entry="requestDeleteEntry"
        @edit-entry="(entry) => void openEditDialog(entry)"
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

    <TimeEntryDialog
      :dialog-error-message="dialogRequestErrorMessage"
      :ended-at="dialogEndedAt"
      :errors="dialogErrors"
      :is-loading-projects="isLoadingProjects"
      :is-loading-tasks="isLoadingDialogTasks"
      :is-open="isDialogOpen"
      :is-saving="isSavingDialog"
      :mode="dialogMode"
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
      @save="void saveDialog()"
      @task-search="handleDialogTaskSearch"
      @update:description="setDialogDescription"
      @update:ended-at="setDialogEndedAt"
      @update:is-billable="setDialogIsBillable"
      @update:project-id="(value) => void setDialogProjectId(value)"
      @update:started-at="setDialogStartedAt"
      @update:task-value="setDialogTaskValue"
    />
  </section>
</template>
