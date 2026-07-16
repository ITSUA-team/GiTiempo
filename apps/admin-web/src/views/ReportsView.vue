<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue';
import type { TimeReportGroupBy } from '@gitiempo/shared';
import { StatCard, SurfaceCard } from '@gitiempo/web-shared';
import { formatPaddedHoursMinutesDuration } from '@gitiempo/web-shared/time';
import Button from 'primevue/button';

import ManagementPageSkeleton from '@/components/loading/ManagementPageSkeleton.vue';
import RequestErrorCard from '@/components/RequestErrorCard.vue';
import ReportsFilterForm from '@/components/reports/ReportsFilterForm.vue';
import ReportsTable from '@/components/reports/ReportsTable.vue';
import { useToasts } from '@/composables/feedback/useToasts';
import { useReportsData } from '@/composables/reports/useReportsData';
import { downloadReportExport } from '@/lib/report-download';
import {
  createDefaultReportTableFilters,
  filterReportRows,
  formatReportPercent,
  getReportDateRangeError,
  type ReportDateRange,
} from '@/lib/report-view-model';
import { getAdminServerStateScope } from '@/lib/server-state-scope';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const { errorToast, successToast } = useToasts();
const isAuthenticated = computed(() => Boolean(authStore.accessToken));
const scope = computed(() => getAdminServerStateScope(authStore.accessToken));

const {
  dateRange,
  exportCurrentReport,
  groupBy,
  isInitialLoading,
  loadError,
  loading,
  memberOptions,
  projectOptions,
  refresh,
  rows,
  selectedMemberId,
  selectedProjectId,
  summary,
} = useReportsData({
  enabled: isAuthenticated,
  onError(message, error, action) {
    errorToast(message, {
      error,
      logContext: { action, feature: 'reports' },
    });
  },
  scope,
});

const tableFilters = ref(createDefaultReportTableFilters());
const reportProjectId = ref<string | null>(selectedProjectId.value);
const reportMemberId = ref<string | null>(selectedMemberId.value);
const reportDateRange = shallowRef<ReportDateRange>(dateRange.value);
const reportGroupBy = ref<TimeReportGroupBy>(groupBy.value);
const exporting = ref(false);
const tableRows = computed(() =>
  filterReportRows(rows.value, tableFilters.value),
);
const reportDateRangeError = computed(() =>
  getReportDateRangeError(reportDateRange.value),
);
const exportDisabled = computed(
  () => loading.value || exporting.value || reportDateRangeError.value !== null,
);

const totalHoursLabel = computed(() =>
  formatPaddedHoursMinutesDuration(summary.value.totalSeconds),
);
const billableShareLabel = computed(() =>
  formatReportPercent(summary.value.billableShare),
);
const avgPerMemberLabel = computed(() =>
  formatPaddedHoursMinutesDuration(summary.value.avgPerMemberSeconds),
);
const trackedHoursDescription = computed(() => {
  const count = summary.value.memberCount;
  return `Across ${count} ${count === 1 ? 'member' : 'members'}`;
});
const topProjectDescription = computed(() => {
  const seconds = summary.value.topProjectSeconds;

  if (seconds <= 0) {
    return 'No tracked time';
  }

  return `${formatPaddedHoursMinutesDuration(seconds)} tracked this period`;
});

async function handleExport(): Promise<void> {
  if (exporting.value || reportDateRangeError.value) {
    return;
  }

  exporting.value = true;

  try {
    const exportResult = await exportCurrentReport({
      dateRange: reportDateRange.value,
      groupBy: reportGroupBy.value,
      memberId: reportMemberId.value,
      projectId: reportProjectId.value,
    });

    if (!exportResult) {
      return;
    }

    const filename = downloadReportExport(exportResult);
    successToast(`Exported ${filename}.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export reports';
    errorToast(message, {
      error,
      logContext: { action: 'export-reports', feature: 'reports' },
    });
  } finally {
    exporting.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <template v-if="isInitialLoading">
      <ManagementPageSkeleton variant="reports" />
    </template>

    <template v-else-if="loadError && !loading">
      <RequestErrorCard
        title="Failed to load reports"
        :message="loadError"
        @retry="refresh"
      />
    </template>

    <template v-else>
      <ReportsFilterForm
        v-model:project-id="reportProjectId"
        v-model:member-id="reportMemberId"
        v-model:date-range="reportDateRange"
        v-model:group-by="reportGroupBy"
        :project-options="projectOptions"
        :member-options="memberOptions"
        :disabled="loading"
      >
        <template #actions>
          <Button
            label="Export CSV"
            data-testid="export-reports-csv"
            class="h-[38px] w-full lg:w-auto"
            :disabled="exportDisabled"
            :loading="exporting"
            @click="handleExport"
          />
        </template>
      </ReportsFilterForm>

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tracked Hours"
          :value="totalHoursLabel"
          :description="trackedHoursDescription"
        />
        <StatCard
          label="Billable"
          :value="billableShareLabel"
          description="Within PM scope"
        />
        <StatCard
          label="Avg per Member"
          :value="avgPerMemberLabel"
          description="Weekly average"
        />
        <StatCard
          label="Top Project"
          :value="summary.topProjectName"
          :description="topProjectDescription"
        />
      </div>

      <SurfaceCard padding-class="p-6">
        <ReportsTable
          v-model:filters="tableFilters"
          :rows="tableRows"
          :loading="loading"
          :project-options="projectOptions"
          :member-options="memberOptions"
        />
      </SurfaceCard>
    </template>
  </div>
</template>
