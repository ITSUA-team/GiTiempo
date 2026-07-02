<script setup lang="ts">
import { PlusIcon } from "@heroicons/vue/24/outline";
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

import type { TimeEntriesDayGroup } from "@/lib/time-entry-display";
import TimeEntryTimerAction from "@/components/time-entries/TimeEntryTimerAction.vue";
import TaskGitHubIssueLink from "@/components/tasks/TaskGitHubIssueLink.vue";
import TaskNameLink from "@/components/tasks/TaskNameLink.vue";

const props = defineProps<{
  formatDuration: (entry: TimeEntryResponse) => string;
  formatTimeRange: (entry: TimeEntryResponse) => string;
  group: TimeEntriesDayGroup;
  isStartTimerDisabled?: boolean;
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

const timeEntriesTableBodyRowClass =
  'border-divider h-[52px] border-b transition-colors last:border-b-0';
const timeEntriesTableHeaderClass = `${managementTableHeaderClass} min-w-[740px]`;

const columns = [
  { key: 'task', label: 'Task', width: 'fill' },
  { key: 'project', label: 'Project', width: 170 },
  { key: 'range', label: 'Range', width: 130 },
  { key: 'duration', label: 'Duration', width: 110, align: 'end' },
] satisfies ManagementTableColumn[];

function getEntryRowClass(entry: TimeEntryResponse): string {
  return entry.endedAt === null ? "bg-accent-tint hover:bg-accent-tint" : "bg-surface-primary hover:bg-app-bg";
}

function getEntryTaskOpenLabel(entry: TimeEntryResponse): string {
  return entry.endedAt === null
    ? `Update active timer for ${entry.task.title}`
    : `Edit time entry for ${entry.task.title}`;
}

function getEntryTaskTestId(
  entry: TimeEntryResponse,
  prefix: "time-entry" | "time-entry-mobile",
): string {
  return entry.endedAt === null
    ? `${prefix}-open-timer-${entry.id}`
    : `${prefix}-edit-${entry.id}`;
}

function isStartTimerPending(entry: TimeEntryResponse): boolean {
  return props.startingTimerEntryId === entry.id;
}

function isStopTimerPending(entry: TimeEntryResponse): boolean {
  return props.stoppingTimerEntryId === entry.id;
}

function isDirectStartDisabled(): boolean {
  return props.isStartTimerDisabled === true ||
    (props.startingTimerEntryId !== null && props.startingTimerEntryId !== undefined);
}

function isStopTimerDisabled(): boolean {
  return props.stoppingTimerEntryId !== null && props.stoppingTimerEntryId !== undefined;
}

function handleStopTimer(entry: TimeEntryResponse): void {
  if (entry.endedAt !== null || isStopTimerDisabled()) {
    return;
  }

  emit("stopTimer", entry);
}

function handleEntryTaskOpen(entry: TimeEntryResponse): void {
  if (entry.endedAt === null) {
    emit("openActiveTimer");
    return;
  }

  emit("editEntry", entry);
}

function handleStartTimer(entry: TimeEntryResponse): void {
  if (entry.endedAt === null || isDirectStartDisabled()) {
    return;
  }

  emit("startTimer", entry);
}
</script>

<template>
  <section class="flex flex-col gap-3">
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-text-dark text-base font-semibold">
        {{ props.group.heading }}
      </h2>
      <EntryActionButton
        :data-testid="`time-entries-day-create-${props.group.dateKey}`"
        :icon="PlusIcon"
        label="New time entry"
        @click="emit('createForDay', props.group.dateKey)"
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
        <div class="flex min-w-0 items-start gap-3">
          <TimeEntryTimerAction
            v-if="entry.endedAt !== null"
            action="start"
            :disabled="isDirectStartDisabled()"
            :entry="entry"
            :is-loading="isStartTimerPending(entry)"
            test-id-prefix="time-entry-mobile"
            @trigger="() => handleStartTimer(entry)"
          />
          <TimeEntryTimerAction
            v-else
            action="stop"
            :disabled="isStopTimerDisabled()"
            :entry="entry"
            :is-loading="isStopTimerPending(entry)"
            test-id-prefix="time-entry-mobile"
            @trigger="() => handleStopTimer(entry)"
          />

          <div class="flex min-w-0 flex-col gap-1">
            <div class="flex max-w-full min-w-0 items-center gap-1">
              <TaskNameLink
                :label="entry.task.title"
                :open-label="getEntryTaskOpenLabel(entry)"
                :test-id="getEntryTaskTestId(entry, 'time-entry-mobile')"
                @open="handleEntryTaskOpen(entry)"
              />
              <TaskGitHubIssueLink
                v-if="entry.githubIssue"
                :issue="entry.githubIssue"
                :test-id="`time-entry-mobile-github-${entry.id}`"
              />
            </div>
            <p
              v-if="entry.description"
              class="text-text-muted truncate text-xs"
            >
              {{ entry.description }}
            </p>
          </div>
        </div>

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
      :body-row-class="timeEntriesTableBodyRowClass"
      :columns="columns"
      data-key="id"
      :header-class="timeEntriesTableHeaderClass"
      :loading="false"
      :row-class="(entry) => getEntryRowClass(entry as TimeEntryResponse)"
      shell-class="border-divider overflow-x-auto rounded-lg border bg-surface-primary"
      :show-header="props.showHeader"
      single-scroll
      table-class="min-w-[740px] w-full table-fixed border-collapse"
      table-container-class="overflow-visible rounded-none border-none"
      :value="props.group.items"
    >
      <Column :pt="managementTableColumnPt">
        <template #body="{ data: entry }">
          <div class="flex min-w-0 items-center gap-2">
            <TimeEntryTimerAction
              v-if="entry.endedAt !== null"
              action="start"
              :disabled="isDirectStartDisabled()"
              :entry="entry"
              :is-loading="isStartTimerPending(entry)"
              test-id-prefix="time-entry"
              @trigger="() => handleStartTimer(entry)"
            />
            <TimeEntryTimerAction
              v-else
              action="stop"
              :disabled="isStopTimerDisabled()"
              :entry="entry"
              :is-loading="isStopTimerPending(entry)"
              test-id-prefix="time-entry"
              @trigger="() => handleStopTimer(entry)"
            />

            <div class="flex min-w-0 flex-col">
              <div class="flex max-w-full min-w-0 items-center gap-1">
                <TaskNameLink
                  :label="entry.task.title"
                  :open-label="getEntryTaskOpenLabel(entry)"
                  :test-id="getEntryTaskTestId(entry, 'time-entry')"
                  @open="handleEntryTaskOpen(entry)"
                />
                <TaskGitHubIssueLink
                  v-if="entry.githubIssue"
                  :issue="entry.githubIssue"
                  :test-id="`time-entry-github-${entry.id}`"
                />
              </div>
              <p
                v-if="entry.description"
                class="text-text-muted truncate text-xs"
              >
                {{ entry.description }}
              </p>
            </div>
          </div>
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
