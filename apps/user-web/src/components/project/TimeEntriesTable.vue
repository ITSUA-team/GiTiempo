<script setup lang="ts">
  import DataTable from 'primevue/datatable';
  import Column from 'primevue/column';
  import type { TimeEntryResponse } from '@gitiempo/shared';
  import { useProjectFormatters } from '@/composables/useProjectFormatters';

  defineProps<{
    timeEntries: TimeEntryResponse[];
    pagination: { page: number; limit: number; total: number };
  }>();

  const emit = defineEmits<{
    pageChange: [event: { page: number; rows: number }];
  }>();

  const { formatDate, formatTime, formatDuration } = useProjectFormatters();
</script>

<template>
  <div class="bg-surface shadow-card rounded-lg">
    <div class="border-divider border-b px-6 py-4">
      <h2 class="text-text-dark text-lg font-semibold">Time Entries</h2>
    </div>

    <div
      v-if="timeEntries.length === 0"
      class="flex flex-col items-center gap-3 px-6 py-8 text-center"
    >
      <p class="text-text-dark text-base font-semibold">No time entries yet</p>
      <p class="text-text-muted text-sm">
        Time entries for this project will appear here.
      </p>
    </div>

    <DataTable
      v-else
      :value="timeEntries"
      striped-rows
      responsive-layout="scroll"
      :paginator="pagination.total > pagination.limit"
      :rows="pagination.limit"
      :total-records="pagination.total"
      :pt="{
        headerCell:
          'bg-app-bg text-[13px] font-medium uppercase tracking-wide text-text-dark',
        bodyRow: 'border-b border-divider h-12 hover:bg-app-bg',
        bodyCell: 'text-sm',
      }"
      @page="(e) => emit('pageChange', e)"
    >
      <Column header="Date">
        <template #body="{ data }">
          <div class="text-sm">
            {{ formatDate(data.startedAt) }}
          </div>
        </template>
      </Column>
      <Column header="Task">
        <template #body="{ data }">
          <div class="text-sm">
            {{ data.task.title }}
          </div>
        </template>
      </Column>
      <Column header="Time Range">
        <template #body="{ data }">
          <div class="text-sm">
            {{ formatTime(data.startedAt) }} -
            {{ data.endedAt ? formatTime(data.endedAt) : 'Ongoing' }}
          </div>
        </template>
      </Column>
      <Column
        header="Duration"
        header-class="text-right"
        body-class="text-right"
      >
        <template #body="{ data }">
          <div class="text-sm">
            {{ formatDuration(data.durationSeconds) }}
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>
