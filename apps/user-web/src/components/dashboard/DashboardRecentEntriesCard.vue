<script setup lang="ts">
import Button from "primevue/button";
import Column from "primevue/column";
import type { RouteLocationNamedRaw } from "vue-router";
import {
  ManagementTableShell,
  MobileRecordCard,
  SectionHeader,
  SurfaceCard,
  managementTableColumnPt,
  managementTableHeaderClass,
  useIsMobileViewport,
  type ManagementTableColumn,
} from "@gitiempo/web-shared";

import type { DashboardRecentEntryRow } from "@/composables/dashboard/useDashboardOverview";
import TaskGitHubIssueLink from "@/components/tasks/TaskGitHubIssueLink.vue";
import TimerActionButton from "@/components/timer/TimerActionButton.vue";

const props = defineProps<{
  entries: DashboardRecentEntryRow[];
  isStartTimerDisabled?: boolean;
  sectionRoute?: RouteLocationNamedRaw | null;
  startingTimerEntryId?: string | null;
  stoppingTimerEntryId?: string | null;
}>();

const emit = defineEmits<{
  activate: [];
  startTimer: [entry: DashboardRecentEntryRow["timerEntry"]];
  stopTimer: [entry: DashboardRecentEntryRow["timerEntry"]];
  viewAll: [];
}>();
const isMobileViewport = useIsMobileViewport();

const columns = [
  { key: "task", label: "Task", width: "fill" },
  { key: "project", label: "Project", width: 180 },
  { key: "range", label: "Range", width: 120 },
  { key: "duration", label: "Duration", width: 120, align: "end" },
] satisfies ManagementTableColumn[];

const dashboardRecentEntriesHeaderClass = `${managementTableHeaderClass} min-w-[740px]`;

function getRowClass(entry: DashboardRecentEntryRow): string {
  return entry.isHighlighted ? "bg-accent-tint hover:bg-accent-tint" : "bg-surface-primary";
}

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

function handleStartTimer(entry: DashboardRecentEntryRow): void {
  if (entry.timerEntry.endedAt === null || isDirectStartDisabled()) {
    return;
  }

  emit("startTimer", entry.timerEntry);
}

function handleStopTimer(entry: DashboardRecentEntryRow): void {
  if (entry.timerEntry.endedAt !== null || isStopTimerDisabled()) {
    return;
  }

  emit("stopTimer", entry.timerEntry);
}
</script>

<template>
  <div class="group relative z-0">
    <SurfaceCard
      body-class="flex flex-col gap-4"
      class="group-hover:shadow-popover transition-shadow"
      padding-class="p-6"
    >
      <SectionHeader
        description="Last 10 entries across your projects."
        title="Recent Time Entries"
      >
        <template #actions>
          <span
            class="relative z-20"
            data-testid="dashboard-recent-entries-view-all-control"
            @click.stop
          >
            <Button
              class="text-brand"
              label="View all"
              size="small"
              variant="text"
              @click="emit('viewAll')"
            />
          </span>
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
          <div class="flex min-w-0 items-start gap-3">
            <span
              class="relative z-20 shrink-0"
              @click.stop
            >
              <TimerActionButton
                v-if="entry.timerEntry.endedAt !== null"
                action="start"
                :disabled="isDirectStartDisabled()"
                :target="{ id: entry.timerEntry.id, title: entry.timerEntry.task.title }"
                :is-loading="isStartTimerPending(entry)"
                :show-stop-first-guidance="false"
                test-id-prefix="dashboard-recent-entry-mobile"
                @trigger="() => handleStartTimer(entry)"
              />
              <TimerActionButton
                v-else
                action="stop"
                :disabled="isStopTimerDisabled()"
                :target="{ id: entry.timerEntry.id, title: entry.timerEntry.task.title }"
                :is-loading="isStopTimerPending(entry)"
                test-id-prefix="dashboard-recent-entry-mobile"
                @trigger="() => handleStopTimer(entry)"
              />
            </span>

            <div class="flex min-w-0 flex-col gap-1">
              <div class="flex max-w-full min-w-0 items-center gap-1">
                <p class="text-text-dark truncate text-sm font-medium">
                  {{ entry.taskTitle }}
                </p>
                <span
                  v-if="entry.githubIssue"
                  class="relative z-20 shrink-0"
                  @click.stop
                >
                  <TaskGitHubIssueLink
                    :issue="entry.githubIssue"
                    :test-id="`dashboard-recent-entry-mobile-github-${entry.id}`"
                  />
                </span>
              </div>
              <p class="text-text-muted truncate text-[13px]">
                {{ entry.projectName }}
              </p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="flex min-w-0 flex-col gap-1">
              <span class="text-text-muted text-xs">Range</span>
              <span class="text-text-dark truncate text-[13px] font-medium">
                {{ entry.timeRangeLabel }}
              </span>
            </div>

            <div class="flex min-w-0 flex-col gap-1 text-right">
              <span class="text-text-muted text-xs">Duration</span>
              <span class="text-text-dark text-[13px] font-semibold tabular-nums">
                {{ entry.durationLabel }}
              </span>
            </div>
          </div>
        </MobileRecordCard>
      </div>

      <ManagementTableShell
        v-else
        :columns="columns"
        data-testid="dashboard-recent-entries-table"
        data-key="id"
        :header-class="dashboardRecentEntriesHeaderClass"
        :loading="false"
        :row-class="(entry) => getRowClass(entry as DashboardRecentEntryRow)"
        shell-class="border-divider overflow-x-auto rounded-[6px] border"
        single-scroll
        table-class="min-w-[740px] w-full table-fixed border-collapse"
        table-container-class="overflow-visible rounded-none border-none"
        :value="props.entries"
      >
        <Column :pt="managementTableColumnPt">
          <template #body="{ data: entry }">
            <div class="relative z-20 flex min-w-0 items-center gap-2">
              <TimerActionButton
                v-if="entry.timerEntry.endedAt !== null"
                action="start"
                :disabled="isDirectStartDisabled()"
                :target="{ id: entry.timerEntry.id, title: entry.timerEntry.task.title }"
                :is-loading="isStartTimerPending(entry)"
                :show-stop-first-guidance="false"
                test-id-prefix="dashboard-recent-entry"
                @trigger="() => handleStartTimer(entry)"
              />
              <TimerActionButton
                v-else
                action="stop"
                :disabled="isStopTimerDisabled()"
                :target="{ id: entry.timerEntry.id, title: entry.timerEntry.task.title }"
                :is-loading="isStopTimerPending(entry)"
                test-id-prefix="dashboard-recent-entry"
                @trigger="() => handleStopTimer(entry)"
              />

              <div class="flex max-w-full min-w-0 items-center gap-1">
                <p class="text-text-dark truncate text-sm font-medium">
                  {{ entry.taskTitle }}
                </p>
                <TaskGitHubIssueLink
                  v-if="entry.githubIssue"
                  :issue="entry.githubIssue"
                  :test-id="`dashboard-recent-entry-github-${entry.id}`"
                />
              </div>
            </div>
          </template>
        </Column>

        <Column
          style="width: 180px"
          :pt="managementTableColumnPt"
        >
          <template #body="{ data: entry }">
            <p class="text-text-muted truncate text-[13px]">
              {{ entry.projectName }}
            </p>
          </template>
        </Column>

        <Column
          style="width: 120px"
          :pt="managementTableColumnPt"
        >
          <template #body="{ data: entry }">
            <p class="text-text-muted text-[13px]">
              {{ entry.timeRangeLabel }}
            </p>
          </template>
        </Column>

        <Column
          style="width: 120px"
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

    <RouterLink
      v-if="props.sectionRoute"
      aria-label="View all time entries"
      class="focus-visible:ring-brand absolute inset-0 z-10 rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      data-testid="dashboard-recent-entries-nav"
      :to="props.sectionRoute"
      @keydown.space.prevent="emit('activate')"
    />
  </div>
</template>
