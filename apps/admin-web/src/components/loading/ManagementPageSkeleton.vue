<script setup lang="ts">
import { SurfaceCard } from '@gitiempo/web-shared';
import Skeleton from 'primevue/skeleton';

type ManagementPageSkeletonVariant = 'members' | 'projects' | 'reports';

const props = defineProps<{
  variant: ManagementPageSkeletonVariant;
}>();

const skeletonConfig = {
  members: {
    actionWidth: '8.5rem',
    descriptionWidth: '24rem',
    filterCount: 0,
    statCount: 3,
    tableActionWidth: undefined,
    tableHeaderWidths: ['120px', '160px', '140px', '200px'],
  },
  projects: {
    actionWidth: '7.5rem',
    descriptionWidth: '22rem',
    filterCount: 0,
    statCount: 3,
    tableActionWidth: '16rem',
    tableHeaderWidths: ['140px', '220px', '120px', '120px', '150px'],
  },
  reports: {
    actionWidth: '6.875rem',
    descriptionWidth: '28rem',
    filterCount: 4,
    statCount: 4,
    tableActionWidth: '17.5rem',
    tableHeaderWidths: ['180px', '140px', '140px'],
  },
} as const;
</script>

<template>
  <div
    aria-label="Loading page content"
    class="flex flex-col gap-6"
    role="status"
  >
    <div class="flex flex-col gap-6">
      <div class="flex items-center justify-between">
        <div class="flex flex-col gap-1.5">
          <Skeleton
            width="10rem"
            height="2rem"
            border-radius="6px"
          />
          <Skeleton
            :width="skeletonConfig[props.variant].descriptionWidth"
            height="1rem"
            border-radius="6px"
          />
        </div>
        <Skeleton
          :width="skeletonConfig[props.variant].actionWidth"
          height="2.25rem"
          border-radius="6px"
        />
      </div>

      <div
        v-if="skeletonConfig[props.variant].filterCount > 0"
        class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_180px]"
      >
        <div
          v-for="index in skeletonConfig[props.variant].filterCount"
          :key="`filter-${index}`"
          class="flex flex-col gap-1.5"
        >
          <Skeleton
            width="5rem"
            height="0.875rem"
            border-radius="4px"
          />
          <Skeleton
            height="2.375rem"
            border-radius="6px"
          />
        </div>
      </div>

      <div
        class="grid gap-4"
        :class="props.variant === 'reports' ? 'sm:grid-cols-4' : 'sm:grid-cols-3'"
      >
        <Skeleton
          v-for="index in skeletonConfig[props.variant].statCount"
          :key="index"
          height="6rem"
          border-radius="8px"
        />
      </div>
    </div>

    <SurfaceCard padding-class="p-5">
      <div
        class="mb-4"
        :class="skeletonConfig[props.variant].tableActionWidth ? 'flex items-center justify-between' : undefined"
      >
        <Skeleton
          width="8rem"
          height="1.25rem"
          border-radius="6px"
        />
        <Skeleton
          v-if="skeletonConfig[props.variant].tableActionWidth"
          :width="skeletonConfig[props.variant].tableActionWidth"
          height="2.25rem"
          border-radius="6px"
        />
      </div>

      <div class="border-divider overflow-hidden rounded-[6px] border">
        <div class="bg-app-bg border-divider flex h-[44px] items-center gap-3 border-b px-3">
          <Skeleton
            class="flex-1"
            height="0.75rem"
            border-radius="4px"
          />
          <Skeleton
            v-for="(width, widthIndex) in skeletonConfig[props.variant].tableHeaderWidths"
            :key="`${width}-${widthIndex}`"
            :width="width"
            height="0.75rem"
            border-radius="4px"
          />
        </div>

        <div
          v-if="props.variant === 'reports'"
          class="border-divider flex h-[44px] items-center gap-3 border-b px-3"
        >
          <Skeleton
            class="flex-1"
            height="0.75rem"
            border-radius="4px"
          />
          <Skeleton
            v-for="(width, widthIndex) in skeletonConfig[props.variant].tableHeaderWidths"
            :key="`filter-${width}-${widthIndex}`"
            :width="width"
            height="0.75rem"
            border-radius="4px"
          />
        </div>

        <div
          v-for="index in 6"
          :key="index"
          class="border-divider flex h-[56px] items-center gap-3 border-t px-3"
        >
          <template v-if="props.variant === 'members'">
            <div class="flex flex-1 items-center gap-3">
              <Skeleton
                width="2rem"
                height="2rem"
                border-radius="9999px"
              />
              <div class="flex flex-col gap-1.5">
                <Skeleton
                  width="8rem"
                  height="0.875rem"
                  border-radius="4px"
                />
                <Skeleton
                  width="10rem"
                  height="0.75rem"
                  border-radius="4px"
                />
              </div>
            </div>
            <div class="w-[120px]">
              <Skeleton
                width="4rem"
                height="0.8rem"
                border-radius="4px"
              />
            </div>
            <div class="w-[160px]">
              <Skeleton
                width="5rem"
                height="0.8rem"
                border-radius="4px"
              />
            </div>
            <div class="w-[140px]">
              <Skeleton
                width="5.5rem"
                height="0.8rem"
                border-radius="4px"
              />
            </div>
            <div class="flex w-[200px] justify-end gap-2">
              <Skeleton
                width="4rem"
                height="0.8rem"
                border-radius="4px"
              />
              <Skeleton
                width="2.5rem"
                height="0.8rem"
                border-radius="4px"
              />
              <Skeleton
                width="3rem"
                height="0.8rem"
                border-radius="4px"
              />
            </div>
          </template>

          <template v-else-if="props.variant === 'projects'">
            <div class="flex flex-1 items-center">
              <Skeleton
                width="60%"
                height="0.875rem"
                border-radius="4px"
              />
            </div>
            <div class="w-[140px]">
              <Skeleton
                width="70%"
                height="0.8rem"
                border-radius="4px"
              />
            </div>
            <div class="w-[220px]">
              <Skeleton
                width="50%"
                height="0.8rem"
                border-radius="4px"
              />
            </div>
            <div class="w-[120px]">
              <Skeleton
                width="40%"
                height="0.8rem"
                border-radius="4px"
              />
            </div>
            <div class="w-[120px]">
              <Skeleton
                width="3.5rem"
                height="1.4rem"
                border-radius="6px"
              />
            </div>
            <div class="flex w-[150px] justify-end gap-2">
              <Skeleton
                width="2.5rem"
                height="0.8rem"
                border-radius="4px"
              />
              <Skeleton
                width="3.5rem"
                height="0.8rem"
                border-radius="4px"
              />
            </div>
          </template>

          <template v-else>
            <div class="flex flex-1 items-center">
              <Skeleton
                width="45%"
                height="0.875rem"
                border-radius="4px"
              />
            </div>
            <div class="w-[180px]">
              <Skeleton
                width="55%"
                height="0.8rem"
                border-radius="4px"
              />
            </div>
            <div class="w-[140px]">
              <Skeleton
                width="50%"
                height="0.8rem"
                border-radius="4px"
              />
            </div>
            <div class="w-[140px]">
              <Skeleton
                width="50%"
                height="0.8rem"
                border-radius="4px"
              />
            </div>
          </template>
        </div>
      </div>
    </SurfaceCard>
  </div>
</template>
