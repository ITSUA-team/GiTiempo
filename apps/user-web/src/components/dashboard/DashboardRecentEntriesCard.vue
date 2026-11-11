<script setup lang="ts">
import Button from "primevue/button";
import Column from "primevue/column";
import {
  ManagementTableShell,
  MobileRecordCard,
  SectionHeader,
  SurfaceCard,
  managementTableColumnPt,
  useIsMobileViewport,
  type ManagementTableColumn,
} from "@gitiempo/web-shared";

import type { TimeEntryResponse } from "@gitiempo/shared";
import type { DashboardRecentEntryRow } from "@/composables/dashboard/useDashboardOverview";
import {
  RECORD_ENTRY_BODY_ROW_CLASS,
  getRecordEntryRowClass,
} from "../records/record-entry-actions";
import RecordEntryTaskCell from "../records/RecordEntryTaskCell.vue";

const props = defineProps<{
  entries: DashboardRecentEntryRow[];
  isStartTimerDisabled?: boolean;
  showStopFirstGuidance?: boolean;
  startingTimerEntryId?: string | null;
  stoppingTimerEntryId?: string | null;
}>();

const emit = defineEmits<{
  editEntry: [entry: TimeEntryResponse];
  openActiveTimer: [];
  startTimer: [entry: DashboardRecentEntryRow["timerEntry"]];
  stopTimer: [entry: DashboardRecentEntryRow["timerEntry"]];
  viewAll: [];
}>();
const isMobileViewport = useIsMobileViewport();

const columns = [
  { key: "task", label: "Task", width: "fill" },
  { key: "project", label: "Project", width: 170 },
  { key: "range", label: "Range", width: 130 },
  { key: "duration", label: "Duration", width: 110, align: "end" },
] satisfies ManagementTableColumn[];

function isStartTimerPending(entry: DashboardRecentEntryRow): boolean {
  return props.startingTimerEntryId === entry.id;
}

function isStopTimerPending(entry: DashboardRecentEntryRow): boolean {
  return props.stoppingTimerEntryId === entry.id;
}

function isDirectStartDisabled(): boolean {
  return props.isStartTimerDisabled === true ||
    (props.startingTimerEntryId !== null && props.startingTimerEntryId !== undefined);
}

function isStopTimerDisabled(): boolean {
  return props.stoppingTimerEntryId !== null && props.stoppingTimerEntryId !== undefined;
}

function handleEntryTaskOpen(entry: DashboardRecentEntryRow): void {
  if (entry.timerEntry.endedAt === null) {
    emit("openActiveTimer");
    return;
  }

  emit("editEntry", entry.entry);
}

function handleStartTimer(entry: DashboardRecentEntryRow): void {
  emit("startTimer", entry.timerEntry);
}

function handleStopTimer(entry: DashboardRecentEntryRow): void {
  emit("stopTimer", entry.timerEntry);
}
</script>

<template>
  <SurfaceCard
    body-class="flex flex-col gap-4"
    padding-class="p-6"
  >
    <SectionHeader
      description="Last 10 entries across your projects."
      title="Recent Time Entries"
    >
      <template #actions>
        <Button
          class="text-brand"
          label="View all"
          size="small"
          variant="text"
          @click="emit('viewAll')"
        />
      </template>
    </SectionHeader>

    <div
      v-if="isMobileViewport"
      class="flex flex-col gap-3"
    >
      <MobileRecordCard
        v-for="entry in props.entries"
        :key="entry.id"
        data-testid="dashboard-recent-entry-mobile-card"
        :tone="entry.isHighlighted ? 'highlighted' : 'default'"
      >
        <RecordEntryTaskCell
          :description="entry.description"
          :entry-id="entry.timerEntry.id"
          :github-issue="entry.githubIssue"
          :is-interactive="true"
          :is-running="entry.timerEntry.endedAt === null"
          :is-start-disabled="isDirectStartDisabled()"
          :is-start-pending="isStartTimerPending(entry)"
          :is-stop-disabled="isStopTimerDisabled()"
          :is-stop-pending="isStopTimerPending(entry)"
          :show-stop-first-guidance="props.showStopFirstGuidance === true"
          :task-title="entry.taskTitle"
          test-id-prefix="dashboard-recent-entry-mobile"
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
              {{ entry.projectName }}
            </span>
          </div>

          <div class="flex min-w-0 flex-col gap-1 text-right">
            <span class="text-text-muted text-xs">Duration</span>
            <span class="text-text-dark text-[13px] font-semibold tabular-nums">
              {{ entry.durationLabel }}
            </span>
          </div>

          <div class="col-span-2 flex min-w-0 flex-col gap-1">
            <span class="text-text-muted text-xs">Range</span>
            <span class="text-text-dark truncate text-[13px] font-medium">
              {{ entry.timeRangeLabel }}
            </span>
          </div>
        </div>
      </MobileRecordCard>
    </div>

    <ManagementTableShell
      v-else
      :body-row-class="RECORD_ENTRY_BODY_ROW_CLASS"
      :columns="columns"
      data-testid="dashboard-recent-entries-table"
      data-key="id"
      :loading="false"
      :row-class="(entry) => getRecordEntryRowClass((entry as DashboardRecentEntryRow).isHighlighted)"
      :show-header="false"
      shell-class="border-divider overflow-x-auto rounded-[6px] border"
      single-scroll
      table-class="min-w-[740px] w-full table-fixed border-collapse"
      table-container-class="overflow-visible rounded-none border-none"
      :value="props.entries"
    >
      <Column :pt="managementTableColumnPt">
        <template #body="{ data: entry }">
          <RecordEntryTaskCell
            :description="entry.description"
            :entry-id="entry.timerEntry.id"
            :github-issue="entry.githubIssue"
            :is-interactive="true"
            :is-running="entry.timerEntry.endedAt === null"
            :is-start-disabled="isDirectStartDisabled()"
            :is-start-pending="isStartTimerPending(entry)"
            :is-stop-disabled="isStopTimerDisabled()"
            :is-stop-pending="isStopTimerPending(entry)"
            :show-stop-first-guidance="props.showStopFirstGuidance === true"
            :task-title="entry.taskTitle"
            test-id-prefix="dashboard-recent-entry"
            variant="desktop"
            @open="handleEntryTaskOpen(entry)"
            @open-active-timer="emit('openActiveTimer')"
            @start-timer="() => handleStartTimer(entry)"
            @stop-timer="() => handleStopTimer(entry)"
          />
        </template>
      </Column>

      <Column
        style="width: 170px"
        :pt="managementTableColumnPt"
      >
        <template #body="{ data: entry }">
          <p class="text-text-muted truncate text-[13px] font-normal">
            {{ entry.projectName }}
          </p>
        </template>
      </Column>

      <Column
        style="width: 130px"
        :pt="managementTableColumnPt"
      >
        <template #body="{ data: entry }">
          <p class="text-text-muted text-[13px] font-normal">
            {{ entry.timeRangeLabel }}
          </p>
        </template>
      </Column>

      <Column
        style="width: 110px"
        :pt="managementTableColumnPt"
      >
        <template #body="{ data: entry }">
          <p class="text-text-dark text-right text-[13px] font-semibold tabular-nums">
            {{ entry.durationLabel }}
          </p>
        </template>
      </Column>
    </ManagementTableShell>
  </SurfaceCard>
</template>
