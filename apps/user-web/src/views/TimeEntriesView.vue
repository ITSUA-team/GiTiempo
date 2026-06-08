<script setup lang="ts">
import AutoComplete from "primevue/autocomplete";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Paginator from "primevue/paginator";
import ProgressSpinner from "primevue/progressspinner";
import Select from "primevue/select";
import type { TimeEntryResponse } from "@gitiempo/shared";
import {
  createAppConfirm,
  createAppToast,
  SurfaceCard,
} from "@gitiempo/web-shared";
import { computed, onBeforeUnmount, onMounted } from "vue";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import { PlusIcon } from "@heroicons/vue/24/outline";

import PageHeader from "@/components/layout/PageHeader.vue";
import TimeEntriesDaySection from "@/components/time-entries/TimeEntriesDaySection.vue";
import TimeEntryDialog from "@/components/time-entries/TimeEntryDialog.vue";
import type { TaskLookupValue } from "@/composables/time-entries/time-entry-task-lookup";
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
  filterTasksErrorMessage,
  isLoadingFilterTasks,
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

async function loadFilterProjectTasks(projectId: string) {
  return taskOptions.loadTargetProjectTaskOptions(projectId, filters);
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
    : taskOptions.cachedTaskOptions.value;

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
    <PageHeader
      subtitle="Review tracked time, add manual entries, and edit entries in a shared dialog."
      title="Time Entries"
    >
      <template #actions>
        <Button
          v-tooltip.bottom="'New time entry'"
          data-testid="time-entries-header-create"
          aria-label="New time entry"
          type="button"
          :pt="{
            root: { class: 'h-[38px] w-[38px] min-w-0 rounded-[6px] p-0' },
          }"
          @click="void openCreateDialog()"
        >
          <PlusIcon
            aria-hidden="true"
            class="text-text-inverse size-4"
          />
        </Button>
      </template>
    </PageHeader>

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
            input-id="time-entries-date-range"
            :manual-input="false"
            :model-value="selectedDateRange"
            selection-mode="range"
            fluid
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
          <Select
            input-id="time-entries-project-filter"
            option-label="name"
            option-value="id"
            placeholder="All projects"
            :disabled="isLoadingProjects"
            :loading="isLoadingProjects"
            :model-value="selectedProjectId"
            :options="visibleProjects"
            fluid
            filter
            show-clear
            @update:model-value="(value) => void setSelectedProjectId(value ?? null)"
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
            :loading="isLoadingFilterTasks"
            :model-value="selectedTaskFilter"
            :suggestions="filterTaskSuggestions"
            dropdown
            fluid
            @complete="handleFilterTaskSearch($event.query)"
            @update:model-value="(value) => void setSelectedTaskFilter(value ?? null)"
          />
        </div>
      </div>

      <p
        v-if="projectsErrorMessage || filterTasksErrorMessage"
        class="text-destructive text-xs"
      >
        {{ projectsErrorMessage ?? filterTasksErrorMessage }}
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
      <Button
        v-tooltip.bottom="'New time entry'"
        aria-label="New time entry"
        type="button"
        :pt="{
          root: { class: 'h-[38px] w-[38px] min-w-0 rounded-[6px] p-0' },
        }"
        @click="void openCreateDialog()"
      >
        <PlusIcon
          aria-hidden="true"
          class="text-text-inverse size-4"
        />
      </Button>
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
