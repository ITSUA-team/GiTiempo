<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { PlusIcon } from '@heroicons/vue/24/outline';
import type { InvoiceStatus } from '@gitiempo/shared';
import { MAX_SEARCH_LENGTH } from '@gitiempo/shared';
import {
  DatePickerButtonBar,
  EmptyStateBlock,
  EntryActionButton,
  MobileRecordCard,
  useDatePickerConfirmCancel,
} from '@gitiempo/web-shared';
import {
  giTiempoDatePickerPt,
  giTiempoFieldWidthSelectPt,
  giTiempoSelectPt,
} from '@gitiempo/web-config/theme';
import Button from 'primevue/button';
import Column from 'primevue/column';
import Checkbox from 'primevue/checkbox';
import DatePicker from 'primevue/datepicker';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import Paginator from 'primevue/paginator';
import Select from 'primevue/select';
import type { PageState } from 'primevue/paginator';

import InvoiceStatusBadge from '@/components/invoices/InvoiceStatusBadge.vue';
import DataTable from 'primevue/datatable';
import InvoiceListLoading from './InvoiceListLoading.vue';
import InvoiceListRowActions from './InvoiceListRowActions.vue';
import { formatCurrency, formatInvoiceAmount } from '@/lib/format-currency';
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
  groupName?: string;
  personalGroup?: boolean;
  emptyPersonalGroup?: boolean;
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
  'browse-all': [];
  'move-row': [invoiceId: string];
  'row-click': [invoiceId: string];
  'update:filters': [filters: InvoicesTableFilterUpdate];
  'update:page': [page: number];
}>();

const selection = defineModel<string[]>('selection', {default:()=>[]});

const allSelected = computed(() => props.rows.length > 0 && props.rows.every(row => selection.value.includes(row.id)));
const partlySelected = computed(() => !allSelected.value && props.rows.some(row => selection.value.includes(row.id)));
function selectPage(checked: boolean) {
  const selected = new Set(selection.value);
  for (const row of props.rows) {
    if (checked) selected.add(row.id);
    else selected.delete(row.id);
  }
  selection.value = [...selected];
}
const columnPt = {
  headerCell: { class: 'h-[42px] bg-app-bg px-2 py-0 text-left text-[13px] font-semibold' },
  bodyCell: { class: 'h-[66px] border-b border-divider px-2 text-[13px]' },
};
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

const periodPicker =
  useDatePickerConfirmCancel<InvoicesDatePickerRangeValue>();


const paginatorProps = computed(() => ({
  currentPageReportTemplate:
    'Showing {first}–{last} of {totalRecords}',
  first: (props.page - 1) * props.rowsPerPage,
  pageLinkSize: props.isMobileViewport ? 1 : 5,
  rows: props.rowsPerPage,
  template: props.isMobileViewport
    ? 'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink'
    : props.totalRecords <= props.rowsPerPage ? 'CurrentPageReport PageLinks' : 'CurrentPageReport PrevPageLink PageLinks NextPageLink',
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

</script>

<template>
  <div class="mb-3 flex min-h-[38px] items-center gap-3 sm:mb-4">
    <h2
      v-if="!isMobileViewport"
      class="min-w-0 flex-1 truncate text-lg font-semibold"
    >
      {{ groupName ?? 'All invoices' }}
    </h2>
    <IconField class="min-w-0 flex-1 sm:max-w-[220px]">
      <InputIcon class="pi pi-search text-text-muted" />
      <InputText
        :model-value="filters.search"
        aria-label="Search invoices"
        class="h-[38px] w-full"
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

  <div class="mb-3 grid min-w-0 grid-cols-1 gap-3 sm:mb-4 sm:grid-cols-3 sm:gap-2.5">
    <div class="flex min-w-0 flex-col gap-1.5">
      <label
        for="invoice-project-filter"
        class="text-text-dark text-[13px] font-medium sm:sr-only"
      >Project</label>
      <Select
        id="invoice-project-filter"
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

    <div class="flex min-w-0 flex-col gap-1.5">
      <label
        for="invoice-period-filter"
        class="text-text-dark text-[13px] font-medium sm:sr-only"
      >Period</label>
      <DatePicker
        :ref="periodPicker.datePickerRef"
        input-id="invoice-period-filter"
        :model-value="localDateRange"
        aria-label="Filter invoices by period"
        date-format="M d"
        data-testid="invoices-table-period-filter"
        icon-display="input"
        :manual-input="false"
        placeholder="Date range"
        :pt="giTiempoDatePickerPt"
        selection-mode="range"
        show-button-bar
        show-clear
        show-icon
        :title="selectedPeriodLabel"
        @show="periodPicker.handleShow"
        @update:model-value="updatePeriodFilter"
      >
        <template #buttonbar>
          <DatePickerButtonBar
            @cancel="periodPicker.handleCancel"
            @confirm="periodPicker.handleConfirm"
          />
        </template>
      </DatePicker>
    </div>

    <div class="flex min-w-0 flex-col gap-1.5">
      <label
        for="invoice-status-filter"
        class="text-text-dark text-[13px] font-medium sm:sr-only"
      >Status</label>
      <Select
        id="invoice-status-filter"
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

  <slot name="bulk-actions" />
  <slot
    v-if="$slots.error"
    name="error"
  />
  <InvoiceListLoading
    v-else-if="loading && !rows.length"
    data-testid="invoices-list-loading"
  />
  <div v-else-if="!rows.length">
    <div
      v-if="emptyPersonalGroup"
      class="border-divider flex flex-col items-center gap-4 rounded-lg border p-5 text-center"
    >
      <i
        class="pi pi-folder-open text-text-muted text-3xl"
        aria-hidden="true"
      />
      <h3 class="text-lg font-semibold">
        No invoices in this group
      </h3>
      <p class="text-text-muted text-sm">
        Move an existing invoice here or create a new one in this group.
      </p>
      <Button
        label="Create invoice"
        icon="pi pi-plus"
        @click="emit('create-invoice')"
      />
      <Button
        label="Browse all invoices"
        icon="pi pi-copy"
        severity="secondary"
        outlined
        @click="emit('browse-all')"
      />
    </div>
    <EmptyStateBlock
      v-else
      title="No invoices found"
      :description="emptyDescription"
    />
  </div>

  <div
    v-else-if="isMobileViewport"
    class="flex flex-col gap-3"
  >
    <MobileRecordCard
      v-for="row in rows"
      :key="row.id"
      data-testid="invoice-mobile-card"
      class="invoice-mobile-card"
    >
      <div class="flex items-center gap-3">
        <Checkbox
          v-model="selection"
          :value="row.id"
          :aria-label="`Select invoice ${row.title}`"
        />
        <h3 class="min-w-0 flex-1">
          <Button
            type="button"
            variant="link"
            :aria-label="`Open invoice ${row.title}`"
            :data-testid="`invoice-mobile-title-${row.id}`"
            :pt="{ root: { class: mobileTitleRootClass } }"
            @click="emit('row-click', row.id)"
          >
            <span class="truncate">{{ row.reference ?? row.title }}</span>
          </Button>
        </h3>
        <InvoiceStatusBadge :status="row.status" />
      </div>
      <p class="text-text-muted text-sm break-words">
        {{ [row.recipient?.name, getProjectName(row)].filter(Boolean).join(' · ') }}
      </p>
      <div class="flex items-center justify-between gap-3 text-xs">
        <span class="text-text-muted">Period</span><span>{{ formatInvoicePeriod(row.dateFrom, row.dateTo) }}</span>
      </div>
      <div class="flex items-center justify-between gap-3 text-sm">
        <span>{{ row.totalHours }}h</span><strong>{{ formatInvoiceAmount(row.totalAmount, row.currency) }}</strong>
      </div>
      <div class="flex justify-end gap-3">
        <Button
          label="Move to group"
          severity="secondary"
          outlined
          icon="pi pi-folder-open"
          @click="emit('move-row', row.id)"
        />
        <InvoiceListRowActions
          mobile
          :reference="row.reference ?? row.title"
          @open="emit('row-click', row.id)"
          @move="emit('move-row', row.id)"
        />
      </div>
    </MobileRecordCard>
  </div>

  <DataTable
    v-else
    :value="rows"
    data-key="id"
    :row-class="(row: InvoicesTableRow) => selection.includes(row.id) ? 'invoice-row-selected' : ''"
    class="border-divider overflow-hidden rounded-sm border"
    :pt="{ tableContainer: 'overflow-x-auto', table: 'w-full min-w-[660px] table-fixed border-collapse', bodyRow: { class: 'invoice-row' } }"
  >
    <Column
      style="width: 34px"
      :pt="columnPt"
    >
      <template #header>
        <Checkbox
          :model-value="allSelected"
          binary
          :indeterminate="partlySelected"
          aria-label="Select all invoices on this page"
          @update:model-value="selectPage"
        />
      </template>
      <template #body="{ data }">
        <Checkbox
          v-model="selection"
          :value="data.id"
          :aria-label="`Select invoice ${data.title}`"
        />
      </template>
    </Column>
    <Column
      header="Invoice / recipient"
      :pt="columnPt"
    >
      <template #body="{data}">
        <Button
          variant="link"
          :aria-label="`Open invoice ${data.title}`"
          :data-testid="`invoice-title-${data.id}`"
          :pt="{ root: { class: desktopTitleRootClass } }"
          @click="emit('row-click', data.id)"
        >
          <span class="flex min-w-0 flex-col gap-1">
            <span class="truncate">{{ data.reference ?? data.title }}</span>
            <span
              v-if="data.recipient?.name"
              class="text-text-muted truncate text-xs font-normal"
            >{{ data.recipient.name }}</span>
          </span>
        </Button>
      </template>
    </Column>
    <Column
      header="Project"
      style="width: 106px"
      :pt="columnPt"
    >
      <template #body="{data}">
        <span
          class="text-text-muted block truncate"
          :title="getProjectName(data)"
        >{{ getProjectName(data) }}</span>
      </template>
    </Column>
    <Column
      header="Period"
      style="width: 134px"
      :pt="columnPt"
    >
      <template #body="{data}">
        <span
          class="text-text-muted block truncate"
          :title="formatInvoicePeriod(data.dateFrom, data.dateTo)"
        >{{ formatInvoicePeriod(data.dateFrom, data.dateTo) }}</span>
      </template>
    </Column>
    <Column
      header="Hours"
      style="width: 58px"
      :pt="columnPt"
    >
      <template #body="{data}">
        {{ data.totalHours }}h
      </template>
    </Column>
    <Column
      header="Amount"
      style="width: 95px"
      :pt="columnPt"
    >
      <template #body="{data}">
        <span class="block text-right font-semibold">{{ formatCurrency(data.totalAmount,data.currency) }}</span>
      </template>
    </Column>
    <Column
      header="Status"
      style="width: 78px"
      :pt="columnPt"
    >
      <template #body="{data}">
        <InvoiceStatusBadge :status="data.status" />
      </template>
    </Column>
    <Column
      style="width: 36px"
      :pt="{ ...columnPt, bodyCell: {class: 'border-b border-divider p-0'} }"
    >
      <template #body="{data}">
        <InvoiceListRowActions
          :reference="data.reference ?? data.title"
          @open="emit('row-click',data.id)"
          @move="emit('move-row',data.id)"
        />
      </template>
    </Column>
  </DataTable>
  <Paginator
    v-if="rows.length && !$slots.error"
    class="mt-3 w-full"
    :pt="{ root: 'flex items-center', content: 'w-full', current: 'mr-auto text-xs text-text-muted', page: 'h-[38px] w-9 min-w-0 rounded-sm aria-[current=page]:bg-brand aria-[current=page]:text-text-inverse' }"
    data-testid="invoices-table-paginator"
    v-bind="paginatorProps"
    @page="updatePage"
  />
  <p
    v-if="personalGroup && !isMobileViewport"
    class="text-text-muted mt-4 text-xs leading-5"
  >
    Personal group · Changes here affect only your organization.
  </p>
</template>

<style scoped>
:deep(.invoice-row.invoice-row-selected) {
  background-color: var(--color-accent-tint);
}
.invoice-mobile-card {
  padding: 12px;
  gap: 10px;
}
</style>
