<script setup lang="ts">
withDefaults(
  defineProps<{
    description: string;
    paddingClass?: string;
    title: string;
  }>(),
  { paddingClass: "py-10" },
);
</script>

<template>
  <div
    class="flex flex-col items-center gap-2"
    :class="paddingClass"
  >
    <span class="text-text-dark text-[14px] font-semibold">{{ title }}</span>
    <span class="text-text-muted text-[13px]">{{ description }}</span>
  </div>
</template>
