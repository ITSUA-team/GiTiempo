<script setup lang="ts">
import { StandaloneSplitPage, SurfaceCard } from "@gitiempo/web-shared";

export interface InviteOnboardingStep {
  description: string;
  title: string;
}

defineProps<{
  description: string;
  eyebrow: string;
  footerAccent: string;
  footerLines: readonly string[];
  steps: readonly InviteOnboardingStep[];
  title: string;
}>();
</script>

<template>
  <StandaloneSplitPage>
    <template #left>
      <section
        class="bg-surface-primary flex flex-1 flex-col justify-between px-6 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12"
      >
        <div class="flex items-center gap-3">
          <div
            class="bg-accent-tint text-brand flex size-10 items-center justify-center rounded-xl text-sm font-semibold"
          >
            GT
          </div>
          <div class="flex flex-col gap-0.5">
            <p class="text-text-dark text-lg font-semibold">
              GiTiempo
            </p>
            <p class="text-text-muted text-[13px]">
              {{ eyebrow }}
            </p>
          </div>
        </div>

        <div class="flex max-w-[520px] flex-col gap-5 py-12 lg:py-0">
          <h1 class="text-text-dark text-[40px] leading-[1.1] font-semibold">
            {{ title }}
          </h1>
          <p class="text-text-muted max-w-[34rem] text-base leading-7">
            {{ description }}
          </p>

          <ol class="flex flex-col gap-2.5">
            <li
              v-for="(step, index) in steps"
              :key="step.title"
              class="flex items-center gap-2.5"
            >
              <div
                class="bg-accent-tint text-brand flex size-7 items-center justify-center rounded-full text-[13px] font-semibold"
              >
                {{ index + 1 }}
              </div>
              <div class="flex flex-col gap-0.5">
                <p class="text-[15px] font-semibold">
                  {{ step.title }}
                </p>
                <p class="text-text-muted text-[13px]">
                  {{ step.description }}
                </p>
              </div>
            </li>
          </ol>
        </div>

        <div class="flex flex-col gap-1.5 text-xs font-medium">
          <span
            v-for="line in footerLines"
            :key="line"
            class="text-text-muted"
          >
            {{ line }}
          </span>
          <span class="text-brand">
            {{ footerAccent }}
          </span>
        </div>
      </section>
    </template>

    <template #right>
      <section
        class="bg-app-bg flex w-full items-center justify-center px-6 py-8 sm:px-10 sm:py-10 lg:w-[520px] lg:px-10 lg:py-10"
      >
        <SurfaceCard
          body-class="flex flex-col gap-3.5"
          class="w-full"
        >
          <slot />
        </SurfaceCard>
      </section>
    </template>
  </StandaloneSplitPage>
</template>
