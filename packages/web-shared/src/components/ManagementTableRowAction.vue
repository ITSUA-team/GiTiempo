<script setup lang="ts">
import { computed, useAttrs, type Component } from 'vue';
import Button from 'primevue/button';

import {
  getManagementTableActionIconClass,
  getManagementTableActionRootClass,
  type ManagementTableActionTone,
} from './management-table';

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    icon: Component;
    label: string;
    loading?: boolean;
    tone?: ManagementTableActionTone;
  }>(),
  {
    disabled: false,
    loading: false,
    tone: 'brand',
  },
);

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const attrs = useAttrs();

const iconClass = computed(() => getManagementTableActionIconClass(props.tone));
const rootClass = computed(() => getManagementTableActionRootClass(props.tone));
</script>

<template>
  <Button
    v-tooltip.bottom="props.label"
    v-bind="attrs"
    :aria-label="props.label"
    :disabled="props.disabled || props.loading"
    :loading="props.loading"
    rounded
    size="small"
    variant="text"
    :pt="{
      loadingIcon: { class: iconClass },
      root: { class: rootClass },
    }"
    @click="emit('click', $event)"
  >
    <component
      :is="props.icon"
      v-if="!props.loading"
      aria-hidden="true"
      class="size-4 shrink-0"
      :class="iconClass"
    />
  </Button>
</template>
