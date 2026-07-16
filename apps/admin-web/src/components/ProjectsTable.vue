<script setup lang="ts">
import { computed, ref } from 'vue';
import { ChevronDownIcon, FolderPlusIcon } from '@heroicons/vue/24/outline';
import type { ProjectResponse } from '@gitiempo/shared';
import { giTiempoFieldWidthSelectPt } from '@gitiempo/web-config/theme';
import {
  EmptyStateBlock,
  EntryActionButton,
  FilterAutoComplete,
  ManagementTableShell,
  MobileRecordCard,
  SectionHeader,
  filterAutocompleteStrings,
  managementTableFilterMultiSelectPt,
  type ManagementTableColumn,
} from '@gitiempo/web-shared';
import Button from 'primevue/button';
import Column from 'primevue/column';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import MultiSelect from 'primevue/multiselect';
import Skeleton from 'primevue/skeleton';
import Select from 'primevue/select';
import Tag from 'primevue/tag';

import {
  adminTableBodyRowClass,
  adminTableColumnPt,
  adminTableClass,
  adminTableHeaderClass,
  adminTableMinWidthClass,
} from '@/lib/admin-table-classes';
import MobileRecordMetadataList from '@/components/MobileRecordMetadataList.vue';
import type {
  ProjectHoursFilter,
  ProjectsTableExpandedRows,
  ProjectsTableFilterOption,
  ProjectsTableFilterUpdate,
  ProjectsTableFilters,
  ProjectsTableRow,
} from '@/lib/projects-table';

interface AutoCompleteCompleteEvent {
  query: string;
}

const props = defineProps<{
  emptyDescription: string;
  expandedRows: ProjectsTableExpandedRows;
  filters: ProjectsTableFilters;
  hoursFilterOptions: ProjectsTableFilterOption<ProjectHoursFilter>[];
  isMobileViewport: boolean;
  loading: boolean;
  memberFilterOptions: ProjectsTableFilterOption[];
  rows: ProjectsTableRow[];
  sourceFilterOptions: ProjectsTableFilterOption<ProjectResponse['source']>[];
  visibilityFilterOptions: ProjectsTableFilterOption<ProjectResponse['visibility']>[];
}>();

const projectQuerySuggestions = ref<string[]>([]);

const projectQueryOptions = computed(() =>
  [...new Set(props.rows.map((row) => row.name))].sort((a, b) => a.localeCompare(b)),
);

function handleProjectQueryComplete(event: AutoCompleteCompleteEvent): void {
  projectQuerySuggestions.value = filterAutocompleteStrings(
    projectQueryOptions.value,
    event.query,
  );
}

const emit = defineEmits<{
  'edit-project': [project: ProjectResponse];
  'new-project': [];
  'update:expandedRows': [expandedRows: ProjectsTableExpandedRows | undefined];
  'update:filters': [filters: ProjectsTableFilterUpdate];
}>();

function updateFilters(filters: ProjectsTableFilterUpdate): void {
  emit('update:filters', filters);
}

function updateGlobalFilter(value: string | undefined): void {
  updateFilters({ global: value });
}

function updateProjectQueryFilter(value: string | null | undefined): void {
  updateFilters({ projectQuery: value ?? '' });
}

function updateMemberIdsFilter(value: string[] | null | undefined): void {
  updateFilters({ memberIds: value ?? [] });
}

function updateSourceFilter(
  value: ProjectResponse['source'] | null | undefined,
): void {
  updateFilters({ source: value });
}

function updateHoursFilter(value: ProjectHoursFilter | undefined): void {
  updateFilters({ hours: value });
}

function updateVisibilityFilter(
  value: ProjectResponse['visibility'] | null | undefined,
): void {
  updateFilters({ visibility: value });
}

function updateExpandedRows(value: ProjectsTableExpandedRows | undefined): void {
  emit('update:expandedRows', value);
}

const columns: ManagementTableColumn[] = [
  { key: 'project', label: 'Project', width: 'fill' },
  { key: 'source', label: 'Source', width: 140 },
  { key: 'members', label: 'Assigned members', width: 220 },
  { key: 'hours', label: 'Hours', width: 120 },
  { key: 'visibility', label: 'Visibility', width: 120 },
];

</script>

<template>
  <div class="mb-4">
    <SectionHeader title="Projects Table">
      <template #actions>
        <div class="flex w-full items-center gap-3 sm:w-auto">
          <IconField class="w-full sm:w-[260px]">
            <InputIcon class="pi pi-search text-text-muted" />
            <InputText
              :model-value="filters.global"
              aria-label="Search projects"
              class="h-[38px] w-full rounded-[6px] text-[14px]"
              placeholder="Search projects"
              @update:model-value="updateGlobalFilter"
            />
          </IconField>
          <EntryActionButton
            data-testid="projects-table-new-project"
            :icon="FolderPlusIcon"
            label="New project"
            @click="emit('new-project')"
          />
        </div>
      </template>
    </SectionHeader>
  </div>

  <div
    v-if="isMobileViewport"
    class="mb-4 grid gap-3"
  >
    <div class="flex flex-col gap-1.5">
      <label
        for="mobile-project-name-filter"
        class="text-text-muted text-[12px] font-medium"
      >Project</label>
      <FilterAutoComplete
        append-to="self"
        input-id="mobile-project-name-filter"
        :model-value="filters.projectQuery"
        placeholder="Filter project"
        :suggestions="projectQuerySuggestions"
        @complete="handleProjectQueryComplete"
        @update:model-value="updateProjectQueryFilter"
      />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-1.5">
        <label
          for="mobile-project-source-filter"
          class="text-text-muted text-[12px] font-medium"
        >Source</label>
        <Select
          id="mobile-project-source-filter"
          :model-value="filters.source"
          :options="sourceFilterOptions"
          option-label="label"
          option-value="value"
          placeholder="All sources"
          show-clear
          :pt="giTiempoFieldWidthSelectPt"
          @update:model-value="updateSourceFilter"
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label
          for="mobile-project-visibility-filter"
          class="text-text-muted text-[12px] font-medium"
        >Visibility</label>
        <Select
          id="mobile-project-visibility-filter"
          :model-value="filters.visibility"
          :options="visibilityFilterOptions"
          option-label="label"
          option-value="value"
          placeholder="All"
          show-clear
          :pt="giTiempoFieldWidthSelectPt"
          @update:model-value="updateVisibilityFilter"
        />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-1.5">
        <label
          for="mobile-project-hours-filter"
          class="text-text-muted text-[12px] font-medium"
        >Hours</label>
        <Select
          id="mobile-project-hours-filter"
          :model-value="filters.hours"
          :options="hoursFilterOptions"
          option-label="label"
          option-value="value"
          :pt="giTiempoFieldWidthSelectPt"
          @update:model-value="updateHoursFilter"
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label
          for="mobile-project-members-filter"
          class="text-text-muted text-[12px] font-medium"
        >Assigned members</label>
        <MultiSelect
          input-id="mobile-project-members-filter"
          :model-value="filters.memberIds"
          :options="memberFilterOptions"
          display="chip"
          filter
          option-label="label"
          option-value="value"
          placeholder="All members"
          show-clear
          :pt="managementTableFilterMultiSelectPt"
          @update:model-value="updateMemberIdsFilter"
        />
      </div>
    </div>
  </div>

  <div
    v-if="isMobileViewport"
    class="flex flex-col gap-3"
  >
    <template v-if="loading && rows.length === 0">
      <MobileRecordCard
        v-for="index in 3"
        :key="index"
        data-testid="projects-mobile-loading-card"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton
              width="9rem"
              height="1rem"
            />
            <Skeleton
              width="5rem"
              height="0.875rem"
            />
          </div>
          <Skeleton
            width="4.5rem"
            height="1.5rem"
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-2">
            <Skeleton
              width="6rem"
              height="0.75rem"
            />
            <Skeleton
              width="5rem"
              height="0.875rem"
            />
          </div>
          <div class="flex flex-col gap-2">
            <Skeleton
              width="3rem"
              height="0.75rem"
            />
            <Skeleton
              width="4rem"
              height="0.875rem"
            />
          </div>
        </div>
      </MobileRecordCard>
    </template>

    <template v-else-if="rows.length > 0">
      <MobileRecordCard
        v-for="row in rows"
        :key="row.id"
        data-testid="project-mobile-card"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h3>
              <Button
                type="button"
                variant="link"
                :aria-expanded="Boolean(expandedRows[row.id])"
                :aria-label="`Edit project ${row.name}`"
                :data-testid="`project-mobile-name-${row.id}`"
                :pt="{
                  root: {
                    class: [
                      'group inline-flex max-w-full items-center gap-1.5 rounded-none border-0 bg-transparent p-0 text-left text-[15px] font-semibold shadow-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                      row.nameClass,
                    ],
                  },
                }"
                @click="emit('edit-project', row.project)"
              >
                <span class="truncate">{{ row.name }}</span>
                <span
                  aria-hidden="true"
                  class="flex size-[18px] shrink-0 items-center justify-center rounded-full transition-colors duration-200"
                  :class="expandedRows[row.id] ? 'bg-accent-tint' : 'bg-app-bg group-hover:bg-accent-tint'"
                >
                  <ChevronDownIcon
                    class="size-[11px] stroke-[2.5] transition-all duration-200"
                    :class="expandedRows[row.id] ? 'text-brand rotate-180' : 'text-text-muted group-hover:text-brand'"
                  />
                </span>
              </Button>
            </h3>
            <p class="text-text-muted text-[13px]">
              {{ row.sourceLabel }}
            </p>
          </div>

          <template v-if="row.isActive">
            <Tag
              v-if="row.visibility === 'public'"
              value="Public"
              :pt="{
                root: 'inline-flex shrink-0 items-center rounded-[6px] bg-accent-tint px-2 py-1 text-[12px] font-semibold leading-none text-brand',
              }"
            />
            <Tag
              v-else
              value="Private"
              :pt="{
                root: 'inline-flex shrink-0 items-center rounded-[6px] bg-status-warn-bg px-2 py-1 text-[12px] font-semibold leading-none text-status-warn-text',
              }"
            />
          </template>
          <Tag
            v-else
            :value="row.visibilityLabel"
            :pt="{
              root: 'inline-flex shrink-0 items-center rounded-[6px] bg-divider px-2 py-1 text-[12px] font-semibold leading-none',
              label: 'text-text-muted',
            }"
          />
        </div>

        <MobileRecordMetadataList
          :items="[
            { label: 'Assigned members', value: row.assignedMembersLabel },
            { label: 'Hours', value: row.hoursLabel },
          ]"
        />

        <slot
          name="row-expansion"
          :row="row"
        />
      </MobileRecordCard>
    </template>

    <EmptyStateBlock
      v-else
      title="No projects found"
      :description="emptyDescription"
    />
  </div>

  <ManagementTableShell
    v-else
    :expanded-rows="expandedRows"
    :columns="columns"
    :value="rows"
    :loading="loading"
    :body-row-class="adminTableBodyRowClass"
    data-key="id"
    :header-class="adminTableHeaderClass"
    shell-class="border-divider overflow-x-auto rounded-[6px] border"
    single-scroll
    :table-class="adminTableClass"
    table-container-class="overflow-visible rounded-none border-none"
    @update:expanded-rows="updateExpandedRows"
  >
    <template #filters>
      <div
          class="flex flex-1 items-center"
          :class="adminTableMinWidthClass"
        >
        <div class="min-w-0 flex-1 px-3">
          <FilterAutoComplete
            :model-value="filters.projectQuery"
            aria-label="Filter projects by name"
            placeholder="Filter project"
            :suggestions="projectQuerySuggestions"
            @complete="handleProjectQueryComplete"
            @update:model-value="updateProjectQueryFilter"
          />
        </div>

        <div class="w-[140px] pr-3 [&_.p-select-label]:pl-6">
          <Select
            :model-value="filters.source"
            :options="sourceFilterOptions"
            aria-label="Filter projects by source"
            option-label="label"
            option-value="value"
            placeholder="All sources"
            show-clear
            :pt="giTiempoFieldWidthSelectPt"
            @update:model-value="updateSourceFilter"
          />
        </div>

        <div class="w-[220px] pr-3 [&_.p-multiselect-label]:pl-6">
          <MultiSelect
            :model-value="filters.memberIds"
            :options="memberFilterOptions"
            aria-label="Filter projects by assigned members"
            display="chip"
            filter
            option-label="label"
            option-value="value"
            placeholder="All members"
            show-clear
            :pt="managementTableFilterMultiSelectPt"
            @update:model-value="updateMemberIdsFilter"
          />
        </div>

        <div class="w-[120px] pr-3 text-right [&_.p-select-label]:pl-6">
          <Select
            :model-value="filters.hours"
            :options="hoursFilterOptions"
            aria-label="Filter projects by hours"
            option-label="label"
            option-value="value"
            :pt="giTiempoFieldWidthSelectPt"
            @update:model-value="updateHoursFilter"
          />
        </div>

        <div class="w-[120px] pr-3 [&_.p-select-label]:pl-6">
          <Select
            :model-value="filters.visibility"
            :options="visibilityFilterOptions"
            aria-label="Filter projects by visibility"
            option-label="label"
            option-value="value"
            placeholder="All"
            show-clear
            :pt="giTiempoFieldWidthSelectPt"
            @update:model-value="updateVisibilityFilter"
          />
        </div>
      </div>
    </template>

    <Column :pt="adminTableColumnPt">
      <template #body="{ data }">
        <Button
          type="button"
          variant="link"
          :aria-expanded="Boolean(expandedRows[data.id])"
          :aria-label="`Edit project ${data.name}`"
          :data-testid="`project-name-${data.id}`"
          :pt="{
            root: {
              class: [
                'group inline-flex max-w-full items-center gap-1.5 rounded-none border-0 bg-transparent p-0 text-left text-[14px] leading-none font-semibold shadow-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                data.nameClass,
              ],
            },
          }"
          @click="emit('edit-project', data.project)"
        >
          <span class="truncate">{{ data.name }}</span>
          <span
            aria-hidden="true"
            class="flex size-[18px] shrink-0 items-center justify-center rounded-full transition-colors duration-200"
            :class="expandedRows[data.id] ? 'bg-accent-tint' : 'bg-app-bg group-hover:bg-accent-tint'"
          >
            <ChevronDownIcon
              class="size-[11px] stroke-[2.5] transition-all duration-200"
              :class="expandedRows[data.id] ? 'text-brand rotate-180' : 'text-text-muted group-hover:text-brand'"
            />
          </span>
        </Button>
      </template>
    </Column>

    <Column
      style="width: 140px"
      :pt="adminTableColumnPt"
    >
      <template #body="{ data }">
        <span class="text-text-muted text-[13px] font-normal">{{
          data.sourceLabel
        }}</span>
      </template>
    </Column>

    <Column
      style="width: 220px"
      :pt="adminTableColumnPt"
    >
      <template #body="{ data }">
        <span class="text-text-muted text-[13px] font-normal">{{ data.assignedMembersLabel }}</span>
      </template>
    </Column>

    <Column
      style="width: 120px"
      :pt="adminTableColumnPt"
    >
      <template #body="{ data }">
        <span class="text-text-dark text-[13px] font-semibold">{{ data.hoursLabel }}</span>
      </template>
    </Column>

    <Column
      style="width: 120px"
      :pt="adminTableColumnPt"
    >
      <template #body="{ data }">
        <template v-if="data.isActive">
          <Tag
            v-if="data.visibility === 'public'"
            value="Public"
            :pt="{
              root: 'inline-flex items-center rounded-[6px] bg-accent-tint px-2 py-1 text-[12px] font-semibold leading-none text-brand',
            }"
          />
          <Tag
            v-else
            value="Private"
            :pt="{
              root: 'inline-flex items-center rounded-[6px] bg-status-warn-bg px-2 py-1 text-[12px] font-semibold leading-none text-status-warn-text',
            }"
          />
        </template>
        <Tag
          v-else
          :value="data.visibilityLabel"
          :pt="{
            root: 'inline-flex items-center rounded-[6px] bg-divider px-2 py-1 text-[12px] font-semibold leading-none',
            label: 'text-text-muted',
          }"
        />
      </template>
    </Column>

    <template #expansion="{ data }">
      <slot
        name="row-expansion"
        :row="data"
      />
    </template>

    <template #empty>
      <EmptyStateBlock
        title="No projects found"
        :description="emptyDescription"
      />
    </template>
  </ManagementTableShell>
</template>
