<script setup lang="ts">
import Skeleton from "primevue/skeleton";

import SurfaceCard from "@/components/layout/SurfaceCard.vue";
</script>

<template>
  <div
    class="flex max-w-[620px] flex-col gap-6"
    data-testid="profile-loading"
  >
    <SurfaceCard
      body-class="flex flex-col gap-4"
      data-testid="profile-form-loading"
    >
      <div class="flex items-center gap-4">
        <Skeleton
          shape="circle"
          size="2.5rem"
        />
        <div class="flex flex-col gap-2">
          <Skeleton
            width="10rem"
            height="1rem"
          />
          <Skeleton
            width="7rem"
            height="0.75rem"
          />
        </div>
      </div>

      <div class="grid gap-4">
        <div
          v-for="field in ['display-name', 'email']"
          :key="field"
          class="flex flex-col gap-1"
        >
          <Skeleton
            width="5.5rem"
            height="0.875rem"
          />
          <Skeleton height="2.625rem" />
        </div>

        <div class="flex justify-end gap-2">
          <Skeleton
            width="5rem"
            height="2.125rem"
          />
          <Skeleton
            width="7.5rem"
            height="2.125rem"
          />
        </div>
      </div>
    </SurfaceCard>

    <SurfaceCard
      body-class="flex flex-col gap-4"
      data-testid="profile-github-loading"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-2">
          <Skeleton
            width="11rem"
            height="1.25rem"
          />
          <Skeleton
            width="min(100%, 26rem)"
            height="0.875rem"
          />
        </div>
        <Skeleton
          width="5.5rem"
          height="1.75rem"
        />
      </div>

      <div class="flex flex-col gap-3">
        <Skeleton height="1rem" />
        <Skeleton
          width="52%"
          height="1.75rem"
        />
        <Skeleton height="3.5rem" />
        <Skeleton height="2rem" />
      </div>
    </SurfaceCard>
  </div>
</template>
