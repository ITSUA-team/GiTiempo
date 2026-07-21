<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { giTiempoFieldWidthSelectPt } from '@gitiempo/web-config/theme';
import Select from 'primevue/select';

import {
  maxReportGroupingLevels,
  reportGroupingDimensionLabels,
  reportGroupingDimensions,
  type ReportGrouping,
  type ReportGroupingDimension,
} from '@/lib/report-view-model';

const grouping = defineModel<ReportGrouping>('grouping', { required: true });

const availableGroupingDimensions = computed(() =>
  reportGroupingDimensions.filter(
    (dimension) => !grouping.value.includes(dimension),
  ),
);
const addLevelOptions = computed(() =>
  availableGroupingDimensions.value.map((dimension) => ({
    label: reportGroupingDimensionLabels[dimension],
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
    : `${reportGroupingDimensionLabels[dimension]}, level ${index + 1} of ${grouping.value.length}`;
}

// Takes the dimension explicitly rather than re-reading grouping[index]: after
// a reorder the model write has not settled synchronously, so reading it back
// here would name the wrong chip.
function announceGroupingMove(
  dimension: ReportGroupingDimension | undefined,
  index: number,
  verb: string,
): void {
  if (dimension === undefined) return;

  groupingAnnouncement.value = `${reportGroupingDimensionLabels[dimension]}, ${verb} position ${index + 1} of ${grouping.value.length}.`;
}

function toggleGroupingGrab(index: number): void {
  if (grabbedGroupingIndex.value === index) {
    dropGroupingGrab();
    return;
  }

  grabbedGroupingIndex.value = index;
  groupingBeforeGrab.value = [...grouping.value];
  announceGroupingMove(grouping.value[index], index, 'grabbed at');
}

function moveGrabbedGroupingLevel(delta: number): void {
  const from = grabbedGroupingIndex.value;
  if (from === null) return;

  const dimension = grouping.value[from];
  const to = from + delta;
  if (!moveGroupingLevel(from, to)) return;

  grabbedGroupingIndex.value = to;
  announceGroupingMove(dimension, to, 'moved to');
  if (dimension !== undefined) void refocusChip(dimension);
}

function dropGroupingGrab(): void {
  const index = grabbedGroupingIndex.value;
  if (index === null) return;

  announceGroupingMove(grouping.value[index], index, 'dropped at');
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

/**
 * Pointer and Tab path: the same move without dragging or grabbing.
 *
 * Focus stays on the chevron so it can be pressed repeatedly, unless that
 * press pushed the level to an end and disabled the button — a disabled
 * element cannot hold focus, so the chip takes it instead.
 */
function moveGroupingLevelByStep(
  index: number,
  delta: number,
  event?: Event,
): void {
  const dimension = grouping.value[index];
  const trigger = event?.currentTarget;
  if (!moveGroupingLevel(index, index + delta)) return;

  announceGroupingMove(dimension, index + delta, 'moved to');
  if (dimension === undefined) return;

  void (async () => {
    await nextTick();
    if (trigger instanceof HTMLButtonElement && !trigger.disabled) {
      trigger.focus();
      return;
    }
    chipElements.get(dimension)?.focus();
  })();
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
</script>

<template>
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
            :aria-label="`Move ${reportGroupingDimensionLabels[dimension]} earlier`"
            class="text-brand hover:bg-brand/10 flex h-4 w-4 items-center justify-center rounded-full border-none bg-transparent p-0 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 disabled:opacity-30"
            :data-testid="`report-grouping-move-earlier-${dimension}`"
            :disabled="index === 0"
            type="button"
            @click="moveGroupingLevelByStep(index, -1, $event)"
          >
            <i class="pi pi-chevron-left text-[9px]" />
          </button>
          <span class="text-brand text-[13px] font-semibold">
            {{ reportGroupingDimensionLabels[dimension] }}
          </span>
          <button
            v-if="grouping.length > 1"
            :aria-label="`Move ${reportGroupingDimensionLabels[dimension]} later`"
            class="text-brand hover:bg-brand/10 flex h-4 w-4 items-center justify-center rounded-full border-none bg-transparent p-0 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 disabled:opacity-30"
            :data-testid="`report-grouping-move-later-${dimension}`"
            :disabled="index === grouping.length - 1"
            type="button"
            @click="moveGroupingLevelByStep(index, 1, $event)"
          >
            <i class="pi pi-chevron-right text-[9px]" />
          </button>
          <button
            v-if="grouping.length > 1"
            type="button"
            class="text-brand hover:bg-brand/10 flex h-4 w-4 items-center justify-center rounded-full border-none bg-transparent p-0"
            :aria-label="`Remove ${reportGroupingDimensionLabels[dimension]} grouping level`"
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
</template>
