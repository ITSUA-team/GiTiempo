<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<template>
  <div class="bg-app-bg border-divider flex w-full flex-col gap-2.5 border-t p-4 box-border">
    <span class="text-text-dark font-sans text-[13px] font-semibold leading-none">{{ title }}</span>
    <slot />
  </div>
</template>
