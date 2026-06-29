<script setup lang="ts">
import { computed } from "vue";
import Button from "primevue/button";

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
    <Button
      v-if="props.clickable"
      type="button"
      variant="link"
      :aria-label="props.openLabel ?? fallbackOpenLabel"
      :data-testid="props.testId"
      :pt="{
        root: {
          class:
            'inline-flex max-w-full min-w-0 cursor-pointer items-center truncate rounded-none border-0 bg-transparent p-0 text-left text-sm font-medium text-brand shadow-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        },
      }"
      @click="emit('open')"
    >
      <span class="truncate">
        {{ props.label }}
      </span>
    </Button>
    <span
      v-else
      class="text-brand max-w-full min-w-0 truncate text-sm font-medium"
      :data-testid="props.testId"
    >
      {{ props.label }}
    </span>
  </span>
</template>
