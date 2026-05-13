<script setup lang="ts">
import {
  ManagementTableEmptyState,
  ManagementTableShell,
  managementTableColumnPt,
  type ManagementTableColumn,
} from '@gitiempo/web-shared';
import Column from 'primevue/column';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';

import {
  formatReportDuration,
  getReportRowHoursSeconds,
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

const filterSelectPt = {
  root: { class: 'h-[34px] w-full rounded-[6px] text-[12px]' },
  label: { class: 'flex items-center py-0 text-[12px] font-normal' },
} as const;
</script>

<template>
  <div>
    <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

    <ManagementTableShell
      :columns="columns"
      :value="rows"
      :loading="loading"
      data-key="id"
    >
      <template #filters>
        <div class="min-w-0 flex-1 px-3">
          <Select
            v-model="filters.projectId"
            :options="projectOptions"
            aria-label="Filter report rows by project"
            option-label="label"
            option-value="value"
            placeholder="All projects"
            show-clear
            :pt="filterSelectPt"
          />
        </div>

        <div class="w-[180px] px-3">
          <Select
            v-model="filters.memberId"
            :options="memberOptions"
            aria-label="Filter report rows by member"
            option-label="label"
            option-value="value"
            placeholder="All members"
            show-clear
            :pt="filterSelectPt"
          />
        </div>

        <div class="w-[140px] px-3 text-right">
          <Select
            v-model="filters.hours"
            :options="hoursFilterOptions"
            aria-label="Filter report rows by hours"
            option-label="label"
            option-value="value"
            :pt="filterSelectPt"
          />
        </div>

        <div class="w-[140px] px-3 text-right">
          <Select
            v-model="filters.billable"
            :options="billableFilterOptions"
            aria-label="Filter report rows by billable hours"
            option-label="label"
            option-value="value"
            :pt="filterSelectPt"
          />
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
            <span class="text-text-dark text-[13px] font-semibold">{{ formatReportDuration(getReportRowHoursSeconds(data, filters.billable)) }}</span>
          </div>
        </template>
      </Column>

      <Column
        style="width: 140px"
        :pt="managementTableColumnPt"
      >
        <template #body="{ data }">
          <div class="text-right">
            <span class="text-text-dark text-[13px] font-semibold">{{ formatReportDuration(data.billableSeconds) }}</span>
          </div>
        </template>
      </Column>

      <template #empty>
        <ManagementTableEmptyState
          title="No report rows found"
          description="No matching report rows are available for the current filters."
        />
      </template>
    </ManagementTableShell>
  </div>
</template>
