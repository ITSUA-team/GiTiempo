<script setup lang="ts">
import { ManagementTableEmptyState } from '@gitiempo/web-shared';
import Button from 'primevue/button';

import type {
  AdminDashboardActivityRow,
  AdminDashboardActivityType,
} from '@/lib/admin-dashboard-view-model';

withDefaults(
  defineProps<{
    canViewAll?: boolean;
    expanded?: boolean;
    rows: AdminDashboardActivityRow[];
  }>(),
  {
    canViewAll: false,
    expanded: false,
  },
);

const emit = defineEmits<{
  toggleViewAll: [];
}>();

const dotClassByType: Record<AdminDashboardActivityType, string> = {
  invite: 'bg-status-warn-text',
  member: 'bg-text-muted',
  project: 'bg-brand',
  time: 'bg-status-active-text',
};

function getDotClass(type: AdminDashboardActivityType): string {
  return dotClassByType[type];
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <h2 class="text-text-dark text-lg font-semibold">
      Recent Activity
    </h2>

    <ManagementTableEmptyState
      v-if="rows.length === 0"
      title="No recent activity"
      description="Workspace events will appear here after members, projects, invites, or tracked time update."
    />

    <ul
      v-else
      class="flex flex-col"
    >
      <li
        v-for="(row, index) in rows"
        :key="row.id"
        class="border-divider flex min-h-12 items-center gap-3 py-3"
        :class="index > 0 ? 'border-t' : undefined"
      >
        <span
          v-tooltip.top="`${row.typeLabel} activity`"
          role="img"
          class="size-2 shrink-0 rounded-full"
          :class="getDotClass(row.type)"
          :aria-label="`${row.typeLabel} activity`"
        />
        <span class="text-text-dark min-w-0 flex-1 truncate text-[13px] font-normal">
          {{ row.activity }}
        </span>
        <span class="text-text-muted shrink-0 text-xs font-normal">
          {{ row.timeLabel }}
        </span>
      </li>
    </ul>

    <div
      v-if="canViewAll"
      class="flex justify-center pt-1"
    >
      <Button
        :label="expanded ? 'Show less' : 'View all activity'"
        variant="text"
        :pt="{
          root: 'h-auto min-h-0 rounded-sm px-2 py-1 text-brand hover:bg-accent-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
          label: 'text-[13px] font-semibold text-brand',
        }"
        @click="emit('toggleViewAll')"
      />
    </div>
  </div>
</template>
