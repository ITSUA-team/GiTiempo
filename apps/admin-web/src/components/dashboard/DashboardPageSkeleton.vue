<script setup lang="ts">
import { SurfaceCard } from '@gitiempo/web-shared';
import Skeleton from 'primevue/skeleton';
</script>

<template>
  <div
    aria-label="Loading dashboard content"
    class="flex flex-col gap-6"
    role="status"
  >
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Skeleton
        v-for="index in 4"
        :key="index"
        height="6rem"
        border-radius="8px"
      />
    </div>

    <SurfaceCard padding-class="p-5">
      <div class="flex flex-col gap-4">
        <Skeleton
          width="8.5rem"
          height="1.375rem"
          border-radius="6px"
        />

        <div class="flex flex-col">
          <div
            v-for="index in 5"
            :key="index"
            class="border-divider flex min-h-12 items-center gap-3 py-3"
            :class="index > 1 ? 'border-t' : undefined"
          >
            <Skeleton
              size="0.5rem"
              shape="circle"
            />
            <Skeleton
              class="flex-1"
              height="0.875rem"
              border-radius="4px"
            />
            <Skeleton
              width="4.5rem"
              height="0.75rem"
              border-radius="4px"
            />
          </div>
        </div>
      </div>
    </SurfaceCard>
  </div>
</template>
