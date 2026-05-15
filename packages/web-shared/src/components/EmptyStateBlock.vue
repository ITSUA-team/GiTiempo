<script setup lang="ts">
defineProps<{
  description: string;
  title: string;
}>();
</script>

<template>
  <div class="flex flex-col items-center gap-2 py-10">
    <span class="text-text-dark text-[14px] font-semibold">{{ title }}</span>
    <span class="text-text-muted text-[13px]">{{ description }}</span>
  </div>
</template>
