<script setup lang="ts">
import { ClockIcon, PlusIcon } from "@heroicons/vue/24/outline";
import Column from "primevue/column";

import type { TimeEntryResponse } from "@gitiempo/shared";
import {
  EntryActionButton,
  ManagementTableShell,
  MobileRecordCard,
  managementTableColumnPt,
  managementTableHeaderClass,
  useIsMobileViewport,
  type ManagementTableColumn,
} from "@gitiempo/web-shared";

import { computed } from "vue";

import {
  formatCompactDuration,
  type TimeEntriesDayGroup,
} from "@/lib/time-entry-display";
import {
  RECORD_ENTRY_BODY_ROW_CLASS,
  getRecordEntryRowClass,
} from "../records/record-entry-actions";
import RecordEntryTaskCell from "../records/RecordEntryTaskCell.vue";

const props = defineProps<{
  formatDuration: (entry: TimeEntryResponse) => string;
  formatTimeRange: (entry: TimeEntryResponse) => string;
  group: TimeEntriesDayGroup;
  isInteractionDisabled?: boolean;
  isStartTimerDisabled?: boolean;
  showStopFirstGuidance?: boolean;
  showHeader: boolean;
  startingTimerEntryId?: string | null;
  stoppingTimerEntryId?: string | null;
}>();

const emit = defineEmits<{
  createForDay: [day: string];
  editEntry: [entry: TimeEntryResponse];
  openActiveTimer: [];
  startTimer: [entry: TimeEntryResponse];
  stopTimer: [entry: TimeEntryResponse];
}>();
const isMobileViewport = useIsMobileViewport();
const dayTotalLabel = computed(() =>
  formatCompactDuration(props.group.totalSeconds),
);

const timeEntriesTableHeaderClass = `${managementTableHeaderClass} min-w-[740px]`;

const columns = [
  { key: 'task', label: 'Task', width: 'fill' },
  { key: 'project', label: 'Project', width: 170 },
  { key: 'range', label: 'Range', width: 130 },
  { key: 'duration', label: 'Duration', width: 110, align: 'end' },
] satisfies ManagementTableColumn[];

function isStartTimerPending(entry: TimeEntryResponse): boolean {
  return props.startingTimerEntryId === entry.id;
}

function isStopTimerPending(entry: TimeEntryResponse): boolean {
  return props.stoppingTimerEntryId === entry.id;
}

function isDirectStartDisabled(): boolean {
  return props.isInteractionDisabled === true ||
    props.isStartTimerDisabled === true ||
    (props.startingTimerEntryId !== null && props.startingTimerEntryId !== undefined);
}

function isStopTimerDisabled(): boolean {
  return props.isInteractionDisabled === true ||
    (props.stoppingTimerEntryId !== null && props.stoppingTimerEntryId !== undefined);
}

function handleCreateForDay(): void {
  if (props.isInteractionDisabled === true) {
    return;
  }

  emit("createForDay", props.group.dateKey);
}

function handleStopTimer(entry: TimeEntryResponse): void {
  emit("stopTimer", entry);
}

function handleEntryTaskOpen(entry: TimeEntryResponse): void {
  if (props.isInteractionDisabled === true) {
    return;
  }

  if (entry.endedAt === null) {
    emit("openActiveTimer");
    return;
  }

  emit("editEntry", entry);
}

function handleStartTimer(entry: TimeEntryResponse): void {
  emit("startTimer", entry);
}
</script>

<template>
  <section class="flex flex-col gap-3">
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-text-dark flex min-w-0 items-center gap-2.5 text-base font-semibold">
        <span class="truncate">{{ props.group.heading }}</span>
        <span
          class="bg-accent-tint text-brand inline-flex shrink-0 items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-[13px] tabular-nums"
          :data-testid="`time-entries-day-total-${props.group.dateKey}`"
        >
          <ClockIcon
            aria-hidden="true"
            class="size-3.5"
          />
          <span>{{ dayTotalLabel }}</span>
        </span>
      </h2>
      <EntryActionButton
        :data-testid="`time-entries-day-create-${props.group.dateKey}`"
        :disabled="props.isInteractionDisabled === true"
        :icon="PlusIcon"
        label="New time entry"
        @click="handleCreateForDay"
      />
    </div>

    <div
      v-if="isMobileViewport"
      class="flex flex-col gap-3"
    >
      <MobileRecordCard
        v-for="entry in props.group.items"
        :key="entry.id"
        data-testid="time-entry-mobile-card"
        :tone="entry.endedAt === null ? 'highlighted' : 'default'"
      >
        <RecordEntryTaskCell
          :description="entry.description"
          :entry-id="entry.id"
          :github-issue="entry.githubIssue"
          :is-interactive="props.isInteractionDisabled !== true"
          :is-running="entry.endedAt === null"
          :is-start-disabled="isDirectStartDisabled()"
          :is-start-pending="isStartTimerPending(entry)"
          :is-stop-disabled="isStopTimerDisabled()"
          :is-stop-pending="isStopTimerPending(entry)"
          :show-stop-first-guidance="props.isInteractionDisabled !== true && props.showStopFirstGuidance === true"
          :task-title="entry.task.title"
          test-id-prefix="time-entry-mobile"
          variant="mobile"
          @open="handleEntryTaskOpen(entry)"
          @open-active-timer="emit('openActiveTimer')"
          @start-timer="() => handleStartTimer(entry)"
          @stop-timer="() => handleStopTimer(entry)"
        />

        <div class="grid grid-cols-2 gap-3">
          <div class="flex min-w-0 flex-col gap-1">
            <span class="text-text-muted text-xs">Project</span>
            <span class="text-text-dark truncate text-[13px] font-medium">
              {{ entry.project.name }}
            </span>
          </div>

          <div class="flex min-w-0 flex-col gap-1 text-right">
            <span class="text-text-muted text-xs">Duration</span>
            <span class="text-text-dark text-[13px] font-semibold tabular-nums">
              {{ props.formatDuration(entry) }}
            </span>
          </div>

          <div class="col-span-2 flex min-w-0 flex-col gap-1">
            <span class="text-text-muted text-xs">Range</span>
            <span class="text-text-dark text-[13px] font-medium">
              {{ props.formatTimeRange(entry) }}
            </span>
          </div>
        </div>
      </MobileRecordCard>
    </div>

    <ManagementTableShell
      v-else
      :body-row-class="RECORD_ENTRY_BODY_ROW_CLASS"
      :columns="columns"
      data-key="id"
      :header-class="timeEntriesTableHeaderClass"
      :loading="false"
      :row-class="(entry) => getRecordEntryRowClass((entry as TimeEntryResponse).endedAt === null)"
      shell-class="border-divider overflow-x-auto rounded-lg border bg-surface-primary"
      :show-header="props.showHeader"
      single-scroll
      table-class="min-w-[740px] w-full table-fixed border-collapse"
      table-container-class="overflow-visible rounded-none border-none"
      :value="props.group.items"
    >
      <Column :pt="managementTableColumnPt">
        <template #body="{ data: entry }">
          <RecordEntryTaskCell
            :description="entry.description"
            :entry-id="entry.id"
            :github-issue="entry.githubIssue"
            :is-interactive="props.isInteractionDisabled !== true"
            :is-running="entry.endedAt === null"
            :is-start-disabled="isDirectStartDisabled()"
            :is-start-pending="isStartTimerPending(entry)"
            :is-stop-disabled="isStopTimerDisabled()"
            :is-stop-pending="isStopTimerPending(entry)"
            :show-stop-first-guidance="props.isInteractionDisabled !== true && props.showStopFirstGuidance === true"
            :task-title="entry.task.title"
            test-id-prefix="time-entry"
            variant="desktop"
            @open="handleEntryTaskOpen(entry)"
            @open-active-timer="emit('openActiveTimer')"
            @start-timer="() => handleStartTimer(entry)"
            @stop-timer="() => handleStopTimer(entry)"
          />
        </template>
      </Column>

      <Column
        :pt="managementTableColumnPt"
        style="width: 170px"
      >
        <template #body="{ data: entry }">
          <p class="text-text-muted truncate text-[13px] font-normal">
            {{ entry.project.name }}
          </p>
        </template>
      </Column>

      <Column
        :pt="managementTableColumnPt"
        style="width: 130px"
      >
        <template #body="{ data: entry }">
          <p class="text-text-muted text-[13px] font-normal">
            {{ props.formatTimeRange(entry) }}
          </p>
        </template>
      </Column>

      <Column
        :pt="managementTableColumnPt"
        style="width: 110px"
      >
        <template #body="{ data: entry }">
          <p class="text-text-dark text-right text-[13px] font-semibold tabular-nums">
            {{ props.formatDuration(entry) }}
          </p>
        </template>
      </Column>
    </ManagementTableShell>
  </section>
</template>
