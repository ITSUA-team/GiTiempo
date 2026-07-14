<script setup lang="ts">
import AutoComplete from "primevue/autocomplete";
import Select from "primevue/select";
import {
  giTiempoSelectPt,
  giTiempoSelfAppendedAutoCompleteDropdownPt,
} from "@gitiempo/web-config/theme";

import type {
  ProjectStatusFilterOption,
  ProjectUpdatedFilterOption,
  ProjectsSearchSuggestion,
} from "@/lib/projects-page-helpers";

interface ProjectsFiltersProps {
  searchSuggestions: ProjectsSearchSuggestion[];
  searchValue: ProjectsSearchSuggestion | string | null;
  statusFilter: ProjectStatusFilterOption;
  statusFilterOptions: ProjectStatusFilterOption[];
  updatedFilter: ProjectUpdatedFilterOption;
  updatedFilterOptions: ProjectUpdatedFilterOption[];
}

defineProps<ProjectsFiltersProps>();

const emit = defineEmits<{
  searchComplete: [query: string];
  "update:searchValue": [value: ProjectsSearchSuggestion | string | null];
  "update:statusFilter": [value: ProjectStatusFilterOption | string | null];
  "update:updatedFilter": [value: ProjectUpdatedFilterOption | string | null];
}>();

function emitSearchComplete(event: { query: string }): void {
  emit("searchComplete", event.query);
}

function updateSearchValue(
  value: ProjectsSearchSuggestion | string | null | undefined,
): void {
  emit("update:searchValue", value ?? null);
}

function updateStatusFilter(
  value: ProjectStatusFilterOption | string | null | undefined,
): void {
  emit("update:statusFilter", value ?? null);
}

function updateUpdatedFilter(
  value: ProjectUpdatedFilterOption | string | null | undefined,
): void {
  emit("update:updatedFilter", value ?? null);
}
</script>

<template>
  <div
    class="flex flex-col gap-3 sm:flex-row sm:flex-wrap"
    data-testid="projects-filters"
  >
    <div class="flex w-full flex-col gap-1.5 sm:w-[360px]">
      <label
        for="projects-search"
        class="sr-only"
      >
        Search
      </label>
      <AutoComplete
        append-to="self"
        data-testid="projects-search-filter"
        input-id="projects-search"
        class="w-full"
        option-label="label"
        placeholder="Search projects or tasks"
        :model-value="searchValue"
        :suggestions="searchSuggestions"
        complete-on-focus
        dropdown
        dropdown-mode="blank"
        fluid
        :min-length="0"
        :pt="giTiempoSelfAppendedAutoCompleteDropdownPt"
        @complete="emitSearchComplete"
        @update:model-value="updateSearchValue"
      >
        <template #option="slotProps">
          <div class="flex flex-col gap-0.5">
            <span
              class="text-text-dark text-sm"
              :class="slotProps.option.kind === 'project' ? 'font-semibold' : 'font-normal'"
            >
              {{ slotProps.option.label }}
            </span>
            <span class="text-text-muted text-xs">
              {{ slotProps.option.meta }}
            </span>
          </div>
        </template>
      </AutoComplete>
    </div>

    <div class="flex w-full flex-col gap-1.5 sm:w-[180px]">
      <label
        for="projects-status-filter"
        class="sr-only"
      >
        Status
      </label>
      <Select
        data-testid="projects-status-filter"
        input-id="projects-status-filter"
        class="w-full"
        option-label="label"
        placeholder="All statuses"
        :model-value="statusFilter"
        fluid
        :options="statusFilterOptions"
        :pt="giTiempoSelectPt"
        @update:model-value="updateStatusFilter"
      />
    </div>

    <div class="flex w-full flex-col gap-1.5 sm:w-[180px]">
      <label
        for="projects-updated-filter"
        class="sr-only"
      >
        Updated
      </label>
      <Select
        data-testid="projects-updated-filter"
        input-id="projects-updated-filter"
        class="w-full"
        option-label="label"
        placeholder="Any time"
        :model-value="updatedFilter"
        fluid
        :options="updatedFilterOptions"
        :pt="giTiempoSelectPt"
        @update:model-value="updateUpdatedFilter"
      />
    </div>
  </div>
</template>
