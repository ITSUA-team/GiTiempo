<script setup lang="ts">
import { ManagementTableEmptyState } from '@gitiempo/web-shared';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';

import {
  formatReportDuration,
  type ReportBillableFilter,
  type ReportFilterOption,
  type ReportHoursFilter,
  type ReportRow,
  type ReportTableFilters,
} from '@/composables/useReportsData';

defineProps<{
  loading: boolean;
  memberOptions: ReportFilterOption[];
  projectOptions: ReportFilterOption[];
  rows: ReportRow[];
}>();

const filters = defineModel<ReportTableFilters>('filters', { required: true });

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

const tablePt = {
  root: { class: 'border-none bg-transparent' },
  tableContainer: { class: 'overflow-x-auto rounded-[6px] border border-divider' },
  table: { class: 'w-full min-w-[760px] border-collapse' },
  headerRow: { class: 'bg-app-bg' },
  headerCell: {
    class:
      'border-0 bg-app-bg px-3 py-0 text-[13px] font-semibold text-text-dark',
  },
  bodyRow: { class: 'h-12 border-t border-divider hover:bg-app-bg' },
  bodyCell: { class: 'border-0 px-3 py-0 align-middle' },
  columnFilterRow: { class: 'border-t border-divider' },
  columnFilterCell: { class: 'border-0 bg-surface px-3 py-2' },
  emptyMessageCell: { class: 'border-0 border-t border-divider p-0' },
} as const;

const filterSelectPt = {
  root: { class: 'h-[34px] w-full rounded-[6px] text-[12px]' },
  label: { class: 'flex items-center py-0 text-[12px] font-normal' },
} as const;
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 class="text-text-dark text-lg font-semibold">
        Results
      </h2>
      <IconField class="w-full sm:w-[280px]">
        <InputIcon class="pi pi-search text-text-muted" />
        <InputText
          v-model="filters.global"
          aria-label="Search report rows"
          class="h-[38px] w-full rounded-[6px] text-[14px]"
          placeholder="Search report rows"
        />
      </IconField>
    </div>

    <DataTable
      :value="rows"
      :loading="loading"
      data-key="id"
      filter-display="row"
      removable-sort
      :pt="tablePt"
    >
      <Column
        field="projectName"
        header="Project"
        sortable
      >
        <template #body="{ data }">
          <span class="text-text-dark text-[14px] font-medium">{{ data.projectName }}</span>
        </template>
        <template #filter>
          <Select
            v-model="filters.projectId"
            :options="projectOptions"
            option-label="label"
            option-value="value"
            placeholder="All projects"
            show-clear
            :pt="filterSelectPt"
          />
        </template>
      </Column>

      <Column
        field="memberName"
        header="Member"
        sortable
        style="width: 180px"
      >
        <template #body="{ data }">
          <span class="text-text-muted text-[13px] font-normal">{{ data.memberName }}</span>
        </template>
        <template #filter>
          <Select
            v-model="filters.memberId"
            :options="memberOptions"
            option-label="label"
            option-value="value"
            placeholder="All members"
            show-clear
            :pt="filterSelectPt"
          />
        </template>
      </Column>

      <Column
        field="totalSeconds"
        header="Hours"
        sortable
        style="width: 140px"
      >
        <template #body="{ data }">
          <div class="text-right">
            <span class="text-text-dark text-[13px] font-semibold">{{ formatReportDuration(data.totalSeconds) }}</span>
          </div>
        </template>
        <template #filter>
          <Select
            v-model="filters.hours"
            :options="hoursFilterOptions"
            option-label="label"
            option-value="value"
            :pt="filterSelectPt"
          />
        </template>
      </Column>

      <Column
        field="billableSeconds"
        header="Billable"
        sortable
        style="width: 140px"
      >
        <template #body="{ data }">
          <div class="text-right">
            <span class="text-text-dark text-[13px] font-semibold">{{ formatReportDuration(data.billableSeconds) }}</span>
          </div>
        </template>
        <template #filter>
          <Select
            v-model="filters.billable"
            :options="billableFilterOptions"
            option-label="label"
            option-value="value"
            :pt="filterSelectPt"
          />
        </template>
      </Column>

      <template #empty>
        <ManagementTableEmptyState
          title="No report rows found"
          description="No matching report rows are available for the current filters."
        />
      </template>
    </DataTable>
  </div>
</template>
