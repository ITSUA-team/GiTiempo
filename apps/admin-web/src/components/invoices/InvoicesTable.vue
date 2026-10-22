<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { PlusIcon } from '@heroicons/vue/24/outline';
import type { InvoiceStatus } from '@gitiempo/shared';
import { MAX_SEARCH_LENGTH } from '@gitiempo/shared';
import {
  EmptyStateBlock,
  EntryActionButton,
  ManagementTableShell,
  MobileRecordCard,
  SectionHeader,
  type ManagementTableColumn,
} from '@gitiempo/web-shared';
import {
  giTiempoDatePickerPt,
  giTiempoFieldWidthSelectPt,
  giTiempoSelectPt,
} from '@gitiempo/web-config/theme';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DatePicker from 'primevue/datepicker';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import Paginator from 'primevue/paginator';
import Select from 'primevue/select';
import type { PageState } from 'primevue/paginator';

import InvoiceStatusBadge from '@/components/invoices/InvoiceStatusBadge.vue';
import MobileRecordMetadataList from '@/components/MobileRecordMetadataList.vue';
import ManagementDesktopRowSkeleton from '@/components/loading/ManagementDesktopRowSkeleton.vue';
import ManagementMobileCardSkeleton from '@/components/loading/ManagementMobileCardSkeleton.vue';
import {
  adminTableBodyRowClass,
  adminTableClass,
  adminTableColumnPt,
  adminTableHeaderClass,
  adminTableMinWidthClass,
} from '@/lib/admin-table-classes';
import { formatCurrency } from '@/lib/format-currency';
import {
  formatInvoicePeriod,
  fromInvoicesDatePickerRange,
  toInvoicesDatePickerRange,
  type InvoicesDatePickerRangeValue,
  type InvoicesTableFilterOptions,
  type InvoicesTableFilterUpdate,
  type InvoicesTableFilters,
  type InvoicesTableRow,
} from '@/lib/invoices-table';

/**
 * Presentational invoice list table. Renders the header search/action bar,
 * the filter row, and desktop/mobile row markup, then emits typed intents —
 * filter updates, page changes, create-invoice, and row-opening. Fetching,
 * filter state ownership, toasts, and navigation stay with the parent view.
 */

const props = defineProps<{
  emptyDescription: string;
  filterOptions: InvoicesTableFilterOptions;
  filters: InvoicesTableFilters;
  isMobileViewport: boolean;
  loading: boolean;
  page: number;
  rows: InvoicesTableRow[];
  rowsPerPage: number;
  totalRecords: number;
}>();

const emit = defineEmits<{
  'create-invoice': [];
  'row-click': [invoiceId: string];
  'update:filters': [filters: InvoicesTableFilterUpdate];
  'update:page': [page: number];
}>();

const columns: ManagementTableColumn[] = [
  { key: 'title', label: 'Title', width: 'fill' },
  { key: 'project', label: 'Project', width: 200 },
  { key: 'period', label: 'Period', width: 200 },
  { key: 'hours', label: 'Hours', width: 100 },
  { align: 'end', key: 'amount', label: 'Amount', width: 120 },
  { key: 'status', label: 'Status', width: 160 },
];

// Local mirror of the period picker value. PrimeVue DatePicker with
// selectionMode="range" emits [start, null] after the first click; keeping that
// partial selection local prevents the parent filter from clearing (which
// would reset the picker via the computed model-value and lose the start).
// The filter is emitted only once the range is complete or explicitly cleared.
const localDateRange = ref<InvoicesDatePickerRangeValue>(
  toInvoicesDatePickerRange(props.filters.dateFrom, props.filters.dateTo),
);

// Sync from the parent when the filter changes externally (e.g., a reset).
// A partial local selection has no corresponding filter yet, so the parent's
// dateFrom/dateTo are still null — this watcher only fires on actual external
// changes, not on partial selections we kept local.
watch(
  () => [props.filters.dateFrom, props.filters.dateTo] as const,
  ([dateFrom, dateTo]) => {
    localDateRange.value = toInvoicesDatePickerRange(dateFrom, dateTo);
  },
);

const paginatorProps = computed(() => ({
  currentPageReportTemplate:
    'Showing {first} to {last} of {totalRecords} invoices',
  first: (props.page - 1) * props.rowsPerPage,
  rows: props.rowsPerPage,
  template: 'PrevPageLink PageLinks NextPageLink CurrentPageReport',
  totalRecords: props.totalRecords,
}));

// Row titles keep the projects/members table link-button idiom; the 15px
// variant matches the larger type used on mobile cards.
const desktopTitleRootClass =
  'flex w-full items-center justify-start rounded-none border-0 bg-transparent p-0 text-left text-[14px] leading-none font-semibold shadow-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';
const mobileTitleRootClass =
  'flex w-full items-center justify-start rounded-none border-0 bg-transparent p-0 text-left text-[15px] leading-none font-semibold shadow-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

function updateFilters(filters: InvoicesTableFilterUpdate): void {
  emit('update:filters', filters);
}

function updateSearchFilter(value: string | undefined): void {
  updateFilters({ search: value });
}

function updateProjectFilter(value: string | null | undefined): void {
  updateFilters({ projectId: value ?? null });
}

function updateStatusFilter(value: InvoiceStatus | null | undefined): void {
  updateFilters({ status: value ?? null });
}

function isPartialDateRange(
  value: Date | InvoicesDatePickerRangeValue | undefined,
): boolean {
  if (value === null || value === undefined || value instanceof Date) {
    return false;
  }
  const [start, end] = value;
  return Boolean(start) && !end;
}

function updatePeriodFilter(
  value: Date | InvoicesDatePickerRangeValue | undefined,
): void {
  // Always mirror the picker value locally so partial selections survive.
  localDateRange.value =
    value === null || value === undefined || value instanceof Date
      ? null
      : value;

  // A partial [start, null] selection stays local until the user picks the
  // end date; only complete ranges and explicit clears propagate to the filter.
  if (isPartialDateRange(value)) return;

  updateFilters(fromInvoicesDatePickerRange(value));
}

function updatePage(event: PageState): void {
  emit('update:page', event.page + 1);
}

function getProjectName(row: InvoicesTableRow): string {
  return row.project?.name ?? 'Workspace-wide';
}

const selectedProjectName = computed(() => {
  const projectId = props.filters.projectId;
  if (!projectId) return undefined;
  return props.filterOptions.projects.find((p) => p.id === projectId)
    ?.name;
});

const selectedPeriodLabel = computed(() => {
  const { dateFrom, dateTo } = props.filters;
  if (!dateFrom || !dateTo) return undefined;
  return formatInvoicePeriod(dateFrom, dateTo);
});

function getMobileMetadataItems(row: InvoicesTableRow): Array<{
  label: string;
  value: string;
}> {
  return [
    { label: 'Project', value: getProjectName(row) },
    { label: 'Period', value: formatInvoicePeriod(row.dateFrom, row.dateTo) },
    { label: 'Hours', value: `${row.totalHours}h` },
    {
      label: 'Amount',
      value: formatCurrency(row.totalAmount, row.currency),
    },
  ];
}
</script>

<template>
  <div class="mb-4">
    <SectionHeader title="Invoice List">
      <template #actions>
        <div class="flex w-full items-center gap-3 sm:w-auto">
          <IconField class="w-full sm:w-[280px]">
            <InputIcon class="pi pi-search text-text-muted" />
            <InputText
              :model-value="filters.search"
              aria-label="Search invoices"
              class="h-[38px] w-full rounded-[6px] text-[14px]"
              data-testid="invoices-table-search"
              :maxlength="MAX_SEARCH_LENGTH"
              placeholder="Search invoices"
              @update:model-value="updateSearchFilter"
            />
          </IconField>
          <EntryActionButton
            data-testid="invoices-table-create"
            :icon="PlusIcon"
            label="Create invoice"
            @click="emit('create-invoice')"
          />
        </div>
      </template>
    </SectionHeader>
  </div>

  <div
    v-if="isMobileViewport"
    class="mb-4 grid grid-cols-1 gap-3"
  >
    <div class="flex min-w-0 flex-col gap-1.5">
      <label
        for="mobile-invoice-project-filter"
        class="text-text-muted text-[12px] font-medium"
      >Project</label>
      <Select
        id="mobile-invoice-project-filter"
        :model-value="filters.projectId"
        :options="filterOptions.projects"
        option-label="name"
        option-value="id"
        placeholder="All projects"
        show-clear
        :pt="giTiempoSelectPt"
        aria-label="Filter invoices by project"
        data-testid="invoices-table-project-filter"
        :title="selectedProjectName"
        @update:model-value="updateProjectFilter"
      />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="flex min-w-0 flex-col gap-1.5">
        <label
          for="mobile-invoice-period-filter"
          class="text-text-muted text-[12px] font-medium"
        >Period</label>
        <DatePicker
          input-id="mobile-invoice-period-filter"
          :model-value="localDateRange"
          aria-label="Filter invoices by period"
          class="w-full"
          date-format="M d"
          data-testid="invoices-table-period-filter"
          icon-display="input"
          :manual-input="false"
          placeholder="Date range"
          :pt="giTiempoDatePickerPt"
          selection-mode="range"
          show-clear
          show-icon
          :title="selectedPeriodLabel"
          @update:model-value="updatePeriodFilter"
        />
      </div>

      <div class="flex min-w-0 flex-col gap-1.5">
        <label
          for="mobile-invoice-status-filter"
          class="text-text-muted text-[12px] font-medium"
        >Status</label>
        <Select
          id="mobile-invoice-status-filter"
          :model-value="filters.status"
          :options="filterOptions.statuses"
          option-label="label"
          option-value="value"
          placeholder="All statuses"
          show-clear
          :pt="giTiempoFieldWidthSelectPt"
          aria-label="Filter invoices by status"
          data-testid="invoices-table-status-filter"
          @update:model-value="updateStatusFilter"
        />
      </div>
    </div>
  </div>

  <div
    v-if="isMobileViewport"
    class="flex flex-col gap-3"
  >
    <template v-if="loading && rows.length === 0">
      <ManagementMobileCardSkeleton
        v-for="index in 3"
        :key="index"
        data-testid="invoices-mobile-loading-card"
        variant="invoices"
        :index="index"
      />
    </template>

    <template v-else-if="rows.length > 0">
      <MobileRecordCard
        v-for="row in rows"
        :key="row.id"
        data-testid="invoice-mobile-card"
      >
        <div class="flex items-start justify-between gap-3">
          <h3 class="min-w-0">
            <Button
              type="button"
              variant="link"
              :aria-label="`Open invoice ${row.title}`"
              :data-testid="`invoice-mobile-title-${row.id}`"
              :pt="{ root: { class: mobileTitleRootClass } }"
              @click="emit('row-click', row.id)"
            >
              <span class="truncate">{{ row.title }}</span>
            </Button>
          </h3>
          <InvoiceStatusBadge :status="row.status" />
        </div>

        <MobileRecordMetadataList :items="getMobileMetadataItems(row)" />
      </MobileRecordCard>
    </template>

    <EmptyStateBlock
      v-else
      title="No invoices found"
      :description="emptyDescription"
    />

    <Paginator
      v-if="rows.length > 0"
      class="w-full"
      data-testid="invoices-table-paginator"
      v-bind="paginatorProps"
      @page="updatePage"
    />
  </div>

  <div
    v-else
    class="border-divider overflow-x-auto rounded-[6px] border"
  >
    <ManagementTableShell
      :columns="columns"
      :value="rows"
      :loading="false"
      data-key="id"
      :body-row-class="adminTableBodyRowClass"
      :header-class="adminTableHeaderClass"
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
          <div class="min-w-0 flex-1 px-3" />

          <div class="w-[200px] pr-3">
            <Select
              :model-value="filters.projectId"
              :options="filterOptions.projects"
              option-label="name"
              option-value="id"
              placeholder="All projects"
              show-clear
              :pt="giTiempoSelectPt"
              aria-label="Filter invoices by project"
              data-testid="invoices-table-project-filter"
              :title="selectedProjectName"
              @update:model-value="updateProjectFilter"
            />
          </div>

          <div class="w-[200px] pr-3">
            <DatePicker
              :model-value="localDateRange"
              aria-label="Filter invoices by period"
              class="w-full"
              date-format="M d"
              data-testid="invoices-table-period-filter"
              icon-display="input"
              :manual-input="false"
              placeholder="Date range"
              :pt="giTiempoDatePickerPt"
              selection-mode="range"
              show-clear
              show-icon
              :title="selectedPeriodLabel"
              @update:model-value="updatePeriodFilter"
            />
          </div>

          <div class="w-[100px] pr-3" />

          <div class="w-[120px] pr-3" />

          <div class="w-[160px] pr-3">
            <Select
              :model-value="filters.status"
              :options="filterOptions.statuses"
              option-label="label"
              option-value="value"
              placeholder="All statuses"
              show-clear
              :pt="giTiempoFieldWidthSelectPt"
              aria-label="Filter invoices by status"
              data-testid="invoices-table-status-filter"
              @update:model-value="updateStatusFilter"
            />
          </div>
        </div>
      </template>

      <Column :pt="adminTableColumnPt">
        <template #body="{ data }">
          <Button
            type="button"
            variant="link"
            :aria-label="`Open invoice ${data.title}`"
            :data-testid="`invoice-title-${data.id}`"
            :pt="{ root: { class: desktopTitleRootClass } }"
            @click="emit('row-click', data.id)"
          >
            <span class="truncate">{{ data.title }}</span>
          </Button>
        </template>
      </Column>

      <Column
        style="width: 200px"
        :pt="adminTableColumnPt"
      >
        <template #body="{ data }">
          <span
            class="text-text-muted block truncate text-[13px] font-normal"
            :title="getProjectName(data)"
          >{{
            getProjectName(data)
          }}</span>
        </template>
      </Column>

      <Column
        style="width: 200px"
        :pt="adminTableColumnPt"
      >
        <template #body="{ data }">
          <span
            class="text-text-muted block truncate text-[13px] font-normal"
            :title="formatInvoicePeriod(data.dateFrom, data.dateTo)"
          >{{
            formatInvoicePeriod(data.dateFrom, data.dateTo)
          }}</span>
        </template>
      </Column>

      <Column
        style="width: 100px"
        :pt="adminTableColumnPt"
      >
        <template #body="{ data }">
          <span class="text-text-muted text-[13px] font-normal">{{
            data.totalHours
          }}h</span>
        </template>
      </Column>

      <Column
        style="width: 120px"
        :pt="adminTableColumnPt"
      >
        <template #body="{ data }">
          <span class="text-text-dark block text-right text-[13px] font-semibold">{{
            formatCurrency(data.totalAmount, data.currency)
          }}</span>
        </template>
      </Column>

      <Column
        style="width: 160px"
        :pt="adminTableColumnPt"
      >
        <template #body="{ data }">
          <InvoiceStatusBadge :status="data.status" />
        </template>
      </Column>

      <template #empty>
        <template v-if="loading">
          <ManagementDesktopRowSkeleton
            v-for="index in 6"
            :key="index"
            data-testid="invoices-desktop-loading-row"
            variant="invoices"
          />
        </template>

        <EmptyStateBlock
          v-else
          title="No invoices found"
          :description="emptyDescription"
        />
      </template>
    </ManagementTableShell>

    <div
      v-if="rows.length > 0"
      class="border-divider bg-surface-primary border-t"
      :class="adminTableMinWidthClass"
    >
      <Paginator
        class="w-full"
        data-testid="invoices-table-paginator"
        v-bind="paginatorProps"
        @page="updatePage"
      />
    </div>
  </div>
</template>