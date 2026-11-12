<script setup lang="ts">
defineProps<{
  projectName: string;
  durationLabel: string;
  timeRangeLabel: string;
  truncateRange?: boolean;
}>();
</script>

<template>
  <div class="grid grid-cols-2 gap-3">
    <div class="flex min-w-0 flex-col gap-1">
      <span class="text-text-muted text-xs">Project</span>
      <span class="text-text-dark truncate text-[13px] font-medium">
        {{ projectName }}
      </span>
    </div>

    <div class="flex min-w-0 flex-col gap-1 text-right">
      <span class="text-text-muted text-xs">Duration</span>
      <span class="text-text-dark text-[13px] font-semibold tabular-nums">
        {{ durationLabel }}
      </span>
    </div>

    <div class="col-span-2 flex min-w-0 flex-col gap-1">
      <span class="text-text-muted text-xs">Range</span>
      <span
        class="text-text-dark text-[13px] font-medium"
        :class="truncateRange ? 'truncate' : undefined"
      >
        {{ timeRangeLabel }}
      </span>
    </div>
  </div>
</template>
