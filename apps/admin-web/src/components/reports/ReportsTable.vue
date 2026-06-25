<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  EmptyStateBlock,
  ManagementTableShell,
  MobileRecordCard,
  SectionHeader,
  filterAutocompleteOptions,
  filterAutocompleteStrings,
  managementTableColumnPt,
  managementTableFilterAutoCompletePt,
  managementTableFilterSelectPt,
  useIsMobileViewport,
  type ManagementTableColumn,
} from '@gitiempo/web-shared';
import { formatPaddedHoursMinutesDuration } from '@gitiempo/web-shared/time';
import AutoComplete from 'primevue/autocomplete';
import Column from 'primevue/column';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import Skeleton from 'primevue/skeleton';
import Select from 'primevue/select';

import MobileRecordMetadataList from '@/components/MobileRecordMetadataList.vue';
import {
  type ReportBillableFilter,
  type ReportFilterOption,
  type ReportHoursFilter,
  type ReportTableRow,
  type ReportTableFilters,
} from '@/lib/report-view-model';

interface AutoCompleteCompleteEvent {
  query: string;
}

const props = defineProps<{
  loading: boolean;
  memberOptions: ReportFilterOption[];
  projectOptions: ReportFilterOption[];
  rows: ReportTableRow[];
}>();

const filters = defineModel<ReportTableFilters>('filters', { required: true });
const isMobileViewport = useIsMobileViewport();
const globalSearchSuggestions = ref<string[]>([]);
const projectFilterSuggestions = ref<ReportFilterOption[]>([]);
const memberFilterSuggestions = ref<ReportFilterOption[]>([]);

const globalSearchOptions = computed(() => {
  const labels = props.rows.flatMap((row) => [row.projectName, row.memberName]);

  return [...new Set(labels)].sort((a, b) => a.localeCompare(b));
});

const selectedProjectFilterOption = computed(
  () =>
    props.projectOptions.find(
      (option) => option.value === filters.value.projectId,
    ) ?? null,
);

const selectedMemberFilterOption = computed(
  () =>
    props.memberOptions.find(
      (option) => option.value === filters.value.memberId,
    ) ?? null,
);

const columns: ManagementTableColumn[] = [
  { key: 'project', label: 'Project', width: 'fill' },
  { key: 'member', label: 'Member', width: 180 },
  { key: 'hours', label: 'Hours', width: 140, align: 'end' },
  { key: 'billable', label: 'Billable', width: 140, align: 'end' },
];

const hoursFilterOptions: { label: string; value: ReportHoursFilter }[] = [
  { label: 'Any', value: 'any' },
  { label: 'Tracked', value: 'gt0' },
  { label: '8h+', value: 'gte8' },
  { label: '40h+', value: 'gte40' },
];

const billableFilterOptions: { label: string; value: ReportBillableFilter }[] = [
  { label: 'Any', value: 'any' },
  { label: 'Billable', value: 'withBillable' },
  { label: 'Non-billable', value: 'withoutBillable' },
];

function handleGlobalSearchComplete(event: AutoCompleteCompleteEvent): void {
  globalSearchSuggestions.value = filterAutocompleteStrings(
    globalSearchOptions.value,
    event.query,
  );
}

function handleGlobalSearchUpdate(value: string | null | undefined): void {
  filters.value.global = value ?? '';
}

function handleProjectFilterComplete(event: AutoCompleteCompleteEvent): void {
  projectFilterSuggestions.value = filterAutocompleteOptions(
    props.projectOptions,
    event.query,
    (option) => option.label,
  );
}

function handleProjectFilterUpdate(
  value: ReportFilterOption | string | null,
): void {
  if (typeof value === 'string') {
    if (value.trim().length === 0) {
      filters.value.projectId = null;
    }

    return;
  }

  filters.value.projectId = value?.value ?? null;
}

function handleMemberFilterComplete(event: AutoCompleteCompleteEvent): void {
  memberFilterSuggestions.value = filterAutocompleteOptions(
    props.memberOptions,
    event.query,
    (option) => option.label,
  );
}

function handleMemberFilterUpdate(
  value: ReportFilterOption | string | null,
): void {
  if (typeof value === 'string') {
    if (value.trim().length === 0) {
      filters.value.memberId = null;
    }

    return;
  }

  filters.value.memberId = value?.value ?? null;
}

const searchAutoCompletePt = {
  root: { class: 'relative h-[38px] w-full max-w-full min-w-0' },
  pcInputText: {
    root: { class: 'h-[38px] w-full rounded-l-[6px] rounded-r-none pl-9 text-[14px]' },
  },
  dropdown: { class: 'h-[38px] w-9 text-text-muted' },
  listContainer: { class: 'max-w-full overflow-x-hidden' },
  option: { class: 'max-w-full min-w-0 truncate text-[13px]' },
  overlay: { class: 'w-full max-w-full overflow-hidden' },
} as const;
</script>

<template>
  <div>
    <div class="mb-4">
      <SectionHeader title="Results">
        <template #actions>
          <IconField class="w-full sm:w-[280px]">
            <InputIcon class="pi pi-search text-text-muted" />
            <AutoComplete
              append-to="self"
              :model-value="filters.global"
              :suggestions="globalSearchSuggestions"
              aria-label="Search report rows"
              complete-on-focus
              dropdown
              dropdown-mode="blank"
              :min-length="0"
              placeholder="Search report rows"
              :pt="searchAutoCompletePt"
              @complete="handleGlobalSearchComplete"
              @update:model-value="handleGlobalSearchUpdate"
            />
          </IconField>
        </template>
      </SectionHeader>
    </div>

    <template v-if="isMobileViewport">
      <div class="mb-4 grid gap-3">
        <div class="flex flex-col gap-1.5">
          <label
            for="mobile-report-project-filter"
            class="text-text-muted text-[12px] font-medium"
          >Project</label>
          <AutoComplete
            append-to="self"
            input-id="mobile-report-project-filter"
            :model-value="selectedProjectFilterOption"
            :suggestions="projectFilterSuggestions"
            complete-on-focus
            dropdown
            dropdown-mode="blank"
            force-selection
            :min-length="0"
            option-label="label"
            placeholder="All projects"
            show-clear
            :pt="managementTableFilterAutoCompletePt"
            @complete="handleProjectFilterComplete"
            @update:model-value="handleProjectFilterUpdate"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label
            for="mobile-report-member-filter"
            class="text-text-muted text-[12px] font-medium"
          >Member</label>
          <AutoComplete
            append-to="self"
            input-id="mobile-report-member-filter"
            :model-value="selectedMemberFilterOption"
            :suggestions="memberFilterSuggestions"
            complete-on-focus
            dropdown
            dropdown-mode="blank"
            force-selection
            :min-length="0"
            option-label="label"
            placeholder="All members"
            show-clear
            :pt="managementTableFilterAutoCompletePt"
            @complete="handleMemberFilterComplete"
            @update:model-value="handleMemberFilterUpdate"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1.5">
            <label
              for="mobile-report-hours-filter"
              class="text-text-muted text-[12px] font-medium"
            >Hours</label>
            <Select
              id="mobile-report-hours-filter"
              v-model="filters.hours"
              :options="hoursFilterOptions"
              option-label="label"
              option-value="value"
              :pt="managementTableFilterSelectPt"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label
              for="mobile-report-billable-filter"
              class="text-text-muted text-[12px] font-medium"
            >Billable</label>
            <Select
              id="mobile-report-billable-filter"
              v-model="filters.billable"
              :options="billableFilterOptions"
              option-label="label"
              option-value="value"
              :pt="managementTableFilterSelectPt"
            />
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-3">
        <template v-if="loading">
          <MobileRecordCard
            v-for="index in 3"
            :key="index"
            data-testid="reports-mobile-loading-card"
          >
            <div class="flex min-w-0 flex-col gap-2">
              <Skeleton
                width="9rem"
                height="1rem"
              />
              <Skeleton
                width="6rem"
                height="0.875rem"
              />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="flex flex-col gap-2">
                <Skeleton
                  width="3rem"
                  height="0.75rem"
                />
                <Skeleton
                  width="4.5rem"
                  height="0.875rem"
                />
              </div>
              <div class="flex flex-col gap-2">
                <Skeleton
                  width="4rem"
                  height="0.75rem"
                />
                <Skeleton
                  width="4.5rem"
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
            data-testid="report-mobile-card"
          >
            <div class="min-w-0">
              <h3 class="text-text-dark truncate text-[15px] font-semibold">
                {{ row.projectName }}
              </h3>
              <p class="text-text-muted truncate text-[13px]">
                {{ row.memberName }}
              </p>
            </div>

            <MobileRecordMetadataList
              :items="[
                {
                  label: 'Hours',
                  value: formatPaddedHoursMinutesDuration(row.totalSeconds),
                },
                {
                  label: 'Billable',
                  value: formatPaddedHoursMinutesDuration(row.billableSeconds),
                },
              ]"
            />
          </MobileRecordCard>
        </template>

        <EmptyStateBlock
          v-else
          title="No report rows found"
          description="No matching report rows are available for the current filters."
        />
      </div>
    </template>

    <ManagementTableShell
      v-else
      :columns="columns"
      :value="rows"
      :loading="loading"
      data-key="id"
      header-class="border-divider bg-app-bg text-text-dark flex h-[44px] min-w-[720px] items-center border-b font-sans text-[13px] font-semibold"
      shell-class="border-divider overflow-x-auto rounded-[6px] border"
      single-scroll
      table-class="min-w-[720px] w-full table-fixed border-collapse"
      table-container-class="overflow-visible rounded-none border-none"
    >
      <template #filters>
        <div class="flex min-w-[720px] flex-1 items-center">
          <div class="min-w-0 flex-1 px-3">
            <AutoComplete
              append-to="self"
              :model-value="selectedProjectFilterOption"
              :suggestions="projectFilterSuggestions"
              aria-label="Filter report rows by project"
              complete-on-focus
              dropdown
              dropdown-mode="blank"
              force-selection
              :min-length="0"
              option-label="label"
              placeholder="All projects"
              show-clear
              :pt="managementTableFilterAutoCompletePt"
              @complete="handleProjectFilterComplete"
              @update:model-value="handleProjectFilterUpdate"
            />
          </div>

          <div class="w-[180px] px-3">
            <AutoComplete
              append-to="self"
              :model-value="selectedMemberFilterOption"
              :suggestions="memberFilterSuggestions"
              aria-label="Filter report rows by member"
              complete-on-focus
              dropdown
              dropdown-mode="blank"
              force-selection
              :min-length="0"
              option-label="label"
              placeholder="All members"
              show-clear
              :pt="managementTableFilterAutoCompletePt"
              @complete="handleMemberFilterComplete"
              @update:model-value="handleMemberFilterUpdate"
            />
          </div>

          <div class="w-[140px] px-3 text-right">
            <Select
              v-model="filters.hours"
              :options="hoursFilterOptions"
              aria-label="Filter report rows by hours"
              option-label="label"
              option-value="value"
              :pt="managementTableFilterSelectPt"
            />
          </div>
          <div class="w-[140px] px-3 text-right">
            <Select
              v-model="filters.billable"
              :options="billableFilterOptions"
              aria-label="Filter report rows by billable hours"
              option-label="label"
              option-value="value"
              :pt="managementTableFilterSelectPt"
            />
          </div>
        </div>
      </template>

      <Column :pt="managementTableColumnPt">
        <template #body="{ data }">
          <span class="text-text-dark text-[14px] leading-none font-semibold">{{ data.projectName }}</span>
        </template>
      </Column>

      <Column
        style="width: 180px"
        :pt="managementTableColumnPt"
      >
        <template #body="{ data }">
          <span class="text-text-muted text-[13px] font-normal">{{ data.memberName }}</span>
        </template>
      </Column>

      <Column
        style="width: 140px"
        :pt="managementTableColumnPt"
      >
        <template #body="{ data }">
          <div class="text-right">
            <span class="text-text-dark text-[13px] font-semibold">{{ formatPaddedHoursMinutesDuration(data.totalSeconds) }}</span>
          </div>
        </template>
      </Column>

      <Column
        style="width: 140px"
        :pt="managementTableColumnPt"
      >
        <template #body="{ data }">
          <div class="text-right">
            <span class="text-text-dark text-[13px] font-semibold">{{ formatPaddedHoursMinutesDuration(data.billableSeconds) }}</span>
          </div>
        </template>
      </Column>

      <template #empty>
        <EmptyStateBlock
          title="No report rows found"
          description="No matching report rows are available for the current filters."
        />
      </template>
    </ManagementTableShell>
  </div>
</template>
