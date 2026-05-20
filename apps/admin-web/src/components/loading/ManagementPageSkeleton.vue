<script setup lang="ts">
import { SurfaceCard } from '@gitiempo/web-shared';
import Skeleton from 'primevue/skeleton';

import ManagementDesktopRowSkeleton from '@/components/loading/ManagementDesktopRowSkeleton.vue';
import ManagementMobileCardSkeleton from '@/components/loading/ManagementMobileCardSkeleton.vue';

type ManagementPageSkeletonVariant = 'members' | 'projects' | 'reports';

const props = defineProps<{
  variant: ManagementPageSkeletonVariant;
}>();

const skeletonConfig = {
  members: {
    actionWidth: '8.5rem',
    descriptionWidth: 'min(100%, 24rem)',
    filterCount: 0,
    statCount: 3,
    tableActionWidth: '17.5rem',
    tableHeaderWidths: ['120px', '220px', '140px', '150px'],
  },
  projects: {
    actionWidth: '7.5rem',
    descriptionWidth: 'min(100%, 22rem)',
    filterCount: 0,
    statCount: 3,
    tableActionWidth: '16rem',
    tableHeaderWidths: ['140px', '220px', '120px', '120px', '150px'],
  },
  reports: {
    actionWidth: '6.875rem',
    descriptionWidth: 'min(100%, 28rem)',
    filterCount: 4,
    statCount: 4,
    tableActionWidth: '17.5rem',
    tableHeaderWidths: ['180px', '140px', '140px'],
  },
} as const;
</script>

<template>
  <div
    aria-busy="true"
    class="flex flex-col gap-6"
    role="status"
  >
    <span class="sr-only">Loading page content</span>

    <div class="flex flex-col gap-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex min-w-0 flex-col gap-1.5">
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
        :class="props.variant === 'reports' ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-2 xl:grid-cols-3'"
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
        :class="skeletonConfig[props.variant].tableActionWidth ? 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between' : undefined"
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

      <div
        v-if="props.variant === 'members'"
        class="flex flex-col gap-3 sm:hidden"
      >
        <ManagementMobileCardSkeleton
          v-for="index in 4"
          :key="`member-mobile-${index}`"
          :index="index"
          variant="members"
        />
      </div>

      <div
        v-else-if="props.variant === 'projects'"
        class="flex flex-col gap-3 sm:hidden"
      >
        <ManagementMobileCardSkeleton
          v-for="index in 4"
          :key="`project-mobile-${index}`"
          :index="index"
          variant="projects"
        />
      </div>

      <div
        v-else-if="props.variant === 'reports'"
        class="flex flex-col gap-3 sm:hidden"
      >
        <ManagementMobileCardSkeleton
          v-for="index in 4"
          :key="`report-mobile-${index}`"
          :index="index"
          variant="reports"
        />
      </div>

      <div
        class="border-divider hidden overflow-hidden rounded-[6px] border sm:block"
      >
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
          v-if="skeletonConfig[props.variant].tableHeaderWidths.length > 0"
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

        <ManagementDesktopRowSkeleton
          v-for="index in 6"
          :key="index"
          :variant="props.variant"
        />
      </div>
    </SurfaceCard>
  </div>
</template>
