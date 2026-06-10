<script setup lang="ts">
import AutoComplete from "primevue/autocomplete";
import { computed, shallowRef, watch } from "vue";
import type {
  AutocompleteFieldOption,
  AutocompleteFieldValue,
} from "./autocomplete-field";

const props = withDefaults(
  defineProps<{
    completeOnFocus?: boolean;
    disabled?: boolean;
    dropdown?: boolean;
    dropdownMode?: "blank" | "current";
    errorMessage?: string | null;
    forceSelection?: boolean;
    inputId: string;
    invalid?: boolean;
    label: string;
    markerLabel?: string;
    minLength?: number;
    modelValue: AutocompleteFieldValue;
    name?: string;
    options: AutocompleteFieldOption[];
    placeholder?: string;
    showClear?: boolean;
  }>(),
  {
    completeOnFocus: true,
    disabled: false,
    dropdown: true,
    dropdownMode: "blank",
    errorMessage: null,
    forceSelection: true,
    invalid: false,
    markerLabel: "AutoComplete",
    minLength: 0,
    name: undefined,
    placeholder: undefined,
    showClear: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: AutocompleteFieldValue];
}>();

const suggestions = shallowRef<AutocompleteFieldOption[]>([...props.options]);
const selectedOption = shallowRef<AutocompleteFieldOption | string | null>(null);

const fieldInvalid = computed(
  () => props.invalid || Boolean(props.errorMessage),
);
const inputClass = computed(() => [
  "border-divider bg-surface-primary h-[38px] w-full rounded-sm border py-0 pl-3 pr-[7.75rem] text-[14px] font-medium text-text-dark shadow-none placeholder:text-text-muted",
]);
const autocompletePt = computed(() => ({
  root: { class: "relative w-full" },
  pcInputText: {
    root: {
      class: inputClass.value,
    },
  },
  dropdown: {
    class:
      "absolute inset-y-0 right-0 z-10 h-[38px] w-[7.5rem] cursor-pointer border-0 bg-transparent p-0 text-transparent shadow-none opacity-0",
  },
  dropdownIcon: { class: "hidden" },
  overlay: {
    class:
      "border-divider bg-surface-primary rounded-md border shadow-popover",
  },
  option: {
    class:
      "px-3 py-2 text-[14px] font-medium text-text-dark hover:bg-app-bg",
  },
  emptyMessage: { class: "px-3 py-2 text-sm text-text-muted" },
}));

function findSelectedOption(): AutocompleteFieldOption | null {
  return props.options.find((option) => option.value === props.modelValue) ?? null;
}

function syncSelectedOption(): void {
  selectedOption.value = findSelectedOption();
}

function handleComplete(event: { query: string }): void {
  const query = event.query.trim().toLocaleLowerCase();

  suggestions.value = query
    ? props.options.filter((option) =>
        option.label.toLocaleLowerCase().includes(query),
      )
    : [...props.options];
}

function isFieldOption(value: unknown): value is AutocompleteFieldOption {
  return Boolean(
    value &&
      typeof value === "object" &&
      "label" in value &&
      "value" in value,
  );
}

function handleUpdate(value: AutocompleteFieldOption | string | null): void {
  selectedOption.value = value;

  if (isFieldOption(value)) {
    emit("update:modelValue", value.value);
    return;
  }

  if (value === null) {
    emit("update:modelValue", null);
  }
}

watch(
  () => [props.modelValue, props.options] as const,
  () => {
    suggestions.value = [...props.options];
    syncSelectedOption();
  },
  { immediate: true },
);
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label
      :for="props.inputId"
      class="text-text-dark text-[13px] font-medium"
    >{{ props.label }}</label>

    <div class="relative">
      <AutoComplete
        :input-id="props.inputId"
        :model-value="selectedOption"
        :name="props.name"
        :suggestions="suggestions"
        option-label="label"
        :placeholder="props.placeholder"
        :disabled="props.disabled"
        :dropdown="props.dropdown"
        :dropdown-mode="props.dropdownMode"
        :force-selection="props.forceSelection"
        :complete-on-focus="props.completeOnFocus"
        :min-length="props.minLength"
        :show-clear="props.showClear"
        :invalid="fieldInvalid"
        fluid
        :pt="autocompletePt"
        @complete="handleComplete"
        @update:model-value="handleUpdate"
      />
      <span
        aria-hidden="true"
        class="text-brand pointer-events-none absolute top-1/2 right-3 z-20 -translate-y-1/2 text-xs font-medium"
      >{{ props.markerLabel }}</span>
    </div>

    <small
      v-if="props.errorMessage"
      class="text-destructive text-xs"
    >{{ props.errorMessage }}</small>
  </div>
</template>
