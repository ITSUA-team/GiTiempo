import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import InvoicesView from './InvoicesView.vue';

function mountInvoicesView() {
  return mount(InvoicesView);
}

describe('InvoicesView', () => {
  it('keeps the deferred invoice route free of temporary invoice UI', () => {
    const wrapper = mountInvoicesView();
    const deferredMarker = wrapper.get('[data-testid="invoices-deferred"]');

    expect(wrapper.text()).toBe('');
    expect(deferredMarker.attributes('hidden')).toBeDefined();
    expect(wrapper.find('input[aria-label="Search invoices"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="invoices-table-create"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="invoice-dialog"]').exists()).toBe(false);
  });
});
