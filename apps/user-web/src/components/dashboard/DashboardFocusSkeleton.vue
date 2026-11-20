<script setup lang="ts">
import Skeleton from "primevue/skeleton";
</script>

<template>
  <div class="grid gap-4 xl:grid-cols-2">
    <div class="bg-app-bg flex flex-col gap-3 rounded-lg p-4">
      <Skeleton
        width="5rem"
        height="0.875rem"
      />
      <Skeleton
        width="11rem"
        height="1.75rem"
      />
      <Skeleton
        width="12rem"
        height="0.875rem"
      />
      <Skeleton
        width="100%"
        height="0.5rem"
      />
      <Skeleton
        width="11rem"
        height="0.875rem"
      />
    </div>
    <div class="bg-app-bg flex flex-col gap-3 rounded-lg p-4">
      <Skeleton
        width="4.5rem"
        height="0.875rem"
      />
      <Skeleton
        width="13rem"
        height="1.75rem"
      />
      <Skeleton
        width="11rem"
        height="0.875rem"
      />
      <Skeleton
        width="100%"
        height="0.5rem"
      />
      <Skeleton
        width="9rem"
        height="0.875rem"
      />
    </div>
  </div>
</template>
