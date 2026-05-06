<script setup lang="ts">
export interface StatItem {
  label: string;
  value: string | number;
}

defineProps<{
  title: string;
  description?: string;
  stats?: StatItem[];
}>();
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Heading row -->
    <div class="flex items-center justify-between">
      <div class="flex flex-col gap-[6px]">
        <h1 class="text-[28px] font-semibold text-text-dark">{{ title }}</h1>
        <p v-if="description" class="text-sm font-normal text-text-muted">
          {{ description }}
        </p>
      </div>
      <slot />
    </div>

    <!-- Stat cards row -->
    <div v-if="stats && stats.length" class="flex gap-4 h-[96px]">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="flex-1 rounded-lg shadow-card bg-surface p-4 flex flex-col gap-2"
      >
        <span class="text-[13px] font-medium text-text-muted">{{ stat.label }}</span>
        <span class="text-[28px] font-semibold text-text-dark">{{ stat.value }}</span>
      </div>
    </div>
  </div>
</template>
