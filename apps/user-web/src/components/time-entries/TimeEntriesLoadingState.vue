<script setup lang="ts">
import Skeleton from "primevue/skeleton";
import { SurfaceCard } from "@gitiempo/web-shared";

const filterSkeletons = ["7rem", "4.5rem", "3rem"] as const;
const groupSkeletons = [
  {
    headingWidth: "10rem",
    primaryWidth: "70%",
    secondaryWidth: "82%",
  },
  {
    headingWidth: "11rem",
    primaryWidth: "62%",
    secondaryWidth: "76%",
  },
] as const;
</script>

<template>
  <div
    class="flex flex-col gap-6"
    data-testid="time-entries-loading"
  >
    <SurfaceCard
      body-class="grid gap-3 xl:grid-cols-[220px_220px_minmax(0,1fr)]"
      data-testid="time-entries-loading-filters"
      padding-class="p-6"
    >
      <div
        v-for="width in filterSkeletons"
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
      class="flex flex-col gap-6"
      data-testid="time-entries-loading-groups"
    >
      <section
        v-for="group in groupSkeletons"
        :key="group.headingWidth"
        class="flex flex-col gap-3"
        data-testid="time-entries-loading-day"
      >
        <div class="flex items-center justify-between gap-3">
          <Skeleton
            :width="group.headingWidth"
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
          padding-class="p-6"
        >
          <div
            class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px_96px] sm:items-center"
            data-testid="time-entries-loading-entry-row"
          >
            <Skeleton
              :width="group.primaryWidth"
              height="1rem"
            />
            <Skeleton height="3.25rem" />
            <Skeleton
              :width="group.secondaryWidth"
              height="3.25rem"
            />
          </div>
        </SurfaceCard>
      </section>
    </div>

    <SurfaceCard
      border
      body-class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      data-testid="time-entries-loading-pagination"
      padding-class="p-6"
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
