<script setup lang="ts">
import Checkbox from "primevue/checkbox";
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    inputId: string;
    inputTestId?: string;
    invalid?: boolean;
    label: string;
    labelClass?: string;
    name?: string;
    rootClass?: string;
  }>(),
  {
    disabled: false,
    inputTestId: undefined,
    invalid: false,
    labelClass: "text-text-dark text-sm font-medium",
    name: undefined,
    rootClass:
      "border-divider bg-surface-primary flex min-h-[38px] cursor-pointer items-center gap-2.5 rounded-[6px] border px-3 py-2",
  },
);

const modelValue = defineModel<boolean>();
const isControlled = computed(() => modelValue.value !== undefined);
const checkboxPt = computed(() => ({
  input: props.inputTestId ? { "data-testid": props.inputTestId } : undefined,
}));
</script>

<template>
  <label
    :for="props.inputId"
    :class="props.rootClass"
  >
    <Checkbox
      v-if="isControlled"
      v-model="modelValue"
      binary
      :disabled="props.disabled"
      :input-id="props.inputId"
      :invalid="props.invalid"
      :name="props.name"
      :pt="checkboxPt"
    />
    <Checkbox
      v-else
      binary
      :disabled="props.disabled"
      :input-id="props.inputId"
      :invalid="props.invalid"
      :name="props.name"
      :pt="checkboxPt"
    />
    <span :class="props.labelClass">
      <slot>{{ props.label }}</slot>
    </span>
  </label>
</template>
