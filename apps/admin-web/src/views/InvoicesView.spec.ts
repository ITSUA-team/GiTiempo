import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import InvoicesView from './InvoicesView.vue';

function mountInvoicesView() {
  return mount(InvoicesView, {
    global: {
      stubs: {
        Button: {
          emits: ['click'],
          props: ['label'],
          template: '<button type="button" @click="$emit(\'click\')">{{ label }}</button>',
        },
        Dialog: {
          emits: ['update:visible'],
          props: ['visible'],
          template: '<section v-if="visible" data-testid="invoice-dialog"><slot name="header" /><slot /><slot name="footer" /></section>',
        },
        EmptyStateBlock: {
          props: ['title', 'description'],
          template: '<div data-testid="invoice-empty-state"><h2>{{ title }}</h2><p>{{ description }}</p></div>',
        },
        EntryActionButton: {
          emits: ['click'],
          props: ['label'],
          template: '<button v-bind="$attrs" type="button" :aria-label="label" @click="$emit(\'click\')"></button>',
        },
        IconField: {
          template: '<label><slot /></label>',
        },
        InputIcon: {
          template: '<span />',
        },
        InputText: {
          emits: ['update:modelValue'],
          props: ['ariaLabel', 'modelValue', 'placeholder'],
          template: '<input :aria-label="ariaLabel" :placeholder="placeholder" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        SectionHeader: {
          props: ['title'],
          template: '<header><h2>{{ title }}</h2><slot name="actions" /></header>',
        },
        SurfaceCard: {
          template: '<section><slot /></section>',
        },
      },
    },
  });
}

describe('InvoicesView', () => {
  it('renders the create action beside table search without the old page scaffold', async () => {
    const wrapper = mountInvoicesView();
    const search = wrapper.get('input[aria-label="Search invoices"]');
    const createButton = wrapper.get('[data-testid="invoices-table-create"]');

    expect(wrapper.text()).toContain('Invoices Table');
    expect(wrapper.text()).not.toContain('Route scaffold ready');
    expect(search.attributes('placeholder')).toBe('Search invoices');
    expect(createButton.attributes('aria-label')).toBe('Create invoice');
    expect(createButton.element.parentElement?.contains(search.element)).toBe(true);
    expect(wrapper.find('[data-testid="invoice-dialog"]').exists()).toBe(false);

    await createButton.trigger('click');

    expect(wrapper.get('[data-testid="invoice-dialog"]').text()).toContain('Invoice');
  });
});
