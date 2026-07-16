<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  giTiempoDatePickerPt,
  giTiempoFieldWidthSelectPt,
} from '@gitiempo/web-config/theme';
import {
  EmptyStateBlock,
  FilterAutoComplete,
  ManagementTableShell,
  MobileRecordCard,
  SectionHeader,
  filterAutocompleteOptions,
  normalizeReportDateRangeValue,
  useIsMobileViewport,
  type ManagementTableColumn,
  type ReportDatePickerRangeValue,
} from '@gitiempo/web-shared';
import { formatPaddedHoursMinutesDuration } from '@gitiempo/web-shared/time';
import Column from 'primevue/column';
import DatePicker from 'primevue/datepicker';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import Skeleton from 'primevue/skeleton';
import Select from 'primevue/select';

import ManagementDesktopRowSkeleton from '@/components/loading/ManagementDesktopRowSkeleton.vue';
import {
  adminTableBodyRowClass,
  adminTableColumnPt,
  adminTableClass,
  adminTableHeaderClass,
  adminTableMinWidthClass,
} from '@/lib/admin-table-classes';
import MobileRecordMetadataList from '@/components/MobileRecordMetadataList.vue';
import {
  type ReportBillableFilter,
  type ReportDateRange,
  type ReportFilterOption,
  type ReportGrouping,
  type ReportHoursFilter,
  type ReportTableRow,
  type ReportTableFilters,
} from '@/lib/report-view-model';

interface AutoCompleteCompleteEvent {
  query: string;
}

type ReportIdentityColumn = 'project' | 'member';

const props = defineProps<{
  loading: boolean;
  memberOptions: ReportFilterOption[];
  projectOptions: ReportFilterOption[];
  rows: ReportTableRow[];
}>();

const filters = defineModel<ReportTableFilters>('filters', { required: true });
const dateRange = defineModel<ReportDateRange>('dateRange', { required: true });
const grouping = defineModel<ReportGrouping>('grouping', { required: true });
const isMobileViewport = useIsMobileViewport();
const projectFilterSuggestions = ref<ReportFilterOption[]>([]);
const memberFilterSuggestions = ref<ReportFilterOption[]>([]);

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

const groupingOptions: { label: string; value: ReportGrouping }[] = [
  { label: 'Group by: Project', value: 'project' },
  { label: 'Group by: Member', value: 'member' },
];

const memberLeads = computed(() => grouping.value === 'member');

// Filters follow the columns, and both filters stay for every grouping: under
// project grouping the member filter answers which projects someone worked on.
const filterOrder = computed<ReportIdentityColumn[]>(() =>
  memberLeads.value ? ['member', 'project'] : ['project', 'member'],
);

// Grouping by project totals a project across everyone, so no single member owns
// the row; it reports how many contributed instead.
const columns = computed<ManagementTableColumn[]>(() =>
  memberLeads.value
    ? [
        { key: 'member', label: 'Member', width: 'fill' },
        { key: 'project', label: 'Project', width: 180 },
        { key: 'hours', label: 'Hours', width: 140, align: 'end' },
        { key: 'billable', label: 'Billable', width: 140, align: 'end' },
      ]
    : [
        { key: 'project', label: 'Project', width: 'fill' },
        { key: 'members', label: 'Members', width: 180 },
        { key: 'hours', label: 'Hours', width: 140, align: 'end' },
        { key: 'billable', label: 'Billable', width: 140, align: 'end' },
      ],
);

function formatMemberCount(count: number): string {
  return `${count} ${count === 1 ? 'member' : 'members'}`;
}


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

function handleGlobalSearchUpdate(value: string | null | undefined): void {
  filters.value.global = value ?? '';
}

function handleDateRangeUpdate(value: ReportDatePickerRangeValue): void {
  dateRange.value = normalizeReportDateRangeValue(value);
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
</script>

<template>
  <div class="flex flex-col gap-4">
    <div>
      <SectionHeader title="Results">
        <template #actions>
          <div class="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <DatePicker
              :model-value="dateRange"
              aria-label="Report date range"
              class="w-full sm:w-[240px]"
              date-format="M d, yy"
              icon-display="input"
              :manual-input="false"
              placeholder="All dates"
              :pt="giTiempoDatePickerPt"
              selection-mode="range"
              show-button-bar
              show-clear
              show-icon
              @update:model-value="handleDateRangeUpdate"
            />

            <Select
              v-model="grouping"
              aria-label="Group report rows"
              class="w-full sm:w-[200px]"
              :options="groupingOptions"
              option-label="label"
              option-value="value"
              :pt="giTiempoFieldWidthSelectPt"
            />

            <IconField class="w-full sm:w-[280px]">
              <InputIcon class="pi pi-search text-text-muted" />
              <InputText
                :model-value="filters.global"
                aria-label="Search report rows"
                class="h-[38px] w-full rounded-[6px] text-[14px]"
                placeholder="Search report rows"
                @update:model-value="handleGlobalSearchUpdate"
              />
            </IconField>

            <slot name="actions" />
          </div>
        </template>
      </SectionHeader>
    </div>

    <template v-if="isMobileViewport">
      <div class="grid gap-3">
        <div class="flex flex-col gap-1.5">
          <label
            for="mobile-report-project-filter"
            class="text-text-muted text-[12px] font-medium"
          >Project</label>
          <FilterAutoComplete
            append-to="self"
            input-id="mobile-report-project-filter"
            :model-value="selectedProjectFilterOption"
            force-selection
            option-label="label"
            placeholder="All projects"
            show-clear
            :suggestions="projectFilterSuggestions"
            @complete="handleProjectFilterComplete"
            @update:model-value="handleProjectFilterUpdate"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label
            for="mobile-report-member-filter"
            class="text-text-muted text-[12px] font-medium"
          >Member</label>
          <FilterAutoComplete
            append-to="self"
            input-id="mobile-report-member-filter"
            :model-value="selectedMemberFilterOption"
            force-selection
            option-label="label"
            placeholder="All members"
            show-clear
            :suggestions="memberFilterSuggestions"
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
              :pt="giTiempoFieldWidthSelectPt"
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
              :pt="giTiempoFieldWidthSelectPt"
            />
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-3">
        <template v-if="loading && rows.length === 0">
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
                {{ memberLeads ? row.memberName : row.projectName }}
              </h3>
              <p class="text-text-muted truncate text-[13px]">
                {{ memberLeads ? row.projectName : formatMemberCount(row.memberIds.length) }}
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

    <!-- Loading renders skeleton rows through #empty instead of the DataTable
         spinner overlay, and refreshes keep the loaded rows visible — the same
         treatment the mobile cards above already get. -->
    <ManagementTableShell
      v-else
      :columns="columns"
      :value="rows"
      :loading="false"
      data-key="id"
      :body-row-class="adminTableBodyRowClass"
      :header-class="adminTableHeaderClass"
      shell-class="border-divider overflow-x-auto rounded-[6px] border"
      single-scroll
      :table-class="adminTableClass"
      table-container-class="overflow-visible rounded-none border-none"
    >
      <template #filters>
        <div
          class="flex flex-1 items-center"
          :class="adminTableMinWidthClass"
        >
          <div
            v-for="(key, index) in filterOrder"
            :key="key"
            class="pr-3"
            :class="index === 0 ? 'min-w-0 flex-1 pl-3' : 'w-[180px] [&_.p-autocomplete-input]:pl-6'"
          >
            <FilterAutoComplete
              v-if="key === 'project'"
              :model-value="selectedProjectFilterOption"
              aria-label="Filter report rows by project"
              force-selection
              option-label="label"
              placeholder="All projects"
              show-clear
              :suggestions="projectFilterSuggestions"
              @complete="handleProjectFilterComplete"
              @update:model-value="handleProjectFilterUpdate"
            />
            <FilterAutoComplete
              v-else
              :model-value="selectedMemberFilterOption"
              aria-label="Filter report rows by member"
              force-selection
              option-label="label"
              placeholder="All members"
              show-clear
              :suggestions="memberFilterSuggestions"
              @complete="handleMemberFilterComplete"
              @update:model-value="handleMemberFilterUpdate"
            />
          </div>

          <div class="w-[140px] pr-3 [&_.p-select-label]:pl-6">
            <Select
              v-model="filters.hours"
              :options="hoursFilterOptions"
              aria-label="Filter report rows by hours"
              option-label="label"
              option-value="value"
              :pt="giTiempoFieldWidthSelectPt"
            />
          </div>
          <div class="w-[140px] pr-3 [&_.p-select-label]:pl-6">
            <Select
              v-model="filters.billable"
              :options="billableFilterOptions"
              aria-label="Filter report rows by billable hours"
              option-label="label"
              option-value="value"
              :pt="giTiempoFieldWidthSelectPt"
            />
          </div>
        </div>
      </template>

      <Column :pt="adminTableColumnPt">
        <template #body="{ data }">
          <span class="text-text-dark text-[14px] leading-none font-semibold">{{ memberLeads ? data.memberName : data.projectName }}</span>
        </template>
      </Column>

      <Column
        style="width: 180px"
        :pt="adminTableColumnPt"
      >
        <template #body="{ data }">
          <span class="text-text-muted text-[13px] font-normal">{{ memberLeads ? data.projectName : formatMemberCount(data.memberIds.length) }}</span>
        </template>
      </Column>

      <Column
        style="width: 140px"
        :pt="adminTableColumnPt"
      >
        <template #body="{ data }">
          <div class="text-right">
            <span class="text-text-dark text-[13px] font-semibold">{{ formatPaddedHoursMinutesDuration(data.totalSeconds) }}</span>
          </div>
        </template>
      </Column>

      <Column
        style="width: 140px"
        :pt="adminTableColumnPt"
      >
        <template #body="{ data }">
          <div class="text-right">
            <span class="text-text-dark text-[13px] font-semibold">{{ formatPaddedHoursMinutesDuration(data.billableSeconds) }}</span>
          </div>
        </template>
      </Column>

      <template #empty>
        <template v-if="loading">
          <ManagementDesktopRowSkeleton
            v-for="index in 6"
            :key="index"
            data-testid="reports-desktop-loading-row"
            variant="reports"
          />
        </template>

        <EmptyStateBlock
          v-else
          title="No report rows found"
          description="No matching report rows are available for the current filters."
        />
      </template>
    </ManagementTableShell>
  </div>
</template>
