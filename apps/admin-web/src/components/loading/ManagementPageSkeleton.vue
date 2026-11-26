<script setup lang="ts">
import {
  SurfaceCard,
  getManagementTableColumnStyle,
  managementTableHeaderCellClass,
} from '@gitiempo/web-shared';
import Skeleton from 'primevue/skeleton';
import { computed } from 'vue';

import ManagementDesktopRowSkeleton from '@/components/loading/ManagementDesktopRowSkeleton.vue';
import ManagementMobileCardSkeleton from '@/components/loading/ManagementMobileCardSkeleton.vue';
import { adminTableHeaderClass, adminTableMinWidthClass } from '@/lib/admin-table-classes';
import { membersTableColumns, projectsTableColumns } from '@/lib/management-table-columns';

type ManagementPageSkeletonVariant = 'members' | 'projects' | 'reports' | 'invoices';

const props = defineProps<{
  variant: ManagementPageSkeletonVariant;
}>();

const skeletonConfig = {
  members: {
    filterCount: 0,
    statCount: 3,
    tableActionWidth: '17.5rem',
    tableColumns: Object.values(membersTableColumns),
  },
  projects: {
    filterCount: 0,
    statCount: 3,
    tableActionWidth: '16rem',
    tableColumns: Object.values(projectsTableColumns),
  },
  invoices: {
    filterCount: 0,
    statCount: 3,
    // Search input (280px) + create button (38px) + gap between them.
    tableActionWidth: '20rem',
    // Project, Period, Hours, Amount, Status. The Title column is flex-1.
    tableHeaderWidths: ['160px', '160px', '100px', '120px', '130px'],
  },
  reports: {
    filterCount: 0,
    statCount: 4,
    // Date range, grouping, search, and export now sit in the results header.
    tableActionWidth: '50rem',
    tableHeaderWidths: ['180px', '140px', '140px'],
  },
} as const;

const tableConfig = computed(() => skeletonConfig[props.variant]);
</script>

<template>
  <div
    aria-busy="true"
    class="flex flex-col gap-6"
    role="status"
  >
    <span class="sr-only">Loading page content</span>

    <div class="flex flex-col gap-6">
      <div
        v-if="skeletonConfig[props.variant].filterCount > 0"
        class="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_180px_auto]"
        :class="props.variant === 'reports' ? 'gap-4' : 'gap-3'"
      >
        <div
          v-for="index in skeletonConfig[props.variant].filterCount"
          :key="`filter-${index}`"
          class="flex flex-col gap-1.5"
        >
          <Skeleton
            v-if="props.variant !== 'reports' || index < skeletonConfig[props.variant].filterCount"
            width="5rem"
            height="0.875rem"
            border-radius="4px"
          />
          <span
            v-else
            aria-hidden="true"
            class="hidden h-[0.875rem] lg:block"
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

    <SurfaceCard padding-class="p-6">
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
          :height="props.variant === 'reports' ? '2.375rem' : '2.25rem'"
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
        v-else-if="props.variant === 'invoices'"
        class="flex flex-col gap-3 sm:hidden"
      >
        <ManagementMobileCardSkeleton
          v-for="index in 4"
          :key="`invoice-mobile-${index}`"
          :index="index"
          variant="invoices"
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
        class="border-divider hidden rounded-[6px] border sm:block"
        :class="'tableColumns' in tableConfig ? 'overflow-x-auto' : 'overflow-hidden'"
      >
        <template v-if="'tableColumns' in tableConfig">
          <div
            v-for="row in ['header', 'filters']"
            :key="row"
            :class="row === 'header'
              ? adminTableHeaderClass
              : ['border-divider flex items-center border-b py-3', adminTableMinWidthClass]"
          >
            <div
              v-for="column in tableConfig.tableColumns"
              :key="column.key"
              :class="row === 'header' ? managementTableHeaderCellClass : 'pr-3 first:pl-3'"
              :style="getManagementTableColumnStyle(column)"
            >
              <Skeleton
                :width="row === 'header' ? '4.5rem' : undefined"
                :height="row === 'header' ? '0.75rem' : '2.375rem'"
                :border-radius="row === 'header' ? '4px' : '6px'"
              />
            </div>
          </div>
        </template>

        <template v-else>
          <div class="bg-app-bg flex h-[44px] items-center gap-3 px-3">
            <Skeleton
              class="flex-1"
              height="0.75rem"
              border-radius="4px"
            />
            <Skeleton
              v-for="(width, widthIndex) in tableConfig.tableHeaderWidths"
              :key="`${width}-${widthIndex}`"
              :width="width"
              height="0.75rem"
              border-radius="4px"
            />
          </div>

          <div
            v-if="tableConfig.tableHeaderWidths.length > 0"
            class="border-divider flex h-[44px] items-center gap-3 border-t px-3"
          >
            <Skeleton
              class="flex-1"
              height="0.75rem"
              border-radius="4px"
            />
            <Skeleton
              v-for="(width, widthIndex) in tableConfig.tableHeaderWidths"
              :key="`filter-${width}-${widthIndex}`"
              :width="width"
              height="0.75rem"
              border-radius="4px"
            />
          </div>
        </template>

        <ManagementDesktopRowSkeleton
          v-for="index in 6"
          :key="index"
          :variant="props.variant"
        />
      </div>
    </SurfaceCard>
  </div>
</template>
