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
import {
  formatLocalCalendarDate,
  formatPaddedHoursMinutesDuration,
} from '@gitiempo/web-shared/time';
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
import ReportGroupingBuilder from '@/components/reports/ReportGroupingBuilder.vue';
import { useReportTableTree } from '@/composables/reports/useReportTableTree';
import {
  formatReportPercent,
  reportGroupingDimensionLabels,
  type ReportActivityFilter,
  type ReportBillableFilter,
  type ReportBillableShareFilter,
  type ReportDateRange,
  type ReportDisplayRow,
  type ReportFilterOption,
  type ReportGrouping,
  type ReportGroupingDimension,
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

// Tree assembly, collapse state, and totals live in the composable so this
// component stays a composition shell; the grouping builder owns reordering.
const { collapsedIds, displayRows, totals, toggleRowExpansion } =
  useReportTableTree({
    rows: () => props.rows,
    grouping: () => grouping.value,
    filters: () => filters.value,
  });

const groupingColumnLabel = computed(() =>
  grouping.value
    .map((dimension) => reportGroupingDimensionLabels[dimension])
    .join(' / '),
);

const columns = computed<ManagementTableColumn[]>(() => [
  { key: 'group', label: groupingColumnLabel.value, width: 'fill' },
  { key: 'hours', label: 'Hours', width: 120 },
  { key: 'billable', label: 'Billable', width: 120 },
  { key: 'billableShare', label: 'Billable %', width: 110 },
  { key: 'activity', label: 'Last activity', width: 130 },
]);

function getRowLabelClass(row: ReportDisplayRow): string {
  if (row.level === 0) {
    return 'text-text-dark text-[14px] leading-none font-semibold';
  }
  if (!row.isLeaf || row.level === 1) {
    return 'text-text-dark text-[14px] leading-none font-medium';
  }

  return 'text-text-dark text-[13px] leading-none font-normal';
}

// Top-level group rows read as subtotal bands, like the approved design.
function getReportRowClass(data: ReportDisplayRow): string {
  return data.level === 0 && !data.isLeaf ? 'bg-app-bg/50' : '';
}

function formatRowActivity(lastStartedAt: string | null): string {
  return lastStartedAt ? formatLocalCalendarDate(lastStartedAt) : '—';
}

// Mobile cards badge each row by its grouping dimension so the level reads at a
// glance without relying on indentation alone.
const reportDimensionIcon: Record<ReportGroupingDimension, string> = {
  member: 'pi-user',
  project: 'pi-folder',
  task: 'pi-check-square',
};

// Second line of a mobile card: a group's own child count ("6 members"), or the
// leaf's time-entry count so every row carries context.
function reportRowMeta(row: ReportDisplayRow): string {
  if (row.childCountLabel) {
    return row.childCountLabel;
  }

  return `${row.entryCount} ${row.entryCount === 1 ? 'entry' : 'entries'}`;
}

// Billable meter fill as a raw percentage; a null share (no tracked time) reads
// as an empty bar rather than a divide-by-zero.
function billableMeterWidth(share: number | null): number {
  if (share === null) {
    return 0;
  }

  return Math.min(100, Math.max(0, share * 100));
}

const hoursFilterOptions: { label: string; value: ReportHoursFilter }[] = [
  { label: 'Any', value: 'any' },
  { label: 'Tracked', value: 'gt0' },
  { label: '8h+', value: 'gte8' },
  { label: '40h+', value: 'gte40' },
];

const billableFilterOptions: { label: string; value: ReportBillableFilter }[] =
  [
    { label: 'Any', value: 'any' },
    { label: 'Billable', value: 'withBillable' },
    { label: 'Non-billable', value: 'withoutBillable' },
  ];

const billableShareFilterOptions: {
  label: string;
  value: ReportBillableShareFilter;
}[] = [
  { label: 'Any', value: 'any' },
  { label: 'Below 50%', value: 'below50' },
  { label: '50%+', value: 'gte50' },
  { label: '90%+', value: 'gte90' },
];

const activityFilterOptions: {
  label: string;
  value: ReportActivityFilter;
}[] = [
  { label: 'Any time', value: 'any' },
  { label: 'Today', value: 'today' },
  { label: 'Last 7 days', value: 'last7' },
  { label: 'Last 30 days', value: 'last30' },
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
          <div
            class="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center"
          >
            <DatePicker
              :model-value="dateRange"
              aria-label="Report date range"
              class="w-full sm:w-[220px]"
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

            <IconField class="w-full sm:w-[240px] md:w-[280px]">
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

    <ReportGroupingBuilder v-model:grouping="grouping" />

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

          <div class="flex flex-col gap-1.5">
            <label
              for="mobile-report-billable-share-filter"
              class="text-text-muted text-[12px] font-medium"
            >Billable %</label>
            <Select
              id="mobile-report-billable-share-filter"
              v-model="filters.billableShare"
              :options="billableShareFilterOptions"
              option-label="label"
              option-value="value"
              :pt="giTiempoFieldWidthSelectPt"
            />
          </div>

          <div class="col-span-2 flex flex-col gap-1.5">
            <label
              for="mobile-report-activity-filter"
              class="text-text-muted text-[12px] font-medium"
            >Last activity</label>
            <Select
              id="mobile-report-activity-filter"
              v-model="filters.activity"
              :options="activityFilterOptions"
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

        <template v-else-if="displayRows.length > 0">
          <div
            v-for="row in displayRows"
            :key="row.id"
            :style="{ marginLeft: `${row.level * 12}px` }"
          >
            <MobileRecordCard data-testid="report-mobile-card">
              <div class="flex items-center justify-between gap-3">
                <div class="flex min-w-0 items-center gap-2.5">
                  <span
                    class="bg-accent-tint flex size-8 shrink-0 items-center justify-center rounded-md"
                    aria-hidden="true"
                  >
                    <i
                      :class="[
                        'pi text-brand text-[15px]',
                        reportDimensionIcon[row.dimension],
                      ]"
                    />
                  </span>
                  <div class="flex min-w-0 flex-col gap-0.5">
                    <h3 class="text-text-dark truncate text-[15px] font-semibold">
                      {{ row.label }}
                    </h3>
                    <p class="text-text-muted truncate text-[12px]">
                      {{ reportRowMeta(row) }}
                    </p>
                  </div>
                </div>

                <button
                  v-if="row.hasChildren"
                  type="button"
                  class="text-text-muted hover:bg-app-bg flex size-8 shrink-0 items-center justify-center rounded-md border-none bg-transparent p-0"
                  :aria-expanded="!collapsedIds.has(row.id)"
                  :aria-label="`Toggle ${row.label} group`"
                  data-testid="report-mobile-toggle"
                  @click="toggleRowExpansion(row)"
                >
                  <i
                    :class="[
                      'pi text-[14px]',
                      collapsedIds.has(row.id)
                        ? 'pi-chevron-right'
                        : 'pi-chevron-down',
                    ]"
                  />
                </button>
              </div>

              <div class="bg-divider h-px w-full" />

              <div class="flex flex-col gap-2">
                <div class="flex items-end justify-between gap-3">
                  <div class="flex min-w-0 flex-col gap-1">
                    <span
                      class="text-text-muted text-[10px] font-semibold tracking-wide"
                    >TRACKED</span>
                    <span
                      class="text-text-dark text-[19px] leading-none font-bold"
                    >{{ formatPaddedHoursMinutesDuration(row.totalSeconds) }}</span>
                  </div>
                  <div class="flex shrink-0 flex-col items-end gap-1">
                    <span
                      class="text-text-muted text-[10px] font-semibold tracking-wide"
                    >BILLABLE</span>
                    <span
                      class="text-brand text-[19px] leading-none font-bold"
                    >{{ formatReportPercent(row.billableShare) }}</span>
                  </div>
                </div>

                <div
                  class="bg-accent-tint h-1.5 w-full overflow-hidden rounded-full"
                  role="presentation"
                >
                  <div
                    class="bg-brand h-full rounded-full"
                    :style="{ width: `${billableMeterWidth(row.billableShare)}%` }"
                  />
                </div>
              </div>

              <div class="flex items-center justify-between gap-3">
                <span class="text-text-muted truncate text-[11px]">
                  {{ formatPaddedHoursMinutesDuration(row.billableSeconds) }}
                  billable
                </span>
                <span
                  class="text-text-muted flex shrink-0 items-center gap-1.5 text-[11px]"
                >
                  <i
                    class="pi pi-clock text-[11px]"
                    aria-hidden="true"
                  />
                  {{ formatRowActivity(row.lastStartedAt) }}
                </span>
              </div>
            </MobileRecordCard>
          </div>
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
    <div
      v-else
      class="border-divider overflow-x-auto rounded-[6px] border"
    >
      <ManagementTableShell
        :columns="columns"
        :value="displayRows"
        :loading="false"
        data-key="id"
        :body-row-class="adminTableBodyRowClass"
        :header-class="adminTableHeaderClass"
        :row-class="getReportRowClass"
        shell-class="bg-surface-primary w-full font-sans"
        single-scroll
        :table-class="adminTableClass"
        table-container-class="overflow-visible rounded-none border-none"
      >
        <template #filters>
          <div
            class="flex flex-1 items-center"
            :class="adminTableMinWidthClass"
          >
            <div class="flex min-w-0 flex-1 items-center gap-2 px-3">
              <FilterAutoComplete
                class="w-[180px]"
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
                class="w-[180px]"
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

            <div class="w-[120px] pr-3">
              <Select
                v-model="filters.hours"
                :options="hoursFilterOptions"
                aria-label="Filter report rows by hours"
                option-label="label"
                option-value="value"
                :pt="giTiempoFieldWidthSelectPt"
              />
            </div>
            <div class="w-[120px] pr-3">
              <Select
                v-model="filters.billable"
                :options="billableFilterOptions"
                aria-label="Filter report rows by billable hours"
                option-label="label"
                option-value="value"
                :pt="giTiempoFieldWidthSelectPt"
              />
            </div>
            <div class="w-[110px] pr-3">
              <Select
                v-model="filters.billableShare"
                :options="billableShareFilterOptions"
                aria-label="Filter report rows by billable share"
                option-label="label"
                option-value="value"
                :pt="giTiempoFieldWidthSelectPt"
              />
            </div>
            <div class="w-[130px] pr-3">
              <Select
                v-model="filters.activity"
                :options="activityFilterOptions"
                aria-label="Filter report rows by last activity"
                option-label="label"
                option-value="value"
                :pt="giTiempoFieldWidthSelectPt"
              />
            </div>
          </div>
        </template>

        <Column :pt="adminTableColumnPt">
          <template #body="{ data }">
            <div
              class="flex min-w-0 items-center gap-2"
              :style="{ paddingLeft: `${data.level * 24}px` }"
            >
              <button
                v-if="data.hasChildren"
                type="button"
                class="text-text-muted hover:bg-app-bg flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border-none bg-transparent p-0"
                :aria-expanded="!collapsedIds.has(data.id)"
                :aria-label="`Toggle ${data.label} group`"
                data-testid="report-row-toggle"
                @click="toggleRowExpansion(data)"
              >
                <i
                  :class="[
                    'pi text-[12px]',
                    collapsedIds.has(data.id)
                      ? 'pi-chevron-right'
                      : 'pi-chevron-down',
                  ]"
                />
              </button>
              <i
                v-else-if="data.level > 0"
                class="pi pi-arrow-right text-text-muted shrink-0 text-[10px]"
                aria-hidden="true"
              />
              <span :class="['truncate', getRowLabelClass(data)]">{{
                data.label
              }}</span>
              <span
                v-if="data.childCountLabel"
                class="text-text-muted shrink-0 text-[12px] font-normal"
              >{{ data.childCountLabel }}</span>
            </div>
          </template>
        </Column>

        <Column
          style="width: 120px"
          :pt="adminTableColumnPt"
        >
          <template #body="{ data }">
            <span class="text-text-dark text-[13px] font-semibold">{{
              formatPaddedHoursMinutesDuration(data.totalSeconds)
            }}</span>
          </template>
        </Column>

        <Column
          style="width: 120px"
          :pt="adminTableColumnPt"
        >
          <template #body="{ data }">
            <span class="text-text-dark text-[13px] font-semibold">{{
              formatPaddedHoursMinutesDuration(data.billableSeconds)
            }}</span>
          </template>
        </Column>

        <Column
          style="width: 110px"
          :pt="adminTableColumnPt"
        >
          <template #body="{ data }">
            <span class="text-text-muted text-[13px] font-normal">{{
              formatReportPercent(data.billableShare)
            }}</span>
          </template>
        </Column>

        <Column
          style="width: 130px"
          :pt="adminTableColumnPt"
        >
          <template #body="{ data }">
            <span class="text-text-muted text-[13px] font-normal">{{
              formatRowActivity(data.lastStartedAt)
            }}</span>
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

      <div
        v-if="displayRows.length > 0"
        class="border-divider bg-app-bg flex h-[56px] items-center border-t"
        :class="adminTableMinWidthClass"
        data-testid="report-total-row"
      >
        <div class="flex min-w-0 flex-1 items-center gap-2 pr-3 pl-6">
          <span class="text-text-dark text-[14px] leading-none font-semibold">Total</span>
        </div>
        <div class="w-[120px] px-3">
          <span class="text-text-dark text-[13px] font-semibold">{{
            formatPaddedHoursMinutesDuration(totals.totalSeconds)
          }}</span>
        </div>
        <div class="w-[120px] px-3">
          <span class="text-text-dark text-[13px] font-semibold">{{
            formatPaddedHoursMinutesDuration(totals.billableSeconds)
          }}</span>
        </div>
        <div class="w-[110px] px-3">
          <span class="text-text-muted text-[13px] font-normal">{{
            formatReportPercent(totals.billableShare)
          }}</span>
        </div>
        <div class="w-[130px] pr-6 pl-3">
          <span class="text-text-muted text-[13px] font-normal">{{
            formatRowActivity(totals.lastStartedAt)
          }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
