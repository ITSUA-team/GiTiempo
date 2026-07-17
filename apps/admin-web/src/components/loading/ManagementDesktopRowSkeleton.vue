<script setup lang="ts">
import Skeleton from 'primevue/skeleton';

type ManagementPageSkeletonVariant = 'members' | 'projects' | 'reports';
type ManagementSkeletonVariant = ManagementPageSkeletonVariant | 'pendingInvites';

defineProps<{
  variant: ManagementSkeletonVariant;
}>();
</script>

<template>
  <div class="border-divider flex h-[56px] items-center gap-3 border-b px-3 last:border-b-0">
    <template v-if="variant === 'members'">
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

    <template v-else-if="variant === 'projects'">
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

    <template v-else-if="variant === 'reports'">
      <div class="flex flex-1 items-center">
        <Skeleton
          width="45%"
          height="0.875rem"
          border-radius="4px"
        />
      </div>
      <div class="w-[120px]">
        <Skeleton
          width="55%"
          height="0.8rem"
          border-radius="4px"
        />
      </div>
      <div class="w-[120px]">
        <Skeleton
          width="55%"
          height="0.8rem"
          border-radius="4px"
        />
      </div>
      <div class="w-[110px]">
        <Skeleton
          width="50%"
          height="0.8rem"
          border-radius="4px"
        />
      </div>
      <div class="w-[130px]">
        <Skeleton
          width="55%"
          height="0.8rem"
          border-radius="4px"
        />
      </div>
    </template>

    <template v-else>
      <div class="flex flex-1 flex-col gap-1.5">
        <Skeleton
          width="10rem"
          height="0.875rem"
          border-radius="4px"
        />
        <Skeleton
          width="6rem"
          height="0.75rem"
          border-radius="4px"
        />
      </div>
      <div class="w-[140px]">
        <Skeleton
          width="5rem"
          height="0.8rem"
          border-radius="4px"
        />
      </div>
      <div class="w-[180px]">
        <Skeleton
          width="6rem"
          height="0.8rem"
          border-radius="4px"
        />
      </div>
      <div class="flex w-[140px] justify-end gap-2">
        <Skeleton
          width="2rem"
          height="2rem"
          border-radius="9999px"
        />
        <Skeleton
          width="2rem"
          height="2rem"
          border-radius="9999px"
        />
      </div>
    </template>
  </div>
</template>
