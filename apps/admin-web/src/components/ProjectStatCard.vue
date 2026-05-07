<script setup lang="ts">
defineProps<{
  label: string;
  value: number;
}>();
</script>

<template>
  <div class="bg-surface shadow-card flex h-full flex-1 flex-col gap-2 rounded-lg p-4">
    <span class="text-text-muted text-[13px] font-medium">{{ label }}</span>
    <span class="text-text-dark text-[28px] font-semibold">{{ value }}</span>
  </div>
</template>
