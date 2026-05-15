<script setup lang="ts">
defineProps<{
  description?: string;
  label: string;
  value: number | string;
}>();
</script>

<template>
  <div class="bg-surface shadow-card flex h-full flex-1 flex-col gap-2 rounded-lg p-4">
    <span class="text-text-muted text-[13px] font-medium">{{ label }}</span>
    <span class="text-text-dark text-[28px] font-semibold">{{ value }}</span>
    <span
      v-if="description"
      class="text-text-muted text-xs font-normal"
    >{{ description }}</span>
  </div>
</template>
