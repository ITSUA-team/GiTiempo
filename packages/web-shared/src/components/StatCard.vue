<script setup lang="ts">
defineProps<{
  label: string;
  value: number | string;
}>();
</script>

<template>
  <div class="flex h-full flex-1 flex-col gap-2 rounded-lg bg-surface p-4 shadow-card">
    <span class="text-[13px] font-medium text-text-muted">{{ label }}</span>
    <span class="text-[28px] font-semibold text-text-dark">{{ value }}</span>
  </div>
</template>
