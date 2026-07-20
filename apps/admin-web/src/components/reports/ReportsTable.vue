<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
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
import MobileRecordMetadataList from '@/components/MobileRecordMetadataList.vue';
import {
  buildReportTree,
  filterReportTreeGroups,
  flattenReportTree,
  formatReportPercent,
  maxReportGroupingLevels,
  sumReportTreeTotals,
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

const groupingDimensionLabels: Record<ReportGroupingDimension, string> = {
  member: 'Member',
  project: 'Project',
  task: 'Task',
};
const allGroupingDimensions: ReportGroupingDimension[] = [
  'project',
  'member',
  'task',
];

const availableGroupingDimensions = computed(() =>
  allGroupingDimensions.filter(
    (dimension) => !grouping.value.includes(dimension),
  ),
);
const addLevelOptions = computed(() =>
  availableGroupingDimensions.value.map((dimension) => ({
    label: groupingDimensionLabels[dimension],
    value: dimension,
  })),
);
const canAddGroupingLevel = computed(
  () =>
    grouping.value.length < maxReportGroupingLevels &&
    availableGroupingDimensions.value.length > 0,
);

function addGroupingLevel(
  dimension: ReportGroupingDimension | null | undefined,
): void {
  if (
    !dimension ||
    !canAddGroupingLevel.value ||
    grouping.value.includes(dimension)
  ) {
    return;
  }

  grouping.value = [...grouping.value, dimension];
}

function removeGroupingLevel(index: number): void {
  if (grouping.value.length <= 1) {
    return;
  }

  grouping.value = grouping.value.filter((_, i) => i !== index);
}

const draggedGroupingIndex = ref<number | null>(null);

function handleGroupingDragStart(index: number): void {
  draggedGroupingIndex.value = index;
}

function moveGroupingLevel(from: number, to: number): boolean {
  if (to < 0 || to >= grouping.value.length || from === to) {
    return false;
  }

  const next = [...grouping.value];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  grouping.value = next;

  return true;
}

function handleGroupingDrop(targetIndex: number): void {
  const from = draggedGroupingIndex.value;
  draggedGroupingIndex.value = null;
  if (from === null) {
    return;
  }

  moveGroupingLevel(from, targetIndex);
}

/**
 * Keyboard and pointer reordering, per the "Grouping reorder keyboard model"
 * note in the design file.
 *
 * Dragging alone left keyboard and screen-reader users with no way to reorder
 * at all (WCAG 2.1.1), and dragging alone is not an acceptable sole mechanism
 * for pointer users either (2.5.7) — hence both the grab model below and the
 * move buttons in the template.
 */
const grabbedGroupingIndex = ref<number | null>(null);
const groupingBeforeGrab = ref<ReportGrouping | null>(null);
const groupingAnnouncement = ref('');

/**
 * Reordering moves the chip's DOM node, and the browser drops focus when it
 * does. Without restoring focus the grab ends after a single arrow press, so
 * every chip registers its element and we refocus the moved one.
 */
const chipElements = new Map<ReportGroupingDimension, HTMLElement>();

function registerChipElement(
  dimension: ReportGroupingDimension,
  element: unknown,
): void {
  if (element instanceof HTMLElement) {
    chipElements.set(dimension, element);
  } else {
    chipElements.delete(dimension);
  }
}

async function refocusChip(dimension: ReportGroupingDimension): Promise<void> {
  await nextTick();
  chipElements.get(dimension)?.focus();
}

function groupingLevelLabel(index: number): string {
  const dimension = grouping.value[index];

  return dimension === undefined
    ? ''
    : `${groupingDimensionLabels[dimension]}, level ${index + 1} of ${grouping.value.length}`;
}

function announceGroupingMove(index: number, verb: string): void {
  const dimension = grouping.value[index];
  if (dimension === undefined) return;

  groupingAnnouncement.value = `${groupingDimensionLabels[dimension]}, ${verb} position ${index + 1} of ${grouping.value.length}.`;
}

function toggleGroupingGrab(index: number): void {
  if (grabbedGroupingIndex.value === index) {
    dropGroupingGrab();
    return;
  }

  grabbedGroupingIndex.value = index;
  groupingBeforeGrab.value = [...grouping.value];
  announceGroupingMove(index, 'grabbed at');
}

function moveGrabbedGroupingLevel(delta: number): void {
  const from = grabbedGroupingIndex.value;
  if (from === null) return;

  const dimension = grouping.value[from];
  const to = from + delta;
  if (!moveGroupingLevel(from, to)) return;

  grabbedGroupingIndex.value = to;
  announceGroupingMove(to, 'moved to');
  if (dimension !== undefined) void refocusChip(dimension);
}

function dropGroupingGrab(): void {
  const index = grabbedGroupingIndex.value;
  if (index === null) return;

  announceGroupingMove(index, 'dropped at');
  grabbedGroupingIndex.value = null;
  groupingBeforeGrab.value = null;
}

/** Escape restores the order the chip was grabbed from. */
function cancelGroupingGrab(): void {
  if (grabbedGroupingIndex.value === null) return;

  if (groupingBeforeGrab.value !== null) {
    grouping.value = groupingBeforeGrab.value;
  }
  groupingAnnouncement.value = 'Reorder cancelled.';
  grabbedGroupingIndex.value = null;
  groupingBeforeGrab.value = null;
}

/** Pointer path for 2.5.7: the same move without dragging. */
function moveGroupingLevelByStep(index: number, delta: number): void {
  const dimension = grouping.value[index];
  if (!moveGroupingLevel(index, index + delta)) return;

  announceGroupingMove(index + delta, 'moved to');
  if (dimension !== undefined) void refocusChip(dimension);
}

/** Only end the grab when focus leaves the builder, not on every reorder. */
function handleGroupingFocusOut(event: FocusEvent): void {
  const container = event.currentTarget;
  const next = event.relatedTarget;
  if (
    container instanceof HTMLElement &&
    next instanceof Node &&
    container.contains(next)
  ) {
    return;
  }

  dropGroupingGrab();
}

// Collapsed group ids: everything renders expanded until a chevron folds it,
// and a new grouping path invalidates the old node ids anyway.
const collapsedIds = ref(new Set<string>());
watch(grouping, () => {
  collapsedIds.value = new Set();
});

// Aggregate filters (hours, billable, billable %, activity) act on
// the tree's top-level groups so they compare the totals the rows display.
const reportTree = computed(() =>
  filterReportTreeGroups(
    buildReportTree(props.rows, grouping.value),
    filters.value,
    new Date(),
  ),
);
const displayRows = computed(() =>
  flattenReportTree(reportTree.value, collapsedIds.value),
);
const totals = computed(() => sumReportTreeTotals(reportTree.value));

function toggleRowExpansion(row: ReportDisplayRow): void {
  const next = new Set(collapsedIds.value);
  if (next.has(row.id)) {
    next.delete(row.id);
  } else {
    next.add(row.id);
  }
  collapsedIds.value = next;
}

const groupingColumnLabel = computed(() =>
  grouping.value
    .map((dimension) => groupingDimensionLabels[dimension])
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
            class="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center"
          >
            <DatePicker
              :model-value="dateRange"
              aria-label="Report date range"
              class="w-full sm:w-[240px]"
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

            <IconField class="w-full sm:w-[280px]">
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

    <div
      class="flex flex-wrap items-center justify-between gap-3"
      data-testid="report-grouping-builder"
      @focusout="handleGroupingFocusOut"
    >
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-text-muted text-[13px] font-medium">Group by</span>
        <template
          v-for="(dimension, index) in grouping"
          :key="dimension"
        >
          <i
            v-if="index > 0"
            class="pi pi-chevron-right text-text-muted text-[11px]"
            aria-hidden="true"
          />
          <div
            :ref="(el) => registerChipElement(dimension, el)"
            :aria-grabbed="grabbedGroupingIndex === index"
            :aria-label="groupingLevelLabel(index)"
            aria-roledescription="sortable grouping level"
            :class="
              grabbedGroupingIndex === index
                ? 'ring-brand shadow-[0_3px_10px_#5D2B8555] ring-2'
                : ''
            "
            class="group bg-accent-tint focus-visible:ring-brand flex h-[30px] cursor-grab items-center gap-1.5 rounded-full px-2.5 focus:outline-none focus-visible:ring-2"
            :data-testid="`report-grouping-chip-${dimension}`"
            draggable="true"
            role="button"
            tabindex="0"
            @dragstart="handleGroupingDragStart(index)"
            @dragover.prevent
            @drop.prevent="handleGroupingDrop(index)"
            @keydown.enter.prevent="toggleGroupingGrab(index)"
            @keydown.esc.prevent="cancelGroupingGrab"
            @keydown.left.prevent="moveGrabbedGroupingLevel(-1)"
            @keydown.right.prevent="moveGrabbedGroupingLevel(1)"
            @keydown.space.prevent="toggleGroupingGrab(index)"
          >
            <i
              class="pi pi-bars text-brand text-[10px]"
              aria-hidden="true"
            />
            <button
              v-if="grouping.length > 1"
              :aria-label="`Move ${groupingDimensionLabels[dimension]} earlier`"
              class="text-brand hover:bg-brand/10 flex h-4 w-4 items-center justify-center rounded-full border-none bg-transparent p-0 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 disabled:opacity-30"
              :data-testid="`report-grouping-move-earlier-${dimension}`"
              :disabled="index === 0"
              tabindex="-1"
              type="button"
              @click="moveGroupingLevelByStep(index, -1)"
            >
              <i class="pi pi-chevron-left text-[9px]" />
            </button>
            <span class="text-brand text-[13px] font-semibold">
              {{ groupingDimensionLabels[dimension] }}
            </span>
            <button
              v-if="grouping.length > 1"
              :aria-label="`Move ${groupingDimensionLabels[dimension]} later`"
              class="text-brand hover:bg-brand/10 flex h-4 w-4 items-center justify-center rounded-full border-none bg-transparent p-0 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 disabled:opacity-30"
              :data-testid="`report-grouping-move-later-${dimension}`"
              :disabled="index === grouping.length - 1"
              tabindex="-1"
              type="button"
              @click="moveGroupingLevelByStep(index, 1)"
            >
              <i class="pi pi-chevron-right text-[9px]" />
            </button>
            <button
              v-if="grouping.length > 1"
              type="button"
              class="text-brand hover:bg-brand/10 flex h-4 w-4 items-center justify-center rounded-full border-none bg-transparent p-0"
              :aria-label="`Remove ${groupingDimensionLabels[dimension]} grouping level`"
              :data-testid="`report-grouping-remove-${dimension}`"
              @click="removeGroupingLevel(index)"
            >
              <i class="pi pi-times text-[10px]" />
            </button>
          </div>
        </template>

        <Select
          v-if="canAddGroupingLevel"
          :model-value="null"
          aria-label="Add grouping level"
          class="h-[30px] w-[140px] rounded-full text-[13px]"
          data-testid="report-grouping-add-level"
          :options="addLevelOptions"
          option-label="label"
          option-value="value"
          placeholder="+ Add level"
          :pt="giTiempoFieldWidthSelectPt"
          @update:model-value="addGroupingLevel"
        />
      </div>

      <span class="text-text-muted hidden text-xs sm:inline">
        Drag, or press Space to grab and ← → to move · up to
        {{ maxReportGroupingLevels }} levels
      </span>

      <!-- Narrates each grab, move and drop; assertive so it interrupts. -->
      <span
        aria-live="assertive"
        class="sr-only"
        data-testid="report-grouping-announcement"
        role="status"
      >
        {{ groupingAnnouncement }}
      </span>
    </div>

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
              <div class="min-w-0">
                <h3 :class="['truncate', getRowLabelClass(row)]">
                  {{ row.label }}
                </h3>
                <p
                  v-if="row.childCountLabel"
                  class="text-text-muted truncate text-[13px]"
                >
                  {{ row.childCountLabel }}
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
                    value: formatPaddedHoursMinutesDuration(
                      row.billableSeconds,
                    ),
                  },
                ]"
              />
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
