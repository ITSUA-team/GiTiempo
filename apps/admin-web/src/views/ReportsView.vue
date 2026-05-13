<script setup lang="ts">
import { computed, ref } from 'vue';
import { StatCard, StatsHeader, SurfaceCard } from '@gitiempo/web-shared';
import Button from 'primevue/button';

import ManagementPageSkeleton from '@/components/loading/ManagementPageSkeleton.vue';
import ReportsFilterForm from '@/components/reports/ReportsFilterForm.vue';
import ReportsTable from '@/components/reports/ReportsTable.vue';
import { useToasts } from '@/composables/useToasts';
import {
  createDefaultReportTableFilters,
  downloadReportsCsv,
  filterReportRows,
  formatReportDuration,
  formatReportPercent,
  useReportsData,
} from '@/composables/useReportsData';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const { errorToast, successToast } = useToasts();

const reports = useReportsData({
  accessToken: computed(() => authStore.accessToken),
  onError(message, error, action) {
    errorToast(message, {
      error,
      logContext: { action, feature: 'reports' },
    });
  },
});

const tableFilters = ref(createDefaultReportTableFilters());
const tableRows = computed(() =>
  filterReportRows(reports.rows.value, tableFilters.value),
);

const totalHoursLabel = computed(() =>
  formatReportDuration(reports.summary.value.totalSeconds),
);
const billableShareLabel = computed(() =>
  formatReportPercent(reports.summary.value.billableShare),
);
const avgPerMemberLabel = computed(() =>
  formatReportDuration(reports.summary.value.avgPerMemberSeconds),
);

function handleExport(): void {
  if (tableRows.value.length === 0) {
    return;
  }

  const filename = downloadReportsCsv(tableRows.value);
  successToast(`Exported ${filename}.`);
}
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <template v-if="reports.isInitialLoading.value">
      <ManagementPageSkeleton variant="reports" />
    </template>

    <template v-else-if="reports.loadError.value && !reports.loading.value">
      <SurfaceCard padding-class="p-6">
        <div class="flex flex-col items-center gap-3 py-6 text-center">
          <span class="text-text-dark text-[15px] font-semibold">Failed to load reports</span>
          <span class="text-text-muted text-[13px]">{{ reports.loadError.value }}</span>
          <Button
            label="Try again"
            severity="secondary"
            outlined
            @click="reports.refresh"
          />
        </div>
      </SurfaceCard>
    </template>

    <template v-else>
      <StatsHeader
        title="Reports"
        description="Live project and member reporting within the current PM scope."
      >
        <template #actions>
          <Button
            label="Export CSV"
            :disabled="reports.loading.value || tableRows.length === 0"
            @click="handleExport"
          />
        </template>
        <template #stats>
          <ReportsFilterForm
            v-model:project-id="reports.selectedProjectId.value"
            v-model:member-id="reports.selectedMemberId.value"
            v-model:date-range="reports.dateRange.value"
            v-model:group-by="reports.groupBy.value"
            :project-options="reports.projectOptions.value"
            :member-options="reports.memberOptions.value"
            :disabled="reports.loading.value"
          />
        </template>
      </StatsHeader>

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tracked Hours"
          :value="totalHoursLabel"
        />
        <StatCard
          label="Billable"
          :value="billableShareLabel"
        />
        <StatCard
          label="Avg per Member"
          :value="avgPerMemberLabel"
        />
        <StatCard
          label="Top Project"
          :value="reports.summary.value.topProjectName"
        />
      </div>

      <SurfaceCard padding-class="p-5">
        <ReportsTable
          v-model:filters="tableFilters"
          :rows="tableRows"
          :loading="reports.loading.value"
          :project-options="reports.projectOptions.value"
          :member-options="reports.memberOptions.value"
        />
      </SurfaceCard>
    </template>
  </div>
</template>
