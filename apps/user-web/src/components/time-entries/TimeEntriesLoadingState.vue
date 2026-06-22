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

        <div class="border-divider bg-surface-primary hidden overflow-x-auto rounded-lg border sm:block">
          <div class="min-w-[740px]">
            <div class="bg-app-bg grid h-11 grid-cols-[minmax(0,1fr)_170px_130px_110px] items-center gap-2 px-3">
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
              v-for="rowIndex in 2"
              :key="rowIndex"
              class="border-divider grid h-[52px] grid-cols-[minmax(0,1fr)_170px_130px_110px] items-center gap-2 px-3"
              :class="[
                rowIndex > 1 ? 'border-t' : '',
                groupIndex === 1 && rowIndex === 1 ? 'bg-accent-tint' : '',
              ]"
            >
              <div class="flex min-w-0 items-center gap-2">
                <Skeleton
                  shape="circle"
                  size="2rem"
                />
                <div class="flex min-w-0 flex-col gap-2">
                  <Skeleton
                    :width="rowIndex === 1 ? '12rem' : '15rem'"
                    height="1rem"
                  />
                  <Skeleton
                    v-if="rowIndex === 1"
                    width="8rem"
                    height="0.75rem"
                  />
                </div>
              </div>
              <Skeleton
                width="8rem"
                height="0.875rem"
              />
              <Skeleton
                width="6rem"
                height="0.875rem"
              />
              <div class="flex justify-end">
                <Skeleton
                  width="4.5rem"
                  height="0.875rem"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-3 sm:hidden">
          <div
            v-for="rowIndex in 2"
            :key="rowIndex"
            class="border-divider flex flex-col gap-4 rounded-lg border p-4"
            :class="groupIndex === 1 && rowIndex === 1 ? 'bg-accent-tint' : 'bg-surface-primary'"
          >
            <div class="flex min-w-0 items-start gap-3">
              <Skeleton
                shape="circle"
                size="2rem"
              />
              <div class="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton
                  :width="rowIndex === 1 ? '11rem' : '14rem'"
                  height="1rem"
                />
                <Skeleton
                  width="8rem"
                  height="0.75rem"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="flex min-w-0 flex-col gap-2">
                <Skeleton
                  width="3rem"
                  height="0.75rem"
                />
                <Skeleton
                  width="7rem"
                  height="0.875rem"
                />
              </div>
              <div class="flex min-w-0 flex-col items-end gap-2 text-right">
                <Skeleton
                  width="3.5rem"
                  height="0.75rem"
                />
                <Skeleton
                  width="4.5rem"
                  height="0.875rem"
                />
              </div>
              <div class="col-span-2 flex min-w-0 flex-col gap-2">
                <Skeleton
                  width="2.5rem"
                  height="0.75rem"
                />
                <Skeleton
                  width="8rem"
                  height="0.875rem"
                />
              </div>
            </div>
          </div>
        </div>
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
          v-for="index in 4"
          :key="index"
          width="2.25rem"
          height="2.25rem"
        />
      </div>
    </SurfaceCard>
  </div>
</template>
