<script setup lang="ts">
import AutoComplete from "primevue/autocomplete";
import DatePicker from "primevue/datepicker";
import type { ProjectResponse } from "@gitiempo/shared";
import { giTiempoSelfAppendedAutoCompletePt } from "@gitiempo/web-config/theme";
import { SurfaceCard } from "@gitiempo/web-shared";

import type {
  TaskLookupOption,
  TaskLookupValue,
} from "@/composables/time-entries/time-entry-task-lookup";

interface TimeEntriesFiltersProps {
  isLoadingProjects: boolean;
  projectSuggestions: ProjectResponse[];
  projectsErrorMessage: string | null;
  selectedDateRange: Date[] | null;
  selectedProject: ProjectResponse | null;
  selectedTask: TaskLookupValue;
  taskSuggestions: TaskLookupOption[];
}

defineProps<TimeEntriesFiltersProps>();

const emit = defineEmits<{
  projectComplete: [query: string];
  taskSearch: [query: string];
  "update:dateRange": [value: Date[] | null];
  "update:projectValue": [value: ProjectResponse | string | null];
  "update:taskValue": [value: TaskLookupValue];
}>();

function emitProjectComplete(event: { query: string }): void {
  emit("projectComplete", event.query);
}

function emitTaskSearch(event: { query: string }): void {
  emit("taskSearch", event.query);
}

function updateDateRange(
  value: Date | (Date | null)[] | Date[] | null | undefined,
): void {
  const dateRange: Date[] | null = Array.isArray(value)
    ? value.reduce<Date[]>((dates, date) => {
        if (date !== null) {
          dates.push(date);
        }

        return dates;
      }, [])
    : null;

  emit("update:dateRange", dateRange);
}

function updateProjectValue(
  value: ProjectResponse | string | null | undefined,
): void {
  emit("update:projectValue", value ?? null);
}

function updateTaskValue(value: TaskLookupValue | undefined): void {
  emit("update:taskValue", value ?? null);
}
</script>

<template>
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
          @update:model-value="updateDateRange"
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
          :suggestions="projectSuggestions"
          complete-on-focus
          :disabled="isLoadingProjects"
          dropdown
          dropdown-mode="blank"
          force-selection
          :loading="isLoadingProjects"
          :min-length="0"
          :model-value="selectedProject"
          :pt="giTiempoSelfAppendedAutoCompletePt"
          fluid
          show-clear
          @complete="emitProjectComplete"
          @update:model-value="updateProjectValue"
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
          :model-value="selectedTask"
          :suggestions="taskSuggestions"
          complete-on-focus
          dropdown
          dropdown-mode="blank"
          fluid
          :min-length="0"
          :pt="giTiempoSelfAppendedAutoCompletePt"
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
