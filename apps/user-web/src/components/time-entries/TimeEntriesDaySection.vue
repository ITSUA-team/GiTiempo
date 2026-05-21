<script setup lang="ts">
import { PencilSquareIcon, TrashIcon } from '@heroicons/vue/24/outline';
import Button from "primevue/button";
import Column from "primevue/column";

import type { TimeEntryResponse } from "@gitiempo/shared";
import {
  ManagementTableRowAction,
  ManagementTableShell,
  MobileRecordCard,
  managementTableColumnPt,
  useIsMobileViewport,
  type ManagementTableColumn,
} from "@gitiempo/web-shared";

import type { TimeEntriesDayGroup } from "@/composables/useTimeEntriesPage";

const props = defineProps<{
  // eslint-disable-next-line no-unused-vars
  formatDuration: (entry: TimeEntryResponse) => string;
  // eslint-disable-next-line no-unused-vars
  formatTimeRange: (entry: TimeEntryResponse) => string;
  group: TimeEntriesDayGroup;
  isDeletingEntry: string | null;
  showHeader: boolean;
}>();

const emit = defineEmits<{
  createForDay: [day: string];
  deleteEntry: [entry: TimeEntryResponse];
  editEntry: [entry: TimeEntryResponse];
}>();
const isMobileViewport = useIsMobileViewport();

const projectColumnWidth = '12rem';
const timeColumnWidth = '10rem';
const durationColumnWidth = '7rem';
const actionsColumnWidth = '7rem';

const columns = [
  { key: 'task', label: 'Task', width: 'fill' },
  { key: 'project', label: 'Project', width: 192 },
  { key: 'time', label: 'Time', width: 160 },
  { key: 'duration', label: 'Duration', width: 112 },
  { key: 'actions', label: 'Actions', width: 112, align: 'end' },
] satisfies ManagementTableColumn[];

function getEntryRowClass(entry: TimeEntryResponse): string {
  return entry.endedAt === null ? "bg-accent-tint" : "bg-surface hover:bg-app-bg";
}
</script>

<template>
  <section class="flex flex-col gap-3">
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-text-dark text-base font-semibold">
        {{ props.group.heading }}
      </h2>
      <Button
        :data-testid="`time-entries-day-create-${props.group.dateKey}`"
        label="+ New time entry"
        severity="secondary"
        variant="outlined"
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
        <div class="flex min-w-0 flex-col gap-1">
          <p class="text-text-dark truncate text-sm font-medium">
            {{ entry.task.title }}
          </p>
          <p
            v-if="entry.description"
            class="text-text-muted truncate text-xs"
          >
            {{ entry.description }}
          </p>
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

        <template
          v-if="entry.endedAt !== null"
          #actions
        >
          <ManagementTableRowAction
            :data-testid="`time-entry-mobile-edit-${entry.id}`"
            :icon="PencilSquareIcon"
            label="Edit"
            @click="emit('editEntry', entry)"
          />
          <ManagementTableRowAction
            :data-testid="`time-entry-mobile-delete-${entry.id}`"
            :icon="TrashIcon"
            label="Delete"
            :loading="props.isDeletingEntry === entry.id"
            tone="destructive"
            @click="emit('deleteEntry', entry)"
          />
        </template>
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
      shell-class="border-divider overflow-hidden rounded-lg border bg-surface"
      :show-header="props.showHeader"
      table-class="min-w-[740px] w-full table-fixed border-collapse"
      table-container-class="overflow-auto rounded-none border-none"
      :value="props.group.items"
    >
      <Column :pt="managementTableColumnPt">
        <template #body="{ data: entry }">
          <div class="flex min-w-0 flex-col">
            <p class="text-text-dark truncate text-sm font-medium">
              {{ entry.task.title }}
            </p>
            <p
              v-if="entry.description"
              class="text-text-muted truncate text-xs"
            >
              {{ entry.description }}
            </p>
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

      <Column
        :pt="managementTableColumnPt"
        :style="{ width: actionsColumnWidth }"
      >
        <template #body="{ data: entry }">
          <div class="flex items-center justify-end gap-2">
            <p
              v-if="entry.endedAt === null"
              class="text-text-muted text-xs"
            >
              Stop from the top bar
            </p>
            <template v-else>
              <ManagementTableRowAction
                :data-testid="`time-entry-edit-${entry.id}`"
                :icon="PencilSquareIcon"
                label="Edit"
                @click="emit('editEntry', entry)"
              />
              <ManagementTableRowAction
                :data-testid="`time-entry-delete-${entry.id}`"
                :icon="TrashIcon"
                label="Delete"
                :loading="props.isDeletingEntry === entry.id"
                tone="destructive"
                @click="emit('deleteEntry', entry)"
              />
            </template>
          </div>
        </template>
      </Column>
    </ManagementTableShell>
  </section>
</template>
