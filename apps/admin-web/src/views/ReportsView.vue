<script setup lang="ts">
import { computed, ref } from 'vue';
import type { TimeReportExportFormat } from '@gitiempo/shared';
import { StatCard, SurfaceCard } from '@gitiempo/web-shared';
import { formatPaddedHoursMinutesDuration } from '@gitiempo/web-shared/time';
import Button from 'primevue/button';
import Menu from 'primevue/menu';

import ManagementPageSkeleton from '@/components/loading/ManagementPageSkeleton.vue';
import RequestErrorCard from '@/components/RequestErrorCard.vue';
import ReportsTable from '@/components/reports/ReportsTable.vue';
import { useToasts } from '@/composables/feedback/useToasts';
import { useReportsData } from '@/composables/reports/useReportsData';
import { downloadReportExport } from '@/lib/report-download';
import {
  buildReportTree,
  createDefaultReportTableFilters,
  filterReportRows,
  filterReportTreeGroups,
  flattenReportTree,
  formatReportPercent,
  getReportDateRangeError,
  sumReportTreeTotals,
} from '@/lib/report-view-model';
import { buildReportCsv } from '@/lib/report-csv';
import { buildReportPdfDocument } from '@/lib/report-pdf-document';
import { getAdminServerStateScope } from '@/lib/server-state-scope';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const { errorToast, successToast } = useToasts();
const isAuthenticated = computed(() => Boolean(authStore.accessToken));
const scope = computed(() => getAdminServerStateScope(authStore.accessToken));

const {
  dateRange,
  exportReportPdf,
  grouping,
  isInitialLoading,
  loadError,
  loading,
  memberOptions,
  projectOptions,
  refresh,
  rows,
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
const exporting = ref(false);
const tableRows = computed(() =>
  filterReportRows(rows.value, tableFilters.value),
);
const reportDateRangeError = computed(() =>
  getReportDateRangeError(dateRange.value),
);
// The export is generated from the on-screen tree (CSV client-side, PDF as a
// document the server only styles), so every filter and grouping is reflected
// and there is nothing to block — the file always matches the screen.
const exportDisabled = computed(
  () => loading.value || exporting.value || reportDateRangeError.value !== null,
);

const selectedProjectLabel = computed(
  () =>
    projectOptions.value.find(
      (option) => option.value === tableFilters.value.projectId,
    )?.label ?? null,
);
const selectedMemberLabel = computed(
  () =>
    memberOptions.value.find(
      (option) => option.value === tableFilters.value.memberId,
    )?.label ?? null,
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

const exportMenuRef = ref<InstanceType<typeof Menu> | null>(null);
const exportMenuItems = [
  {
    command: () => void handleExport('csv'),
    icon: 'pi pi-file',
    iconClass: 'text-text-muted',
    label: 'Export as CSV',
  },
  {
    command: () => void handleExport('pdf'),
    icon: 'pi pi-file-pdf',
    iconClass: 'text-brand',
    label: 'Export as PDF',
    subtitle: 'Styled summary & totals',
  },
];

function toggleExportMenu(event: Event): void {
  exportMenuRef.value?.toggle(event);
}

function reportExportFilename(format: TimeReportExportFormat): string {
  const [start, end] = dateRange.value ?? [];
  const range =
    start && end
      ? `-${start.toLocaleDateString('en-CA')}_${end.toLocaleDateString('en-CA')}`
      : '';

  return `time-report${range}.${format}`;
}

async function handleExport(format: TimeReportExportFormat): Promise<void> {
  if (exporting.value || reportDateRangeError.value !== null) {
    return;
  }

  exporting.value = true;

  try {
    // Mirror the screen: the same filtered, grouped tree, always fully expanded
    // (collapse is a transient view state, not part of the report).
    const tree = filterReportTreeGroups(
      buildReportTree(tableRows.value, grouping.value),
      tableFilters.value,
    );
    const displayRows = flattenReportTree(tree, new Set<string>());
    const totals = sumReportTreeTotals(tree);
    const filename = reportExportFilename(format);

    let blob: Blob | null;
    if (format === 'csv') {
      blob = new Blob([buildReportCsv(displayRows, totals)], {
        type: 'text/csv;charset=utf-8',
      });
    } else {
      blob = await exportReportPdf(
        buildReportPdfDocument({
          dateRange: dateRange.value,
          grouping: grouping.value,
          memberLabel: selectedMemberLabel.value,
          now: new Date(),
          projectLabel: selectedProjectLabel.value,
          rows: displayRows,
          totals,
          workspaceName: authStore.workspaceName || 'Workspace',
        }),
      );
    }

    if (!blob) {
      return;
    }

    downloadReportExport({ blob, filename });
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
          v-model:date-range="dateRange"
          v-model:grouping="grouping"
          :rows="tableRows"
          :loading="loading"
          :project-options="projectOptions"
          :member-options="memberOptions"
        >
          <template #actions>
            <Button
              data-testid="export-reports"
              class="h-[38px] w-full sm:w-auto"
              aria-label="Export report"
              aria-haspopup="true"
              aria-controls="report-export-menu"
              :disabled="exportDisabled"
              @click="toggleExportMenu"
            >
              <span class="flex items-center gap-2">
                <i
                  :class="[
                    'text-[14px]',
                    exporting ? 'pi pi-spin pi-spinner' : 'pi pi-download',
                  ]"
                  aria-hidden="true"
                />
                <span class="text-[14px] font-semibold">Export</span>
                <span
                  class="mx-0.5 h-[18px] w-px bg-white/30"
                  aria-hidden="true"
                />
                <i
                  class="pi pi-chevron-down text-[12px]"
                  aria-hidden="true"
                />
              </span>
            </Button>
            <Menu
              id="report-export-menu"
              ref="exportMenuRef"
              class="w-[224px]"
              :model="exportMenuItems"
              popup
            >
              <template #item="{ item, props: itemProps }">
                <a
                  v-bind="itemProps.action"
                  class="flex items-start gap-2.5 px-2.5 py-2"
                >
                  <i
                    :class="[item.icon, item.iconClass, 'mt-0.5 text-[14px]']"
                    aria-hidden="true"
                  />
                  <span class="flex min-w-0 flex-col">
                    <span class="text-text-dark text-[13px] font-medium">{{ item.label }}</span>
                    <span
                      v-if="item.subtitle"
                      class="text-text-muted text-[11px]"
                    >{{ item.subtitle }}</span>
                  </span>
                </a>
              </template>
            </Menu>
          </template>
        </ReportsTable>
      </SurfaceCard>
    </template>
  </div>
</template>
