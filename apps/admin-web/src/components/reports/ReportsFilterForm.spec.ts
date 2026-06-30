import { flushPromises, mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import AutoComplete from 'primevue/autocomplete';
import PrimeVue from 'primevue/config';
import Select from 'primevue/select';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { giTiempoPrimeVueOptions } from '@gitiempo/web-config/theme';

import ReportsFilterForm from './ReportsFilterForm.vue';

function mountReportsFilterForm(
  dateRange: [Date | null, Date | null] | null,
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

  it('renders report setup filters without predefined all-scope values', async () => {
    const wrapper = mountReportsFilterForm(null);
    const autoCompleteControls = wrapper.findAllComponents(AutoComplete);
    const projectFilter = autoCompleteControls[0]!;
    const memberFilter = autoCompleteControls[1]!;
    const groupBySelect = wrapper.getComponent(Select);

    expect(autoCompleteControls).toHaveLength(2);
    expect(wrapper.text()).toContain('Project');
    expect(wrapper.text()).toContain('Member');
    expect(wrapper.text()).toContain('Group by');
    expect(projectFilter.props('modelValue')).toBeNull();
    expect(projectFilter.props('placeholder')).toBe('All projects');
    expect(projectFilter.props('pt')).toMatchObject({
      pcInputText: {
        root: { class: expect.stringContaining('rounded-r-none') },
      },
    });
    expect(memberFilter.props('modelValue')).toBeNull();
    expect(memberFilter.props('placeholder')).toBe('All assigned members');
    expect(memberFilter.props('pt')).toMatchObject({
      pcInputText: {
        root: { class: expect.stringContaining('rounded-r-none') },
      },
    });
    expect(groupBySelect.props('modelValue')).toBe('project');
    expect(groupBySelect.props('options')).toEqual([
      { label: 'Project', value: 'project' },
      { label: 'Member', value: 'user' },
    ]);
    expect(wrapper.getComponent({ name: 'DatePicker' }).props('showClear')).toBe(true);

    projectFilter.vm.$emit('complete', { query: 'orion' });
    memberFilter.vm.$emit('complete', { query: 'alex' });
    await nextTick();

    expect(wrapper.findAllComponents(AutoComplete)[0]?.props('suggestions')).toEqual([
      { label: 'Project Orion', value: '11111111-1111-4111-8111-111111111111' },
    ]);
    expect(wrapper.findAllComponents(AutoComplete)[1]?.props('suggestions')).toEqual([
      { label: 'Alex Admin', value: '33333333-3333-4333-8333-333333333333' },
    ]);

    await projectFilter.vm.$emit('update:modelValue', {
      label: 'Project Orion',
      value: '11111111-1111-4111-8111-111111111111',
    });
    await memberFilter.vm.$emit('update:modelValue', {
      label: 'Alex Admin',
      value: '33333333-3333-4333-8333-333333333333',
    });
    await groupBySelect.vm.$emit('update:modelValue', 'user');

    expect(wrapper.emitted('update:projectId')).toEqual([
      ['11111111-1111-4111-8111-111111111111'],
    ]);
    expect(wrapper.emitted('update:memberId')).toEqual([
      ['33333333-3333-4333-8333-333333333333'],
    ]);
    expect(wrapper.emitted('update:groupBy')).toEqual([['user']]);
  });

  it('clears the selected date range back to the all-dates state', async () => {
    const wrapper = mountReportsFilterForm([
      new Date('2026-05-01T12:00:00.000Z'),
      new Date('2026-05-02T12:00:00.000Z'),
    ]);

    await flushPromises();

    await wrapper.getComponent({ name: 'DatePicker' }).vm.$emit('update:modelValue', null);

    expect(wrapper.emitted('update:dateRange')).toEqual([[null]]);
  });
});
