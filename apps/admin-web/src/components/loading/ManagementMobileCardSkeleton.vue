<script setup lang="ts">
import Skeleton from 'primevue/skeleton';

import { MobileRecordCard } from '@gitiempo/web-shared';

type ManagementPageSkeletonVariant = 'members' | 'projects' | 'reports';
type ManagementSkeletonVariant = ManagementPageSkeletonVariant | 'pendingInvites';

defineProps<{
  index: number;
  variant: ManagementSkeletonVariant;
}>();
</script>

<template>
  <MobileRecordCard>
    <div
      v-if="variant === 'members'"
      class="flex items-start gap-3"
    >
      <Skeleton
        width="2.25rem"
        height="2.25rem"
        border-radius="9999px"
      />
      <div class="flex min-w-0 flex-1 flex-col gap-1.5">
        <Skeleton
          width="70%"
          height="0.95rem"
          border-radius="4px"
        />
        <Skeleton
          width="85%"
          height="0.75rem"
          border-radius="4px"
        />
      </div>
    </div>

    <div
      v-else-if="variant === 'projects'"
      class="flex items-start justify-between gap-3"
    >
      <div class="flex min-w-0 flex-1 flex-col gap-1.5">
        <Skeleton
          width="70%"
          height="0.95rem"
          border-radius="4px"
        />
        <Skeleton
          width="45%"
          height="0.75rem"
          border-radius="4px"
        />
      </div>
      <Skeleton
        width="4.25rem"
        height="1.5rem"
        border-radius="6px"
      />
    </div>

    <div
      v-else-if="variant === 'reports'"
      class="flex min-w-0 flex-col gap-1.5"
    >
      <Skeleton
        width="75%"
        height="0.95rem"
        border-radius="4px"
      />
      <Skeleton
        width="55%"
        height="0.75rem"
        border-radius="4px"
      />
    </div>

    <div
      v-else
      class="flex min-w-0 flex-col gap-1.5"
    >
      <Skeleton
        width="70%"
        height="0.95rem"
        border-radius="4px"
      />
      <Skeleton
        width="45%"
        height="0.75rem"
        border-radius="4px"
      />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <template v-if="variant === 'members'">
        <div class="flex flex-col gap-1.5">
          <Skeleton
            width="2.5rem"
            height="0.7rem"
            border-radius="4px"
          />
          <Skeleton
            width="4rem"
            height="0.85rem"
            border-radius="4px"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <Skeleton
            width="3.5rem"
            height="0.7rem"
            border-radius="4px"
          />
          <Skeleton
            width="5rem"
            height="0.85rem"
            border-radius="4px"
          />
        </div>
        <div class="col-span-2 flex flex-col gap-1.5">
          <Skeleton
            width="4.5rem"
            height="0.7rem"
            border-radius="4px"
          />
          <Skeleton
            width="6rem"
            height="0.85rem"
            border-radius="4px"
          />
        </div>
      </template>

      <template v-else-if="variant === 'projects'">
        <div class="flex flex-col gap-1.5">
          <Skeleton
            width="6rem"
            height="0.7rem"
            border-radius="4px"
          />
          <Skeleton
            width="4.5rem"
            height="0.85rem"
            border-radius="4px"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <Skeleton
            width="2.5rem"
            height="0.7rem"
            border-radius="4px"
          />
          <Skeleton
            width="3.5rem"
            height="0.85rem"
            border-radius="4px"
          />
        </div>
      </template>

      <template v-else-if="variant === 'reports'">
        <div class="flex flex-col gap-1.5">
          <Skeleton
            width="2.5rem"
            height="0.7rem"
            border-radius="4px"
          />
          <Skeleton
            width="4.5rem"
            height="0.85rem"
            border-radius="4px"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <Skeleton
            width="3.5rem"
            height="0.7rem"
            border-radius="4px"
          />
          <Skeleton
            width="4.5rem"
            height="0.85rem"
            border-radius="4px"
          />
        </div>
      </template>

      <template v-else>
        <div class="flex flex-col gap-1.5">
          <Skeleton
            width="2.5rem"
            height="0.7rem"
            border-radius="4px"
          />
          <Skeleton
            width="4rem"
            height="0.85rem"
            border-radius="4px"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <Skeleton
            width="3.5rem"
            height="0.7rem"
            border-radius="4px"
          />
          <Skeleton
            width="5rem"
            height="0.85rem"
            border-radius="4px"
          />
        </div>
      </template>
    </div>

    <template
      v-if="variant !== 'reports'"
      #actions
    >
      <Skeleton
        v-for="actionIndex in variant === 'members' ? 3 : 2"
        :key="`${variant}-action-${index}-${actionIndex}`"
        width="2rem"
        height="2rem"
        border-radius="9999px"
      />
    </template>
  </MobileRecordCard>
</template>
