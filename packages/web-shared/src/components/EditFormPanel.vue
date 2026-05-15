<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<template>
  <div class="border-divider bg-app-bg box-border flex w-full flex-col gap-2.5 border-t p-4">
    <span class="text-text-dark font-sans text-[13px] leading-none font-semibold">{{ title }}</span>
    <slot />
  </div>
</template>
