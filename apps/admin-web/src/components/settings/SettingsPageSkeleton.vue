<script setup lang="ts">
import { SurfaceCard } from '@gitiempo/web-shared';
import Skeleton from 'primevue/skeleton';
</script>

<template>
  <div
    aria-busy="true"
    class="flex flex-col gap-6"
    role="status"
  >
    <span class="sr-only">Loading settings</span>

    <div class="flex flex-col gap-1.5">
      <Skeleton
        width="9rem"
        height="2rem"
        border-radius="6px"
      />
      <Skeleton
        width="min(100%, 28rem)"
        height="1rem"
        border-radius="6px"
      />
    </div>

    <div class="flex w-full max-w-[620px] flex-col gap-2">
      <SurfaceCard
        class="w-full"
        padding-class="p-5"
      >
        <div class="flex flex-col gap-5">
          <section class="flex flex-col gap-3">
            <Skeleton
              width="7rem"
              height="1.375rem"
              border-radius="6px"
            />

            <div class="flex flex-col gap-1.5">
              <Skeleton
                width="7.5rem"
                height="0.875rem"
                border-radius="4px"
              />
              <Skeleton
                height="38px"
                border-radius="6px"
              />
            </div>

            <div class="flex flex-col gap-3 sm:flex-row">
              <div class="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton
                  width="8.5rem"
                  height="0.875rem"
                  border-radius="4px"
                />
                <Skeleton
                  height="38px"
                  border-radius="6px"
                />
              </div>

              <div class="flex w-full flex-col gap-1.5 sm:w-40">
                <Skeleton
                  width="4.5rem"
                  height="0.875rem"
                  border-radius="4px"
                />
                <Skeleton
                  height="38px"
                  border-radius="6px"
                />
              </div>
            </div>

            <div
              data-testid="settings-skeleton-time-zone"
              class="flex flex-col gap-1.5"
            >
              <Skeleton
                width="5rem"
                height="0.875rem"
                border-radius="4px"
              />
              <Skeleton
                height="38px"
                border-radius="6px"
              />
            </div>
          </section>

          <div class="border-divider border-t" />

          <section class="flex flex-col gap-3">
            <Skeleton
              width="9rem"
              height="1.375rem"
              border-radius="6px"
            />
            <div class="flex flex-col gap-1.5">
              <Skeleton
                width="6.5rem"
                height="0.875rem"
                border-radius="4px"
              />
              <Skeleton
                height="38px"
                border-radius="6px"
              />
            </div>
            <div class="flex flex-col gap-1.5">
              <Skeleton
                width="7rem"
                height="0.875rem"
                border-radius="4px"
              />
              <Skeleton
                height="38px"
                border-radius="6px"
              />
            </div>
          </section>

          <div class="border-divider border-t" />

          <section class="flex flex-col gap-3">
            <Skeleton
              width="7.5rem"
              height="1.375rem"
              border-radius="6px"
            />
            <div class="flex flex-col gap-1.5">
              <Skeleton
                width="6rem"
                height="0.875rem"
                border-radius="4px"
              />
              <Skeleton
                height="38px"
                border-radius="6px"
              />
            </div>
            <div class="flex flex-col gap-1.5">
              <Skeleton
                width="3.5rem"
                height="0.875rem"
                border-radius="4px"
              />
              <Skeleton
                height="38px"
                border-radius="6px"
              />
            </div>
          </section>
        </div>
      </SurfaceCard>

      <div
        data-testid="settings-skeleton-actions"
        class="flex flex-col-reverse gap-2.5 pt-2 sm:flex-row sm:justify-end"
      >
        <div class="w-full sm:w-[5.5rem]">
          <Skeleton
            height="2.75rem"
            border-radius="6px"
          />
        </div>
        <div class="w-full sm:w-[8.5rem]">
          <Skeleton
            height="2.75rem"
            border-radius="6px"
          />
        </div>
      </div>
    </div>
  </div>
</template>
