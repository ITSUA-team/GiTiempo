<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    clickable?: boolean;
    label: string;
    openLabel?: string;
    testId?: string;
  }>(),
  {
    clickable: true,
    openLabel: undefined,
    testId: undefined,
  },
);

const emit = defineEmits<{
  open: [];
}>();

const fallbackOpenLabel = computed(() => `Open ${props.label}`);
</script>

<template>
  <span class="inline-flex max-w-full min-w-0 align-middle">
    <button
      v-if="props.clickable"
      class="text-brand focus-visible:outline-brand inline-flex max-w-full min-w-0 cursor-pointer items-center truncate text-left text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
      type="button"
      :aria-label="props.openLabel ?? fallbackOpenLabel"
      :data-testid="props.testId"
      @click="emit('open')"
    >
      <span class="truncate">
        {{ props.label }}
      </span>
    </button>
    <span
      v-else
      class="text-brand max-w-full min-w-0 truncate text-sm font-medium"
      :data-testid="props.testId"
    >
      {{ props.label }}
    </span>
  </span>
</template>
