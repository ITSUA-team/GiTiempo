<script setup lang="ts">
import Button from "primevue/button";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import { SectionHeader, SurfaceCard } from "@gitiempo/web-shared";

import type { DashboardRecentEntryRow } from "@/composables/useDashboardOverview";

const props = defineProps<{
  entries: DashboardRecentEntryRow[];
}>();

const emit = defineEmits<{
  viewAll: [];
}>();

const projectColumnWidth = "11rem";
const rangeColumnWidth = "8rem";
const durationColumnWidth = "8rem";

function getRowClass(entry: DashboardRecentEntryRow): string {
  return entry.isHighlighted ? "bg-accent-tint" : "bg-surface";
}
</script>

<template>
  <SurfaceCard
    body-class="flex flex-col gap-4"
    padding-class="p-5"
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

    <div class="border-divider overflow-x-auto rounded-md border">
      <DataTable
        :pt="{
          bodyCell: 'px-3 py-0',
          bodyRow: 'h-12 border-t border-divider',
          columnHeaderContent: 'justify-start',
          headerCell: 'bg-app-bg px-3 py-3 text-[13px] font-medium text-text-dark',
          table: 'w-full',
        }"
        :row-class="getRowClass"
        :value="props.entries"
        class="w-full"
        data-key="id"
        table-style="min-width: 740px; table-layout: fixed"
      >
        <Column header="Task">
          <template #body="{ data: entry }">
            <p class="text-text-dark truncate text-sm font-medium">
              {{ entry.taskTitle }}
            </p>
          </template>
        </Column>

        <Column
          header="Project"
          :style="{ width: projectColumnWidth }"
        >
          <template #body="{ data: entry }">
            <p class="text-text-muted truncate text-[13px]">
              {{ entry.projectName }}
            </p>
          </template>
        </Column>

        <Column
          header="Range"
          :style="{ width: rangeColumnWidth }"
        >
          <template #body="{ data: entry }">
            <p class="text-text-muted text-[13px]">
              {{ entry.timeRangeLabel }}
            </p>
          </template>
        </Column>

        <Column
          header="Duration"
          :style="{ width: durationColumnWidth }"
        >
          <template #body="{ data: entry }">
            <p class="text-text-dark text-right text-[13px] font-semibold tabular-nums">
              {{ entry.durationLabel }}
            </p>
          </template>
        </Column>
      </DataTable>
    </div>
  </SurfaceCard>
</template>
