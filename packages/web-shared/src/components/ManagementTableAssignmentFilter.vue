<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  composeGiTiempoAutoCompletePt,
  composeGiTiempoSelfAppendedAutoCompletePt,
} from '@gitiempo/web-config/theme';
import AutoComplete from 'primevue/autocomplete';
import { filterAutocompleteOptions } from '../autocomplete';
import {
  managementTableFilterAutoCompletePt,
  type ManagementTableAssignmentFilterOption,
} from './management-table';

interface AutoCompleteCompleteEvent {
  query: string;
}

const props = withDefaults(defineProps<{
  appendTo?: 'self';
  ariaLabel?: string;
  inputId?: string;
  modelValue: readonly string[];
  options: readonly ManagementTableAssignmentFilterOption[];
  placeholder: string;
}>(), {
  appendTo: undefined,
  ariaLabel: undefined,
  inputId: undefined,
});

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
}>();

const suggestions = ref<string[]>([]);
const resolvedPassThrough = composeGiTiempoAutoCompletePt(
  managementTableFilterAutoCompletePt,
);
const selfAppendedPassThrough = composeGiTiempoSelfAppendedAutoCompletePt(
  managementTableFilterAutoCompletePt,
);
const passThrough = computed(() =>
  props.appendTo === 'self' ? selfAppendedPassThrough : resolvedPassThrough,
);

function handleComplete(event: AutoCompleteCompleteEvent): void {
  suggestions.value = filterAutocompleteOptions(
    props.options,
    event.query,
    (option) => option.label,
  ).map((option) => option.value);
}

function getOptionLabel(value: string): string {
  return props.options.find((option) => option.value === value)?.label ?? value;
}

function handleUpdate(value: string[] | null | undefined): void {
  emit('update:modelValue', value ? [...value] : []);
}
</script>

<template>
  <AutoComplete
    :append-to="appendTo"
    :aria-label="ariaLabel"
    complete-on-focus
    dropdown
    dropdown-mode="blank"
    force-selection
    :input-id="inputId"
    :min-length="0"
    :model-value="modelValue"
    multiple
    :option-label="getOptionLabel"
    :placeholder="placeholder"
    :pt="passThrough"
    show-clear
    :suggestions="suggestions"
    @complete="handleComplete"
    @update:model-value="handleUpdate"
  />
</template>
