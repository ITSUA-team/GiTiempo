<script setup lang="ts">
  defineProps<{
    activeProjects: number;
    privateProjects: number;
    publicProjects: number;
  }>();
</script>

<template>
  <div class="grid grid-cols-3 gap-4">
    <div class="bg-surface shadow-card flex h-24 flex-col gap-2 rounded-lg p-4">
      <span class="text-text-muted text-[13px] font-medium"
        >Active Projects</span
      >
      <span class="text-text-dark text-[28px] font-semibold leading-none">
        {{ activeProjects }}
      </span>
    </div>
    <div class="bg-surface shadow-card flex h-24 flex-col gap-2 rounded-lg p-4">
      <span class="text-text-muted text-[13px] font-medium">Private</span>
      <span class="text-text-dark text-[28px] font-semibold leading-none">
        {{ privateProjects }}
      </span>
    </div>
    <div class="bg-surface shadow-card flex h-24 flex-col gap-2 rounded-lg p-4">
      <span class="text-text-muted text-[13px] font-medium">Public</span>
      <span class="text-text-dark text-[28px] font-semibold leading-none">
        {{ publicProjects }}
      </span>
    </div>
  </div>
</template>
