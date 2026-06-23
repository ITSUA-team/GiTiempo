<script setup lang="ts">
import Skeleton from "primevue/skeleton";
import { SurfaceCard } from "@gitiempo/web-shared";
</script>

<template>
  <div
    class="flex flex-col gap-6"
    data-testid="time-entries-loading"
  >
    <SurfaceCard
      body-class="grid gap-3 xl:grid-cols-[220px_220px_minmax(0,1fr)]"
      data-testid="time-entries-loading-filters"
      padding-class="p-4"
    >
      <div
        v-for="width in ['7rem', '4.5rem', '3rem']"
        :key="width"
        class="flex flex-col gap-1.5"
      >
        <Skeleton
          :width="width"
          height="0.875rem"
        />
        <Skeleton height="2.375rem" />
      </div>
    </SurfaceCard>

    <div
      class="flex flex-col gap-5"
      data-testid="time-entries-loading-groups"
    >
      <section
        v-for="groupIndex in 2"
        :key="groupIndex"
        class="flex flex-col gap-3"
        data-testid="time-entries-loading-day"
      >
        <div class="flex items-center justify-between gap-3">
          <Skeleton
            :width="groupIndex === 1 ? '10rem' : '11rem'"
            height="1.25rem"
          />
          <Skeleton
            width="2.375rem"
            height="2.375rem"
          />
        </div>

        <SurfaceCard
          border
          body-class="flex flex-col gap-3"
          padding-class="p-3 sm:p-4"
        >
          <Skeleton
            :width="groupIndex === 1 ? '70%' : '62%'"
            height="1rem"
          />
          <Skeleton
            height="3.25rem"
          />
          <Skeleton
            :width="groupIndex === 1 ? '82%' : '76%'"
            height="3.25rem"
          />
        </SurfaceCard>
      </section>
    </div>

    <SurfaceCard
      border
      body-class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      data-testid="time-entries-loading-pagination"
      padding-class="p-3 sm:p-4"
    >
      <Skeleton
        width="9rem"
        height="0.875rem"
      />
      <div class="flex items-center gap-2">
        <Skeleton
          v-for="index in 3"
          :key="index"
          width="2.25rem"
          height="2.25rem"
        />
      </div>
    </SurfaceCard>
  </div>
</template>
