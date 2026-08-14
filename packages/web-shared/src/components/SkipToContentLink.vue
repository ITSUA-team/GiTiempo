<script setup lang="ts">
import { computed } from "vue";

import { MAIN_CONTENT_ELEMENT_ID } from "./skip-link";

const props = withDefaults(
  defineProps<{
    label?: string;
    targetId?: string;
  }>(),
  {
    label: "Skip to main content",
    targetId: MAIN_CONTENT_ELEMENT_ID,
  },
);

const href = computed(() => `#${props.targetId}`);

function handleActivate(event: MouseEvent): void {
  const target = document.getElementById(props.targetId);

  if (!target) {
    return;
  }

  event.preventDefault();
  target.focus({ preventScroll: true });
}
</script>

<template>
  <a
    :href="href"
    class="bg-surface-primary text-text-dark shadow-popover focus:outline-brand sr-only rounded-sm text-sm font-semibold focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:outline-2 focus:outline-offset-2"
    data-testid="skip-to-content"
    @click="handleActivate"
  >
    {{ props.label }}
  </a>
</template>
