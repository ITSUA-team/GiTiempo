<script setup lang="ts">
import Skeleton from "primevue/skeleton";
import { SurfaceCard } from "@gitiempo/web-shared";
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="grid gap-4 xl:grid-cols-3">
      <SurfaceCard
        v-for="index in 3"
        :key="index"
        body-class="flex min-h-[108px] flex-col gap-3"
        padding-class="p-4"
      >
        <Skeleton
          width="5rem"
          height="1rem"
        />
        <Skeleton
          width="8rem"
          height="2rem"
        />
        <Skeleton
          width="10rem"
          height="0.875rem"
        />
      </SurfaceCard>
    </div>

    <SurfaceCard
      body-class="flex flex-col gap-4"
      padding-class="p-6"
    >
      <div class="flex items-center justify-between gap-4">
        <div class="flex flex-col gap-2">
          <Skeleton
            width="10rem"
            height="1.25rem"
          />
          <Skeleton
            width="18rem"
            height="0.875rem"
          />
        </div>
        <Skeleton
          width="4.5rem"
          height="1.75rem"
        />
      </div>

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
    </SurfaceCard>

    <SurfaceCard
      body-class="flex flex-col gap-4"
      padding-class="p-6"
    >
      <div class="flex items-center justify-between gap-4">
        <div class="flex flex-col gap-2">
          <Skeleton
            width="11rem"
            height="1.25rem"
          />
          <Skeleton
            width="14rem"
            height="0.875rem"
          />
        </div>
        <Skeleton
          width="4rem"
          height="1rem"
        />
      </div>

      <div class="border-divider overflow-hidden rounded-md border">
        <div class="bg-app-bg grid grid-cols-[minmax(0,1fr)_11rem_8rem_8rem] gap-2 px-3 py-3">
          <Skeleton
            width="4rem"
            height="0.875rem"
          />
          <Skeleton
            width="4.5rem"
            height="0.875rem"
          />
          <Skeleton
            width="3.5rem"
            height="0.875rem"
          />
          <Skeleton
            width="4rem"
            height="0.875rem"
          />
        </div>

        <div
          v-for="index in 4"
          :key="index"
          class="border-divider grid grid-cols-[minmax(0,1fr)_11rem_8rem_8rem] gap-2 border-t px-3 py-4"
        >
          <Skeleton
            width="11rem"
            height="1rem"
          />
          <Skeleton
            width="8rem"
            height="1rem"
          />
          <Skeleton
            width="6rem"
            height="1rem"
          />
          <Skeleton
            width="4.5rem"
            height="1rem"
          />
        </div>
      </div>
    </SurfaceCard>
  </div>
</template>
