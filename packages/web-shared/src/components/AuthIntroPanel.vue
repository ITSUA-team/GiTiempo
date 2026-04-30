<script setup lang="ts">
interface FeatureCard {
  description: string;
  title: string;
}

const props = defineProps<{
  badgeItems: string[];
  counterpartHref: string;
  counterpartLabel: string;
  counterpartPrompt: string;
  featureCards: FeatureCard[];
  heroDescription: string;
  heroTitle: string;
  productTagline: string;
  workspaceLabel: string;
}>();
</script>

<template>
  <section
    class="flex flex-1 flex-col justify-between bg-surface px-6 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12"
  >
    <div class="flex items-center gap-3">
      <div
        class="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-tint text-sm font-semibold text-brand"
      >
        GT
      </div>
      <div class="flex flex-col gap-0.5">
        <p class="text-lg font-semibold text-text-dark">
          {{ props.productTagline }}
        </p>
        <p class="text-[13px] text-text-muted">
          {{ props.workspaceLabel }}
        </p>
      </div>
    </div>

    <div class="flex max-w-[520px] flex-col gap-5 py-12 lg:py-0">
      <h1 class="text-[40px] font-semibold leading-[1.1] text-text-dark">
        {{ props.heroTitle }}
      </h1>
      <p class="max-w-[34rem] text-base leading-7 text-text-muted">
        {{ props.heroDescription }}
      </p>

      <div class="grid gap-4 md:grid-cols-2">
        <article
          v-for="feature in props.featureCards"
          :key="feature.title"
          class="rounded-[10px] bg-app-bg p-4 shadow-card"
        >
          <div class="flex flex-col gap-2">
            <p class="text-base font-semibold text-text-dark">
              {{ feature.title }}
            </p>
            <p class="text-[13px] leading-6 text-text-muted">
              {{ feature.description }}
            </p>
          </div>
        </article>
      </div>
    </div>

    <div class="flex flex-wrap gap-4 text-xs font-medium text-text-muted">
      <span
        v-for="badge in props.badgeItems"
        :key="badge"
      >
        {{ badge }}
      </span>
      <a
        :href="props.counterpartHref"
        class="text-brand transition hover:underline"
      >
        {{ props.counterpartPrompt }} {{ props.counterpartLabel }}.
      </a>
    </div>
  </section>
</template>
