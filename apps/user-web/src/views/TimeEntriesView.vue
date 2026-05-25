<script setup lang="ts">
import AutoComplete from "primevue/autocomplete";
import Button from "primevue/button";
import ConfirmDialog from "primevue/confirmdialog";
import DatePicker from "primevue/datepicker";
import Paginator from "primevue/paginator";
import ProgressSpinner from "primevue/progressspinner";
import Select from "primevue/select";

import { SurfaceCard } from "@gitiempo/web-shared";

import PageHeader from "@/components/layout/PageHeader.vue";
import TimeEntriesDaySection from "@/components/time-entries/TimeEntriesDaySection.vue";
import TimeEntryDialog from "@/components/time-entries/TimeEntryDialog.vue";
import { useTimeEntriesPage } from "@/composables/time-entries/useTimeEntriesPage";

const {
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
  isLoadingFilterTasks,
  isLoadingProjects,
  isSavingDialog,
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
  visibleProjects,
} = useTimeEntriesPage();
</script>

<template>
  <section class="flex flex-col gap-6 pb-20 sm:pb-0">
    <ConfirmDialog />

    <PageHeader
      subtitle="Review tracked time, add manual entries, and edit entries in a shared dialog."
      title="Time Entries"
    >
      <template #actions>
        <Button
          data-testid="time-entries-header-create"
          label="+ New time entry"
          @click="void openCreateDialog()"
        />
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
        label="+ New time entry"
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
