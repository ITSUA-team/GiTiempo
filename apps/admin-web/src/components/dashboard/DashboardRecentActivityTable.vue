<script setup lang="ts">
import { ManagementTableEmptyState, SurfaceCard } from '@gitiempo/web-shared';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Tag from 'primevue/tag';

import type {
  AdminDashboardActivityRow,
  AdminDashboardActivityType,
} from '@/lib/admin-dashboard-view-model';

defineProps<{
  rows: AdminDashboardActivityRow[];
}>();

const dotClassByType: Record<AdminDashboardActivityType, string> = {
  invite: 'bg-status-warn-text',
  member: 'bg-text-muted',
  project: 'bg-brand',
  time: 'bg-status-active-text',
};

const tagSeverityByType: Record<
  AdminDashboardActivityType,
  'info' | 'secondary' | 'success' | 'warn'
> = {
  invite: 'warn',
  member: 'secondary',
  project: 'info',
  time: 'success',
};

function getDotClass(type: AdminDashboardActivityType): string {
  return dotClassByType[type];
}

function getTagSeverity(
  type: AdminDashboardActivityType,
): 'info' | 'secondary' | 'success' | 'warn' {
  return tagSeverityByType[type];
}
</script>

<template>
  <SurfaceCard padding-class="p-5">
    <div class="flex flex-col gap-4">
      <h2 class="text-text-dark text-lg font-semibold">
        Recent Activity
      </h2>

      <div class="overflow-x-auto">
        <DataTable
          :value="rows"
          data-key="id"
          :show-headers="false"
          table-style="min-width: 42rem"
          :pt="{
            root: { class: 'border-none bg-transparent' },
            tableContainer: { class: 'overflow-visible rounded-none border-none' },
            table: { class: 'w-full table-fixed border-collapse' },
            bodyRow: { class: 'h-12 border-t border-divider bg-transparent hover:bg-app-bg' },
            emptyMessageCell: { class: 'border-t border-divider p-0' },
          }"
        >
          <Column>
            <template #body="{ data }">
              <div class="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden="true"
                  class="size-2 shrink-0 rounded-full"
                  :class="getDotClass(data.type)"
                />
                <span class="text-text-dark truncate text-[13px] font-normal">
                  {{ data.activity }}
                </span>
              </div>
            </template>
          </Column>

          <Column style="width: 8rem">
            <template #body="{ data }">
              <Tag
                :value="data.typeLabel"
                :severity="getTagSeverity(data.type)"
                :pt="{
                  root: 'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium leading-none',
                }"
              />
            </template>
          </Column>

          <Column style="width: 7rem">
            <template #body="{ data }">
              <span class="text-text-muted text-xs font-normal">
                {{ data.timeLabel }}
              </span>
            </template>
          </Column>

          <template #empty>
            <ManagementTableEmptyState
              title="No recent activity"
              description="Workspace events will appear here after members, projects, invites, or tracked time update."
            />
          </template>
        </DataTable>
      </div>
    </div>
  </SurfaceCard>
</template>
