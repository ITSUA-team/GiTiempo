<script setup lang="ts">
import { PlusIcon } from "@heroicons/vue/24/outline";
import { PlayIcon } from "@heroicons/vue/24/solid";
import Button from "primevue/button";
import Column from "primevue/column";

import type { TimeEntryResponse } from "@gitiempo/shared";
import {
  EntryActionButton,
  ManagementTableShell,
  MobileRecordCard,
  managementTableColumnPt,
  useIsMobileViewport,
  type ManagementTableColumn,
} from "@gitiempo/web-shared";

import type { TimeEntriesDayGroup } from "@/lib/time-entry-display";
import TaskGitHubIssueLink from "@/components/tasks/TaskGitHubIssueLink.vue";
import TaskNameLink from "@/components/tasks/TaskNameLink.vue";

const props = defineProps<{
  // eslint-disable-next-line no-unused-vars
  formatDuration: (entry: TimeEntryResponse) => string;
  // eslint-disable-next-line no-unused-vars
  formatTimeRange: (entry: TimeEntryResponse) => string;
  group: TimeEntriesDayGroup;
  isStartTimerDisabled?: boolean;
  showHeader: boolean;
  startingTimerEntryId?: string | null;
}>();

const emit = defineEmits<{
  createForDay: [day: string];
  editEntry: [entry: TimeEntryResponse];
  openActiveTimer: [];
  startTimer: [entry: TimeEntryResponse];
}>();
const isMobileViewport = useIsMobileViewport();

const projectColumnWidth = '12rem';
const timeColumnWidth = '10rem';
const durationColumnWidth = '7rem';

const columns = [
  { key: 'task', label: 'Task', width: 'fill' },
  { key: 'project', label: 'Project', width: 192 },
  { key: 'time', label: 'Time', width: 160 },
  { key: 'duration', label: 'Duration', width: 112 },
] satisfies ManagementTableColumn[];
const startTimerButtonBaseClass = 'h-8 w-12 min-w-0 shrink-0 rounded-[6px] p-0';
const startTimerButtonDisabledClass =
  `${startTimerButtonBaseClass} border-divider bg-surface-primary text-text-subtle border`;

function getEntryRowClass(entry: TimeEntryResponse): string {
  return entry.endedAt === null ? "bg-accent-tint" : "bg-surface-primary hover:bg-app-bg";
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

function getStartTimerLabel(entry: TimeEntryResponse): string {
  return `Start timer for ${entry.task.title}`;
}

function isStartTimerPending(entry: TimeEntryResponse): boolean {
  return props.startingTimerEntryId === entry.id;
}

function isDirectStartDisabled(): boolean {
  return props.isStartTimerDisabled === true ||
    (props.startingTimerEntryId !== null && props.startingTimerEntryId !== undefined);
}

function getStartTimerButtonRootClass(): string {
  return isDirectStartDisabled()
    ? startTimerButtonDisabledClass
    : startTimerButtonBaseClass;
}

function getStartTimerIconClass(): string {
  return isDirectStartDisabled() ? 'text-text-subtle size-5' : 'text-text-inverse size-5';
}

function getStartTimerTooltip(entry: TimeEntryResponse): string | undefined {
  return isDirectStartDisabled() ? undefined : getStartTimerLabel(entry);
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
          <Button
            v-if="entry.endedAt !== null"
            v-tooltip.bottom="getStartTimerTooltip(entry)"
            :aria-label="getStartTimerLabel(entry)"
            :data-testid="`time-entry-mobile-start-timer-${entry.id}`"
            :disabled="isDirectStartDisabled()"
            :loading="isStartTimerPending(entry)"
            type="button"
            :pt="{
              root: { class: getStartTimerButtonRootClass() },
            }"
            @click="handleStartTimer(entry)"
          >
            <span
              data-icon="play"
            >
              <PlayIcon
                aria-hidden="true"
                :class="getStartTimerIconClass()"
              />
            </span>
          </Button>

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
            <span class="text-text-muted text-xs">Time</span>
            <span class="text-text-dark text-[13px] font-medium">
              {{ props.formatTimeRange(entry) }}
            </span>
          </div>
        </div>

        <p
          v-if="entry.endedAt === null"
          class="text-text-muted text-xs"
        >
          Stop from the top bar
        </p>
      </MobileRecordCard>
    </div>

    <ManagementTableShell
      v-else
      body-row-class="h-[52px]"
      :columns="columns"
      data-key="id"
      header-class="border-divider bg-app-bg text-text-muted flex h-[44px] items-center border-b font-sans text-[13px] font-medium"
      :loading="false"
      :row-class="(entry) => getEntryRowClass(entry as TimeEntryResponse)"
      shell-class="border-divider overflow-hidden rounded-lg border bg-surface-primary"
      :show-header="props.showHeader"
      table-class="min-w-[740px] w-full table-fixed border-collapse"
      table-container-class="overflow-auto rounded-none border-none"
      :value="props.group.items"
    >
      <Column :pt="managementTableColumnPt">
        <template #body="{ data: entry }">
          <div class="flex min-w-0 items-center gap-2">
            <Button
              v-if="entry.endedAt !== null"
              v-tooltip.bottom="getStartTimerTooltip(entry)"
              :aria-label="getStartTimerLabel(entry)"
              :data-testid="`time-entry-start-timer-${entry.id}`"
              :disabled="isDirectStartDisabled()"
              :loading="isStartTimerPending(entry)"
              type="button"
              :pt="{
                root: { class: getStartTimerButtonRootClass() },
              }"
              @click="handleStartTimer(entry)"
            >
              <span
                data-icon="play"
              >
                <PlayIcon
                  aria-hidden="true"
                  :class="getStartTimerIconClass()"
                />
              </span>
            </Button>

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
              <p
                v-if="entry.endedAt === null"
                class="text-text-muted text-xs"
              >
                Stop from the top bar
              </p>
            </div>
          </div>
        </template>
      </Column>

      <Column
        :pt="managementTableColumnPt"
        :style="{ width: projectColumnWidth }"
      >
        <template #body="{ data: entry }">
          <p class="text-text-dark truncate text-sm font-medium">
            {{ entry.project.name }}
          </p>
        </template>
      </Column>

      <Column
        :pt="managementTableColumnPt"
        :style="{ width: timeColumnWidth }"
      >
        <template #body="{ data: entry }">
          <p class="text-text-dark text-sm font-medium">
            {{ props.formatTimeRange(entry) }}
          </p>
        </template>
      </Column>

      <Column
        :pt="managementTableColumnPt"
        :style="{ width: durationColumnWidth }"
      >
        <template #body="{ data: entry }">
          <p class="text-text-dark text-sm font-medium tabular-nums">
            {{ props.formatDuration(entry) }}
          </p>
        </template>
      </Column>
    </ManagementTableShell>
  </section>
</template>
