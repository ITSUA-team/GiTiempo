<script setup lang="ts">
import { SurfaceCard } from '@gitiempo/web-shared';

withDefaults(
  defineProps<{
    description?: string;
    paddingClass?: string;
    title?: string;
  }>(),
  {
    description: undefined,
    paddingClass: 'p-6',
    title: undefined,
  },
);
</script>

<template>
  <SurfaceCard
    class="w-full"
    :padding-class="paddingClass"
  >
    <div class="flex flex-col gap-4">
      <section
        v-if="title || description"
        class="flex flex-col gap-1.5"
      >
        <h2
          v-if="title"
          class="text-text-dark text-lg font-semibold"
        >
          {{ title }}
        </h2>
        <p
          v-if="description"
          class="text-text-muted text-sm leading-5"
        >
          {{ description }}
        </p>
      </section>

      <slot />
    </div>
  </SurfaceCard>
</template>
