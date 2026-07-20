<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type {
  SavedReportPeriod,
  TimeReportExportFormat,
} from '@gitiempo/shared';
import { StatCard, SurfaceCard } from '@gitiempo/web-shared';
import { formatPaddedHoursMinutesDuration } from '@gitiempo/web-shared/time';
import Button from 'primevue/button';
import Menu from 'primevue/menu';

import ManagementPageSkeleton from '@/components/loading/ManagementPageSkeleton.vue';
import RequestErrorCard from '@/components/RequestErrorCard.vue';
import ReportsTable from '@/components/reports/ReportsTable.vue';
import SavedReportsBar from '@/components/reports/SavedReportsBar.vue';
import { useToasts } from '@/composables/feedback/useToasts';
import { useReportsData } from '@/composables/reports/useReportsData';
import { useSavedReports } from '@/composables/reports/useSavedReports';
import { buildConfigFromState } from '@/lib/saved-report-config';
import { downloadReportExport } from '@/lib/report-download';
import {
  createDefaultReportTableFilters,
  defaultReportGrouping,
  filterReportRows,
  formatReportPercent,
  getReportDateRangeError,
  getReportExportBlockedReason,
  toReportGroupingApiPath,
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
const reportPeriod = ref<SavedReportPeriod | null>(null);

const currentSavedReportConfig = computed(() =>
  buildConfigFromState({
    dateRange: dateRange.value,
    filters: tableFilters.value,
    grouping: grouping.value,
    period: reportPeriod.value,
  }),
);

const savedReports = useSavedReports({
  currentConfig: currentSavedReportConfig,
  onApply({ fallbacks, state }) {
    dateRange.value = state.dateRange;
    grouping.value = state.grouping;
    reportPeriod.value = state.period;
    tableFilters.value = state.filters;

    if (fallbacks.length > 0) {
      errorToast(
        `This report referenced a ${fallbacks.join(' and ')} you can no longer see. Showing all instead.`,
      );
    }
  },
  resolveOptions: () => ({
    availableMemberIds: memberOptions.value.map((option) => option.value),
    availableProjectIds: projectOptions.value.map((option) => option.value),
  }),
});

onMounted(() => {
  void savedReports.refresh();
});

/**
 * Clears the loaded preset and resets grouping, scope, and column filters.
 * The date window is deliberately preserved — resetting it mid-analysis is
 * more surprising than helpful, and the spec scenario lists only the three.
 */
function startNewReport(): void {
  savedReports.clearActive();
  grouping.value = [...defaultReportGrouping];
  tableFilters.value = createDefaultReportTableFilters();
}

async function handleSaveReport(): Promise<void> {
  const saved = await savedReports.save();
  if (saved) successToast(`Saved "${saved.name}".`);
}

async function handleSaveReportAsNew(name: string): Promise<void> {
  const created = await savedReports.saveAsNew(name);
  if (created) successToast(`Saved "${created.name}".`);
}

async function handleRenameReport(id: string, name: string): Promise<void> {
  const renamed = await savedReports.rename(id, name);
  if (renamed) successToast(`Renamed to "${renamed.name}".`);
}

async function handleDeleteReport(id: string): Promise<void> {
  const removed = await savedReports.remove(id);
  if (removed) successToast('Report deleted.');
}
const tableRows = computed(() =>
  filterReportRows(rows.value, tableFilters.value),
);
const reportDateRangeError = computed(() =>
  getReportDateRangeError(dateRange.value),
);
// Rather than hand back a file that quietly disagrees with the table, block
// the export whenever an active filter has no faithful CSV equivalent. The
// rule and its wording live in the view model, and it is grouping-aware: a
// member filter exports fine under member grouping but not over folded
// project rows.
const exportBlockedReason = computed(() =>
  getReportExportBlockedReason(tableFilters.value, grouping.value),
);
const exportDisabled = computed(
  () =>
    loading.value ||
    exporting.value ||
    reportDateRangeError.value !== null ||
    exportBlockedReason.value !== null,
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

async function handleExport(format: TimeReportExportFormat): Promise<void> {
  if (
    exporting.value ||
    reportDateRangeError.value ||
    exportBlockedReason.value !== null
  ) {
    return;
  }

  exporting.value = true;

  try {
    const exportResult = await exportCurrentReport(
      {
        dateRange: dateRange.value,
        groupBy: toReportGroupingApiPath(grouping.value),
        memberId: tableFilters.value.memberId,
        projectId: tableFilters.value.projectId,
      },
      format,
    );

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
      <SavedReportsBar
        :active-id="savedReports.activeId.value"
        :error="savedReports.error.value"
        :is-dirty="savedReports.isDirty.value"
        :is-saving="savedReports.isSaving.value"
        :presets="savedReports.presets.value"
        @delete="handleDeleteReport"
        @new="startNewReport"
        @rename="handleRenameReport"
        @save="handleSaveReport"
        @save-as-new="handleSaveReportAsNew"
        @select="savedReports.selectPreset"
      />

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
          v-model:period="reportPeriod"
          :rows="tableRows"
          :loading="loading"
          :project-options="projectOptions"
          :member-options="memberOptions"
        >
          <template #actions>
            <!-- A disabled button swallows hover, so the reason lives on a wrapper. -->
            <span
              v-tooltip.top="exportBlockedReason ?? ''"
              class="w-full sm:w-auto"
            >
              <Button
                data-testid="export-reports"
                class="h-[38px] w-full sm:w-auto"
                aria-label="Export report"
                aria-haspopup="true"
                aria-controls="report-export-menu"
                :aria-description="exportBlockedReason"
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
            </span>
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
