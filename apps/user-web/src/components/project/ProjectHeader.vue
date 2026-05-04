<script setup lang="ts">
  import type { ProjectResponse } from '@gitiempo/shared';

  defineProps<{
    project: ProjectResponse;
    totalHoursFormatted: string;
  }>();
</script>

<template>
  <div class="bg-surface shadow-card rounded-lg p-6">
    <h1 class="text-text-dark text-2xl font-semibold">
      {{ project.name }}
    </h1>
    <div class="mt-4 flex flex-col gap-2">
      <div class="flex items-center gap-2">
        <span class="text-text-muted text-[13px] font-medium">
          Total Tracked:
        </span>
        <span class="text-brand text-lg font-semibold">{{
          totalHoursFormatted
        }}</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-text-muted text-[13px] font-medium">Source:</span>
        <span class="text-text-dark text-sm">{{
          project.source === 'github' ? 'GitHub' : 'Manual'
        }}</span>
      </div>
    </div>
  </div>
</template>
