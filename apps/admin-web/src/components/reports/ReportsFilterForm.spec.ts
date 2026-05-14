import { flushPromises, mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { giTiempoPrimeVueOptions } from '@gitiempo/web-config/theme';

import ReportsFilterForm from './ReportsFilterForm.vue';

function mountReportsFilterForm(dateRange: [Date | null, Date | null] | null) {
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
});
