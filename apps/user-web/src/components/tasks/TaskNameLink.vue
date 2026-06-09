<script setup lang="ts">
import { ArrowUpRightIcon } from "@heroicons/vue/24/outline";
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    clickable?: boolean;
    externalLabel?: string;
    externalTestId?: string;
    externalUrl?: string | null;
    label: string;
    openLabel?: string;
    testId?: string;
  }>(),
  {
    clickable: true,
    externalLabel: undefined,
    externalTestId: undefined,
    externalUrl: null,
    openLabel: undefined,
    testId: undefined,
  },
);

const emit = defineEmits<{
  open: [];
}>();

const fallbackOpenLabel = computed(() => `Open ${props.label}`);
const fallbackExternalLabel = computed(() => `Open GitHub issue for ${props.label}`);
</script>

<template>
  <span class="inline-flex max-w-full min-w-0 align-middle">
    <button
      v-if="props.clickable"
      class="text-brand hover:text-brand focus-visible:outline-brand group inline-flex max-w-full min-w-0 cursor-pointer items-center gap-2 truncate text-left text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
      type="button"
      :aria-label="props.openLabel ?? fallbackOpenLabel"
      :data-testid="props.testId"
      @click="emit('open')"
    >
      <span class="truncate">
        {{ props.label }}
      </span>
      <ArrowUpRightIcon
        aria-hidden="true"
        class="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
      />
    </button>
    <a
      v-else-if="props.externalUrl"
      class="text-brand hover:text-brand focus-visible:outline-brand group inline-flex max-w-full min-w-0 cursor-pointer items-center gap-2 truncate text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
      target="_blank"
      rel="noreferrer"
      :aria-label="props.externalLabel ?? fallbackExternalLabel"
      :data-testid="props.externalTestId ?? props.testId"
      :href="props.externalUrl"
    >
      <span class="truncate">
        {{ props.label }}
      </span>
      <ArrowUpRightIcon
        aria-hidden="true"
        class="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
      />
    </a>
    <span
      v-else
      class="text-brand max-w-full min-w-0 truncate text-sm font-medium"
      :data-testid="props.testId"
    >
      {{ props.label }}
    </span>
  </span>
</template>
