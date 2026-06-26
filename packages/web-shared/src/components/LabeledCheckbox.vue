<script setup lang="ts">
import Checkbox from "primevue/checkbox";
import { computed, ref } from "vue";

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    inputId: string;
    inputTestId?: string;
    invalid?: boolean;
    label: string;
    labelClass?: string;
    modelValue?: boolean;
    name?: string;
    rootClass?: string;
  }>(),
  {
    disabled: false,
    inputTestId: undefined,
    invalid: false,
    labelClass: "text-text-dark text-sm font-medium",
    modelValue: undefined,
    name: undefined,
    rootClass:
      "border-divider bg-surface-primary flex min-h-[38px] cursor-pointer items-center gap-2.5 rounded-[6px] border px-3 py-2",
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const checkboxLabel = ref<HTMLLabelElement | null>(null);
const isControlled = computed(() => props.modelValue !== undefined);
const checkboxModel = computed({
  get: () => props.modelValue === true,
  set: (value: boolean) => {
    emit("update:modelValue", value);
  },
});
const checkboxPt = computed(() => ({
  input: props.inputTestId ? { "data-testid": props.inputTestId } : undefined,
}));

function isControlClick(event: MouseEvent): boolean {
  return event.target instanceof Element
    && event.target.closest('[data-labeled-checkbox-control]') !== null;
}

function toggleFromLabel(event: MouseEvent): void {
  if (props.disabled || event.target instanceof HTMLInputElement) {
    return;
  }

  if (isControlClick(event)) {
    event.preventDefault();
    return;
  }

  event.preventDefault();
  const input = checkboxLabel.value?.querySelector<HTMLInputElement>("input");

  if (!input || input.disabled) {
    return;
  }

  input.checked = !input.checked;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}
</script>

<template>
  <label
    ref="checkboxLabel"
    :for="props.inputId"
    :class="props.rootClass"
    @click="toggleFromLabel"
  >
    <span
      class="inline-flex"
      data-labeled-checkbox-control
    >
      <Checkbox
        v-if="isControlled"
        v-model="checkboxModel"
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
    </span>
    <span :class="props.labelClass">
      <slot>{{ props.label }}</slot>
    </span>
  </label>
</template>
