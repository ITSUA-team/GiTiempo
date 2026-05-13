<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
}>();
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <div class="flex flex-col gap-1.5">
        <h1 class="text-text-dark text-[28px] font-semibold">
          {{ title }}
        </h1>
        <p class="text-text-muted text-sm font-normal">
          {{ description }}
        </p>
      </div>
      <div>
        <slot name="actions" />
      </div>
    </div>
    <div
      v-if="$slots.stats"
      class="flex h-24 gap-4"
    >
      <slot name="stats" />
    </div>
  </div>
</template>
