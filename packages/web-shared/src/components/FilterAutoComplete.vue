<script setup lang="ts" generic="TModel = unknown, TOption = unknown">
import { computed } from 'vue';
import {
  giTiempoAutoCompleteDropdownPt,
  giTiempoSelfAppendedAutoCompleteDropdownPt,
} from '@gitiempo/web-config/theme';
import AutoComplete from 'primevue/autocomplete';

export interface FilterAutoCompleteCompleteEvent {
  query: string;
}

defineOptions({ name: 'FilterAutoComplete' });

const props = withDefaults(
  defineProps<{
    appendTo?: 'self';
    ariaLabel?: string;
    disabled?: boolean;
    forceSelection?: boolean;
    inputId?: string;
    name?: string;
    optionLabel?: string | ((option: TOption) => string);
    placeholder: string;
    showClear?: boolean;
    suggestions: readonly TOption[];
  }>(),
  {
    appendTo: undefined,
    ariaLabel: undefined,
    disabled: false,
    forceSelection: false,
    inputId: undefined,
    name: undefined,
    optionLabel: undefined,
    showClear: false,
  },
);

const model = defineModel<TModel>({ required: true });

const emit = defineEmits<{
  complete: [event: FilterAutoCompleteCompleteEvent];
}>();

// The clear icon overlays the input text, so give it an opaque surface
// backing to keep it readable over long values.
const clearIconPt = {
  class: 'box-content bg-surface-primary px-1',
} as const;

// The token's px-3 (utilities layer) overrides the theme's reserved
// clear-icon padding (primevue layer), so restore it for clearable inputs
// to truncate text before it reaches the icon.
const passThrough = computed(() => {
  const base =
    props.appendTo === 'self'
      ? giTiempoSelfAppendedAutoCompleteDropdownPt
      : giTiempoAutoCompleteDropdownPt;

  if (!props.showClear) {
    return { ...base, clearIcon: clearIconPt };
  }

  return {
    ...base,
    clearIcon: clearIconPt,
    pcInputText: {
      ...base.pcInputText,
      root: {
        ...base.pcInputText?.root,
        class: [base.pcInputText?.root?.class, 'pr-9']
          .filter(Boolean)
          .join(' '),
      },
    },
  };
});

const mutableSuggestions = computed(() => [...props.suggestions]);
</script>

<template>
  <AutoComplete
    v-model="model"
    :append-to="appendTo"
    :aria-label="ariaLabel"
    complete-on-focus
    :disabled="disabled"
    dropdown
    dropdown-mode="blank"
    :force-selection="forceSelection"
    :input-id="inputId"
    :min-length="0"
    :name="name"
    :option-label="optionLabel"
    :placeholder="placeholder"
    :pt="passThrough"
    :show-clear="showClear"
    :suggestions="mutableSuggestions"
    @complete="emit('complete', $event)"
  >
    <template
      v-if="$slots.option"
      #option="slotProps"
    >
      <slot
        name="option"
        v-bind="slotProps"
      />
    </template>
  </AutoComplete>
</template>
