<script setup lang="ts">
defineProps<{
  description?: string;
  label: string;
  value: number | string;
}>();
</script>

<template>
  <div class="bg-surface-primary shadow-card flex h-full min-w-0 flex-1 flex-col gap-2 rounded-lg p-3.5 sm:p-4">
    <span class="text-text-muted truncate text-[13px] font-medium">{{ label }}</span>
    <span class="text-text-dark truncate text-[22px] font-semibold sm:text-[28px]">{{ value }}</span>
    <span
      v-if="description"
      class="text-text-muted truncate text-xs font-normal"
    >{{ description }}</span>
  </div>
</template>
