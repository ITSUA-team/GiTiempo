<script setup lang="ts">
import { useAttrs, type Component } from "vue";
import Button from "primevue/button";

defineOptions({
  inheritAttrs: false,
});

const props = defineProps<{
  icon: Component;
  label: string;
}>();

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const attrs = useAttrs();
</script>

<template>
  <Button
    v-tooltip.bottom="props.label"
    v-bind="attrs"
    :aria-label="props.label"
    type="button"
    :pt="{
      root: { class: 'h-[38px] w-[38px] min-w-0 rounded-[6px] p-0' },
    }"
    @click="emit('click', $event)"
  >
    <component
      :is="props.icon"
      aria-hidden="true"
      class="text-text-inverse size-4 stroke-2"
    />
  </Button>
</template>
