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
    class="bg-surface flex flex-1 flex-col justify-between px-6 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12"
  >
    <div class="flex items-center gap-3">
      <div
        class="bg-accent-tint text-brand flex size-10 items-center justify-center rounded-xl text-sm font-semibold"
      >
        GT
      </div>
      <div class="flex flex-col gap-0.5">
        <p class="text-text-dark text-lg font-semibold">
          {{ props.productTagline }}
        </p>
        <p class="text-text-muted text-[13px]">
          {{ props.workspaceLabel }}
        </p>
      </div>
    </div>

    <div class="flex max-w-[520px] flex-col gap-5 py-12 lg:py-0">
      <h1 class="text-text-dark text-[40px] leading-[1.1] font-semibold">
        {{ props.heroTitle }}
      </h1>
      <p class="text-text-muted max-w-[34rem] text-base leading-7">
        {{ props.heroDescription }}
      </p>

      <div class="grid gap-4 md:grid-cols-2">
        <article
          v-for="feature in props.featureCards"
          :key="feature.title"
          class="bg-app-bg shadow-card rounded-lg p-4"
        >
          <div class="flex flex-col gap-2">
            <p class="text-text-dark text-base font-semibold">
              {{ feature.title }}
            </p>
            <p class="text-text-muted text-[13px] leading-6">
              {{ feature.description }}
            </p>
          </div>
        </article>
      </div>
    </div>

    <div class="text-text-muted flex flex-wrap gap-4 text-xs font-medium">
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
