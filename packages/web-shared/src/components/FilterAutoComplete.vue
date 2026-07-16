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
// backing to keep it readable over long values. end-10 keeps it 4px from
// the w-9 dropdown trigger instead of the wider theme default offset.
const clearIconPt = {
  class: 'box-content bg-surface-primary end-10',
} as const;

// PrimeVue flags the root with p-autocomplete-clearable only while the
// clear icon is rendered, so reserve input padding for the icon in that
// state alone — otherwise text runs the full width up to the chevron.
const clearableInputClass = '[.p-autocomplete-clearable_&]:pr-7';

const passThrough = computed(() => {
  const base =
    props.appendTo === 'self'
      ? giTiempoSelfAppendedAutoCompleteDropdownPt
      : giTiempoAutoCompleteDropdownPt;

  // Body-appended overlays get an inline min-width equal to the anchor,
  // which for AutoComplete is the text input — excluding the w-9 dropdown
  // trigger. max-w-0 loses to min-width (pinning the content width to the
  // input), and box-content + pr-9 widen the panel border-box to the full
  // field; the list stretches into that padding (-mr-9) so options span
  // the whole panel.
  const overlay =
    props.appendTo === 'self'
      ? base.overlay
      : {
        ...base.overlay,
        class: [base.overlay?.class, 'box-content max-w-0 pr-9']
          .filter(Boolean)
          .join(' '),
      };
  const listContainer =
    props.appendTo === 'self'
      ? base.listContainer
      : { ...base.listContainer, class: '-mr-9 overflow-x-hidden' };

  return {
    ...base,
    clearIcon: clearIconPt,
    listContainer,
    overlay,
    pcInputText: {
      ...base.pcInputText,
      root: {
        ...base.pcInputText?.root,
        class: [base.pcInputText?.root?.class, clearableInputClass]
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
