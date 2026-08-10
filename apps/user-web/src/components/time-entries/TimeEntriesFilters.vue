<script setup lang="ts">
import DatePicker from "primevue/datepicker";
import type { ProjectResponse } from "@gitiempo/shared";
import { giTiempoDatePickerPt } from "@gitiempo/web-config/theme";
import { FilterAutoComplete, SurfaceCard } from "@gitiempo/web-shared";
import { shallowRef, watch } from "vue";

import type {
  TaskLookupOption,
  TaskLookupValue,
} from "@/composables/time-entries/time-entry-task-lookup";
import type {
  TimeEntryDatePickerRangeValue,
  TimeEntryDateRange,
} from "@/composables/time-entries/useTimeEntryFilters";

interface TimeEntriesFiltersProps {
  isLoadingProjects: boolean;
  projectSuggestions: ProjectResponse[];
  projectsErrorMessage: string | null;
  selectedDateRange: TimeEntryDateRange;
  selectedProject: ProjectResponse | null;
  selectedTask: TaskLookupValue;
  taskSuggestions: TaskLookupOption[];
}

const props = defineProps<TimeEntriesFiltersProps>();

const projectModel = shallowRef<ProjectResponse | string | null>(null);

const emit = defineEmits<{
  projectComplete: [query: string];
  taskSearch: [query: string];
  "update:dateRange": [value: TimeEntryDatePickerRangeValue];
  "update:projectValue": [value: ProjectResponse | string | null];
  "update:taskValue": [value: TaskLookupValue];
}>();

watch(
  () => props.selectedProject,
  (project) => {
    projectModel.value = project;
  },
  { immediate: true },
);

function emitProjectComplete(event: { query: string }): void {
  emit("projectComplete", event.query);
}

function emitTaskSearch(event: { query: string }): void {
  emit("taskSearch", event.query);
}

function updateDateRange(value: TimeEntryDatePickerRangeValue): void {
  emit("update:dateRange", value);
}

function updateProjectValue(
  value: ProjectResponse | string | null | undefined,
): void {
  projectModel.value = value ?? null;
  emit("update:projectValue", value ?? null);
}

function commitProjectQuery(): void {
  const typedQuery = projectModel.value;

  if (typeof typedQuery !== "string") {
    return;
  }

  const normalizedQuery = typedQuery.trim().toLocaleLowerCase();
  const matchedProject = props.projectSuggestions.find(
    (project) => project.name.trim().toLocaleLowerCase() === normalizedQuery,
  );

  if (!matchedProject) {
    projectModel.value = props.selectedProject;
    return;
  }

  projectModel.value = matchedProject;

  if (matchedProject.id !== props.selectedProject?.id) {
    emit("update:projectValue", matchedProject);
  }
}

function updateTaskValue(value: TaskLookupValue | undefined): void {
  emit("update:taskValue", value ?? null);
}
</script>

<template>
  <SurfaceCard
    body-class="flex flex-col gap-3"
    padding-class="p-6"
  >
    <div class="grid gap-3 xl:grid-cols-[220px_220px_minmax(0,1fr)]">
      <div class="flex flex-col gap-1">
        <label
          for="time-entries-date-range"
          class="sr-only"
        >
          Date range
        </label>
        <DatePicker
          date-format="M d, yy"
          icon-display="input"
          input-id="time-entries-date-range"
          placeholder="Select date range"
          :manual-input="false"
          :model-value="selectedDateRange"
          selection-mode="range"
          fluid
          show-button-bar
          show-icon
          :pt="giTiempoDatePickerPt"
          @update:model-value="updateDateRange"
        />
      </div>

      <div class="flex flex-col gap-1">
        <label
          for="time-entries-project-filter"
          class="sr-only"
        >
          Project
        </label>
        <FilterAutoComplete
          append-to="self"
          auto-option-focus
          class="w-full max-w-full min-w-0"
          input-id="time-entries-project-filter"
          option-label="name"
          placeholder="All projects"
          :suggestions="projectSuggestions"
          :disabled="isLoadingProjects"
          :loading="isLoadingProjects"
          :model-value="projectModel"
          show-clear
          @blur="commitProjectQuery"
          @keydown.enter="commitProjectQuery"
          @complete="emitProjectComplete"
          @update:model-value="updateProjectValue"
        />
      </div>

      <div class="flex flex-col gap-1">
        <label
          for="time-entries-task-filter"
          class="sr-only"
        >
          Task
        </label>
        <FilterAutoComplete
          append-to="self"
          class="w-full max-w-full min-w-0"
          input-id="time-entries-task-filter"
          option-label="title"
          placeholder="Search tasks"
          show-clear
          :model-value="selectedTask"
          :suggestions="taskSuggestions"
          @complete="emitTaskSearch"
          @update:model-value="updateTaskValue"
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
</template>
