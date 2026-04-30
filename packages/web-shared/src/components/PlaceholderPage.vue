<script setup lang="ts">
const props = defineProps<{
  eyebrow: string;
  primaryBody: string;
  primaryTitle: string;
  secondaryBody: string;
  subtitle: string;
  title: string;
}>();
</script>

<template>
  <section class="flex flex-col gap-6 pb-20 sm:pb-0">
    <header class="flex flex-col gap-2">
      <p class="text-text-muted text-xs font-semibold tracking-[0.2em] uppercase">
        {{ props.eyebrow }}
      </p>
      <h1 class="text-text-dark text-2xl font-semibold">
        {{ props.title }}
      </h1>
      <p class="text-text-muted text-sm">
        {{ props.subtitle }}
      </p>
    </header>

    <div class="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <section class="border-divider bg-surface shadow-card rounded-lg border p-6">
        <div class="flex flex-col gap-3">
          <h2 class="text-text-dark text-lg font-semibold">
            {{ props.primaryTitle }}
          </h2>
          <p class="text-text-muted text-sm leading-6">
            {{ props.primaryBody }}
          </p>
        </div>
      </section>

      <section class="border-divider bg-surface shadow-card rounded-lg border p-6">
        <div class="flex flex-col gap-3">
          <h2 class="text-text-dark text-lg font-semibold">
            Next step
          </h2>
          <p class="text-text-muted text-sm leading-6">
            {{ props.secondaryBody }}
          </p>
        </div>
      </section>
    </div>
  </section>
</template>
