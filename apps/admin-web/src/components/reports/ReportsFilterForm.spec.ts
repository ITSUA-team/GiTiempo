import { flushPromises, mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { giTiempoPrimeVueOptions } from '@gitiempo/web-config/theme';

import ReportsFilterForm from './ReportsFilterForm.vue';

function mountReportsFilterForm(
  dateRange: [Date | null, Date | null] | null,
  options: { stubAutocomplete?: boolean } = {},
) {
  return mount(ReportsFilterForm, {
    props: {
      dateRange,
      groupBy: 'project',
      memberId: null,
      memberOptions: [{ label: 'Alex Admin', value: '33333333-3333-4333-8333-333333333333' }],
      projectId: null,
      projectOptions: [{ label: 'Project Orion', value: '11111111-1111-4111-8111-111111111111' }],
    },
    global: {
      plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
      stubs: options.stubAutocomplete
        ? {
            AutocompleteField: {
              emits: ['update:modelValue'],
              props: [
                'disabled',
                'inputId',
                'label',
                'modelValue',
                'name',
                'options',
                'placeholder',
              ],
              template: `
                <label>
                  <span>{{ label }}</span>
                  <select
                    :data-testid="inputId"
                    :disabled="disabled"
                    :name="name"
                    :value="modelValue"
                    @change="$emit('update:modelValue', $event.target.value || null)"
                  >
                    <option
                      v-for="option in options"
                      :key="String(option.value)"
                      :value="option.value ?? ''"
                    >{{ option.label }}</option>
                  </select>
                </label>
              `,
            },
          }
        : {},
    },
  });
}

describe('ReportsFilterForm', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: false,
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    });
  });

  it('shows date range validation feedback for an end-before-start range', async () => {
    const wrapper = mountReportsFilterForm([
      new Date('2026-05-03T12:00:00.000Z'),
      new Date('2026-05-02T12:00:00.000Z'),
    ]);

    await flushPromises();

    expect(wrapper.text()).toContain('End date must be after the start date.');
    expect(wrapper.getComponent({ name: 'DatePicker' }).props('invalid')).toBe(true);
  });

  it('renders report setup controls with autocomplete fields', async () => {
    const wrapper = mountReportsFilterForm([
      new Date('2026-05-01T12:00:00.000Z'),
      new Date('2026-05-02T12:00:00.000Z'),
    ], { stubAutocomplete: true });

    await flushPromises();

    expect(wrapper.get('[data-testid="reports-project"]').attributes('name')).toBe('projectId');
    expect(wrapper.get('[data-testid="reports-member"]').attributes('name')).toBe('memberId');
    expect(wrapper.get('[data-testid="reports-group-by"]').attributes('name')).toBe('groupBy');
    expect(wrapper.text()).toContain('Project');
    expect(wrapper.text()).toContain('Member');
    expect(wrapper.text()).toContain('Group by');

    await wrapper.get('[data-testid="reports-project"]').setValue('11111111-1111-4111-8111-111111111111');
    await wrapper.get('[data-testid="reports-member"]').setValue('33333333-3333-4333-8333-333333333333');
    await wrapper.get('[data-testid="reports-group-by"]').setValue('user');

    expect(wrapper.emitted('update:projectId')).toEqual([
      ['11111111-1111-4111-8111-111111111111'],
    ]);
    expect(wrapper.emitted('update:memberId')).toEqual([
      ['33333333-3333-4333-8333-333333333333'],
    ]);
    expect(wrapper.emitted('update:groupBy')).toEqual([['user']]);
  });
});
