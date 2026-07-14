// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { describe, expect, it } from 'vitest';

import ManagementTableAssignmentFilter from './ManagementTableAssignmentFilter.vue';
import { managementTableSelfAppendedFilterAutoCompleteOverlayStyle } from './management-table';

const options = [
  { label: 'Billing API', value: 'project-2' },
  { label: 'Project Orion', value: 'project-1' },
];

const autoCompleteStub = {
  name: 'AutoComplete',
  emits: ['complete', 'update:modelValue'],
  props: {
    appendTo: String,
    ariaLabel: String,
    completeOnFocus: Boolean,
    dropdown: Boolean,
    dropdownMode: String,
    forceSelection: Boolean,
    inputId: String,
    minLength: Number,
    modelValue: Array,
    multiple: Boolean,
    optionLabel: Function,
    placeholder: String,
    pt: Object,
    showClear: Boolean,
    suggestions: Array,
  },
  template: `<div data-testid="assignment-autocomplete">
    <span v-for="suggestion in suggestions" :key="suggestion">
      {{ optionLabel ? optionLabel(suggestion) : suggestion }}
    </span>
  </div>`,
};

function mountFilter(props: Partial<InstanceType<typeof ManagementTableAssignmentFilter>['$props']> = {}) {
  return mount(ManagementTableAssignmentFilter, {
    props: {
      modelValue: [],
      options,
      placeholder: 'All projects',
      ...props,
    },
    global: {
      stubs: {
        AutoComplete: autoCompleteStub,
      },
    },
  });
}

describe('ManagementTableAssignmentFilter', () => {
  it('uses one multiple autocomplete contract for assignment filters', async () => {
    const wrapper = mountFilter({ ariaLabel: 'Filter assigned projects' });
    const autoComplete = wrapper.getComponent({ name: 'AutoComplete' });

    expect(autoComplete.props('multiple')).toBe(true);
    expect(autoComplete.props('dropdown')).toBe(true);
    expect(autoComplete.props('dropdownMode')).toBe('blank');
    expect(autoComplete.props('forceSelection')).toBe(true);
    expect(autoComplete.props('completeOnFocus')).toBe(true);
    expect(autoComplete.props('placeholder')).toBe('All projects');
    expect(autoComplete.props('ariaLabel')).toBe('Filter assigned projects');
    expect(autoComplete.props('pt')).toMatchObject({
      overlay: { class: 'overflow-hidden' },
      pcChip: {
        root: { class: expect.stringContaining('bg-accent-tint') },
      },
    });

    autoComplete.vm.$emit('complete', { query: '' });
    await nextTick();

    expect(autoComplete.props('suggestions')).toEqual(['project-2', 'project-1']);
    expect(wrapper.text()).toContain('Billing API');
    expect(wrapper.text()).toContain('Project Orion');

    autoComplete.vm.$emit('complete', { query: 'orion' });
    await nextTick();

    expect(autoComplete.props('suggestions')).toEqual(['project-1']);

    autoComplete.vm.$emit('update:modelValue', ['project-1']);

    expect(wrapper.emitted('update:modelValue')).toEqual([[['project-1']]]);
  });

  it('uses the same control with self-appended overlay sizing on mobile filters', () => {
    const wrapper = mountFilter({ appendTo: 'self', inputId: 'mobile-projects-filter' });
    const autoComplete = wrapper.getComponent({ name: 'AutoComplete' });

    expect(autoComplete.props('appendTo')).toBe('self');
    expect(autoComplete.props('inputId')).toBe('mobile-projects-filter');
    expect(autoComplete.props('pt')).toMatchObject({
      overlay: {
        class: 'overflow-hidden w-full max-w-full',
        style: managementTableSelfAppendedFilterAutoCompleteOverlayStyle,
      },
    });
  });
});
