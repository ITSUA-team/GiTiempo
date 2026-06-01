<script setup lang="ts">
import {
  EmptyStateBlock,
  ManagementTableShell,
  MobileRecordCard,
  SectionHeader,
  managementTableColumnPt,
  managementTableFilterSelectPt,
  useIsMobileViewport,
  type ManagementTableColumn,
} from '@gitiempo/web-shared';
import { formatPaddedHoursMinutesDuration } from '@gitiempo/web-shared/time';
import Column from 'primevue/column';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
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

defineProps<{
  loading: boolean;
  memberOptions: ReportFilterOption[];
  projectOptions: ReportFilterOption[];
  rows: ReportTableRow[];
}>();

const filters = defineModel<ReportTableFilters>('filters', { required: true });
const isMobileViewport = useIsMobileViewport();

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

</script>

<template>
  <div>
    <div class="mb-4">
      <SectionHeader title="Results">
        <template #actions>
          <IconField class="w-full sm:w-[280px]">
            <InputIcon class="pi pi-search text-text-muted" />
            <InputText
              v-model="filters.global"
              aria-label="Search report rows"
              class="h-[38px] w-full rounded-[6px] text-[14px]"
              placeholder="Search report rows"
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
          <Select
            id="mobile-report-project-filter"
            v-model="filters.projectId"
            :options="projectOptions"
            option-label="label"
            option-value="value"
            placeholder="All projects"
            show-clear
            :pt="managementTableFilterSelectPt"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label
            for="mobile-report-member-filter"
            class="text-text-muted text-[12px] font-medium"
          >Member</label>
          <Select
            id="mobile-report-member-filter"
            v-model="filters.memberId"
            :options="memberOptions"
            option-label="label"
            option-value="value"
            placeholder="All members"
            show-clear
            :pt="managementTableFilterSelectPt"
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
            <Select
              v-model="filters.projectId"
              :options="projectOptions"
              aria-label="Filter report rows by project"
              option-label="label"
              option-value="value"
              placeholder="All projects"
              show-clear
              :pt="managementTableFilterSelectPt"
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
              :pt="managementTableFilterSelectPt"
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
