<script setup lang="ts">
import Button from "primevue/button";
import Column from "primevue/column";
import DataTable from "primevue/datatable";

import type { TimeEntryResponse } from "@gitiempo/shared";
import { SurfaceCard } from "@gitiempo/web-shared";

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

function getEntryRowClass(entry: TimeEntryResponse): string {
  return entry.endedAt === null ? "bg-accent-tint" : "bg-surface";
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

    <SurfaceCard
      body-class="overflow-x-auto"
      border
      padding-class="p-0"
    >
      <DataTable
        :pt="{
          bodyCell: 'px-3 py-0',
          bodyRow: 'h-[52px]',
          columnHeaderContent: 'justify-start',
          headerCell: 'bg-app-bg border-b border-divider px-3 py-3 text-[13px] font-medium text-text-muted',
          table: 'w-full',
        }"
        :row-class="getEntryRowClass"
        :show-headers="props.showHeader"
        :value="props.group.items"
        class="w-full"
        data-key="id"
        row-hover
        table-style="min-width: 740px"
      >
        <Column header="Task">
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

        <Column header="Project">
          <template #body="{ data: entry }">
            <p class="text-text-dark truncate text-sm font-medium">
              {{ entry.project.name }}
            </p>
          </template>
        </Column>

        <Column header="Time">
          <template #body="{ data: entry }">
            <p class="text-text-dark text-sm font-medium">
              {{ props.formatTimeRange(entry) }}
            </p>
          </template>
        </Column>

        <Column header="Duration">
          <template #body="{ data: entry }">
            <p class="text-text-dark text-sm font-medium tabular-nums">
              {{ props.formatDuration(entry) }}
            </p>
          </template>
        </Column>

        <Column>
          <template #body="{ data: entry }">
            <div class="flex items-center justify-center gap-2 py-2">
              <p
                v-if="entry.endedAt === null"
                class="text-text-muted text-xs"
              >
                Stop from the top bar
              </p>
              <template v-else>
                <Button
                  :data-testid="`time-entry-edit-${entry.id}`"
                  label="Edit"
                  severity="secondary"
                  size="small"
                  variant="text"
                  @click="emit('editEntry', entry)"
                />
                <Button
                  :data-testid="`time-entry-delete-${entry.id}`"
                  label="Delete"
                  severity="danger"
                  size="small"
                  variant="text"
                  :loading="props.isDeletingEntry === entry.id"
                  @click="emit('deleteEntry', entry)"
                />
              </template>
            </div>
          </template>
        </Column>
      </DataTable>
    </SurfaceCard>
  </section>
</template>
