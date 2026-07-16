<script setup lang="ts">
import Skeleton from "primevue/skeleton";
</script>

<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
    <Skeleton
      width="22.5rem"
      height="1rem"
    />
    <Skeleton
      width="11.25rem"
      height="1rem"
    />
    <Skeleton
      width="11.25rem"
      height="1rem"
    />
  </div>

  <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
    <Skeleton
      width="22.5rem"
      height="2.75rem"
    />
    <Skeleton
      width="11.25rem"
      height="2.75rem"
    />
    <Skeleton
      width="11.25rem"
      height="2.75rem"
    />
  </div>

  <div class="flex flex-col gap-6">
    <div
      v-for="index in 2"
      :key="index"
      class="flex flex-col gap-3"
    >
      <div class="flex items-center justify-between gap-3">
        <div class="flex flex-col gap-2">
          <Skeleton
            width="10rem"
            height="1.25rem"
          />
          <Skeleton
            width="6rem"
            height="0.875rem"
          />
        </div>
        <Skeleton
          width="6.5rem"
          height="2rem"
        />
      </div>

      <div class="border-divider bg-surface-primary flex flex-col rounded-lg border">
        <Skeleton
          width="100%"
          height="2.75rem"
        />
        <Skeleton
          width="100%"
          height="3.25rem"
        />
        <Skeleton
          width="100%"
          height="3.25rem"
        />
      </div>
    </div>
  </div>
</template>
