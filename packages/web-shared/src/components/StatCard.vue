<script setup lang="ts">
withDefaults(
  defineProps<{
    description?: string;
    label: string;
    value: number | string;
    /**
     * Truncate the value to one line with an ellipsis. Off by default so a
     * numeric value is never clipped; opt in for a free-text value (e.g. a
     * project name) that can overflow a narrow card.
     */
    truncateValue?: boolean;
  }>(),
  { truncateValue: false },
);
</script>

<template>
  <div class="bg-surface-primary shadow-card flex h-full min-w-0 flex-1 flex-col gap-2 rounded-lg p-3.5 sm:p-4">
    <span class="text-text-muted truncate text-[13px] font-medium">{{ label }}</span>
    <span
      class="text-text-dark text-[22px] font-semibold sm:text-[28px]"
      :class="{ truncate: truncateValue }"
    >{{ value }}</span>
    <span
      v-if="description"
      class="text-text-muted truncate text-xs font-normal"
    >{{ description }}</span>
  </div>
</template>
