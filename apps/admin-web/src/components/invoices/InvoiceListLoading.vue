<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
</script>

<template>
  <div
    role="status"
    class="border-divider bg-surface-primary flex flex-col gap-4 rounded-lg border p-5"
  >
    <span class="text-sm font-medium">Loading invoices…</span>
    <Skeleton
      v-for="row in 3"
      :key="row"
      width="100%"
      height="36px"
    />
  </div>
</template>
