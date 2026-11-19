import { enableAutoUnmount, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PrimeVue from 'primevue/config';
import DatePicker from 'primevue/datepicker';

import InvoiceDocumentDates from './InvoiceDocumentDates.vue';

enableAutoUnmount(afterEach);
beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })));
});
afterEach(() => vi.unstubAllGlobals());

function mountDates(issueDate: Date | null, dueDate: Date | null = null) {
  return mount(InvoiceDocumentDates, {
    props: { issueDate, dueDate },
    global: { plugins: [PrimeVue] },
  });
}

describe('InvoiceDocumentDates', () => {
  it('highlights a missing issue date and associates its required message with the input', () => {
    const wrapper = mountDates(null);
    const input = wrapper.get('#invoice-issue-date');

    expect(input.attributes('aria-invalid')).toBe('true');
    expect(input.classes()).toContain('p-invalid');
    expect(input.classes()).toContain('aria-invalid:border-[var(--p-inputtext-invalid-border-color)]');
    expect(input.attributes('aria-describedby')).toBe('invoice-issue-date-error');
    expect(wrapper.get('#invoice-issue-date-error').text()).toBe('Issue date is required.');
  });

  it('clears the issue-date error after selecting a date', async () => {
    const wrapper = mountDates(null);
    const date = new Date(2026, 3, 15);
    const issuePicker = wrapper.findAllComponents(DatePicker)[0]!;

    await issuePicker.vm.$emit('update:modelValue', date);
    expect(wrapper.emitted('update:issueDate')).toEqual([[date]]);
    await wrapper.setProps({ issueDate: date });

    expect(wrapper.get('#invoice-issue-date').attributes('aria-invalid')).toBeUndefined();
    expect(wrapper.get('#invoice-issue-date').attributes('aria-describedby')).toBeUndefined();
    expect(wrapper.find('#invoice-issue-date-error').exists()).toBe(false);
  });

  it('highlights a due date before the issue date and clears the error when corrected', async () => {
    const wrapper = mountDates(new Date(2026, 3, 15), new Date(2026, 3, 14));

    expect(wrapper.get('#invoice-due-date').attributes('aria-invalid')).toBe('true');
    expect(wrapper.get('#invoice-due-date').classes()).toContain('aria-invalid:border-[var(--p-inputtext-invalid-border-color)]');
    expect(wrapper.text()).toContain('Due date must be on or after the issue date.');

    await wrapper.setProps({ dueDate: new Date(2026, 3, 15) });

    expect(wrapper.get('#invoice-due-date').attributes('aria-invalid')).toBeUndefined();
    expect(wrapper.text()).not.toContain('Due date must be on or after the issue date.');
  });

  it('accepts an empty optional due date', () => {
    const wrapper = mountDates(new Date(2026, 3, 15));

    expect(wrapper.get('#invoice-due-date').attributes('aria-invalid')).toBeUndefined();
    expect(wrapper.text()).not.toContain('Due date must be on or after the issue date.');
  });
});
