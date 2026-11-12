<script setup lang="ts">
import Skeleton from "primevue/skeleton";
import { useIsMobileViewport } from "@gitiempo/web-shared";

const isMobileViewport = useIsMobileViewport();
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

      <div
        v-if="isMobileViewport"
        class="flex flex-col gap-3"
      >
        <div
          v-for="rowIndex in 3"
          :key="rowIndex"
          class="border-divider bg-surface-primary flex flex-col gap-2 rounded-lg border p-4"
        >
          <div class="flex min-h-8 min-w-0 items-center gap-3">
            <Skeleton
              width="3rem"
              height="2rem"
            />
            <Skeleton
              width="70%"
              height="1rem"
            />
          </div>

          <div class="flex items-center justify-between gap-3">
            <Skeleton
              width="4rem"
              height="1.75rem"
            />
            <Skeleton
              width="5.5rem"
              height="0.875rem"
            />
          </div>
        </div>
      </div>

      <div
        v-else
        class="border-divider bg-surface-primary flex flex-col rounded-lg border"
      >
        <div
          v-for="rowIndex in 3"
          :key="rowIndex"
          class="border-divider flex h-[52px] items-center border-t px-3 first:border-t-0"
        >
          <Skeleton
            width="100%"
            height="1rem"
          />
        </div>
      </div>
    </div>
  </div>
</template>
