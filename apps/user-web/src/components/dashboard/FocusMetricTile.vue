<script setup lang="ts">
import ProgressBar from "primevue/progressbar";
import { useId } from "vue";
import type { RouteLocationNamedRaw } from "vue-router";

defineProps<{
  caption: string;
  description: string;
  label: string;
  linkLabel: string;
  linkTestId: string;
  percentage: number;
  route: RouteLocationNamedRaw | null;
  title: string;
}>();

const emit = defineEmits<{ activate: [] }>();
const labelId = useId();
</script>

<template>
  <div class="bg-app-bg relative flex min-w-0 flex-col gap-3 overflow-hidden rounded-lg p-4">
    <p
      :id="labelId"
      class="text-text-muted text-xs font-semibold tracking-wide uppercase"
    >
      {{ label }}
    </p>
    <div class="flex max-w-full min-w-0 items-start gap-1.5">
      <p class="text-text-dark min-w-0 text-xl font-semibold break-words sm:text-2xl">
        {{ title }}
      </p>
      <slot name="title-action" />
    </div>
    <p class="text-text-muted text-[13px] break-words">
      {{ description }}
    </p>
    <ProgressBar
      :aria-labelledby="labelId"
      :show-value="false"
      :value="percentage"
      :pt="{
        root: 'bg-divider h-2 overflow-hidden rounded-full',
        value: 'bg-brand rounded-full',
      }"
    />
    <p class="text-text-muted text-xs break-words">
      {{ caption }}
    </p>
    <RouterLink
      v-if="route"
      :aria-label="linkLabel"
      :data-testid="linkTestId"
      :to="route"
      class="focus-visible:ring-brand absolute inset-0 z-20 rounded-lg focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
      @keydown.space.prevent="emit('activate')"
    />
  </div>
</template>
