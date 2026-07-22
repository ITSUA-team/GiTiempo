import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SavedReport } from '@gitiempo/shared';
import SavedReportsBar from './SavedReportsBar.vue';
import type * as WebShared from '@gitiempo/web-shared';

vi.mock('@gitiempo/web-shared', async (importOriginal) => {
  const actual = await importOriginal<typeof WebShared>();
  const { ref } = await import('vue');

  return {
    ...actual,
    useIsMobileViewport: () => ref(true),
  };
});

const config = {
  dateRange: { kind: 'relative' as const, period: 'this_month' as const },
  filters: {
    activity: 'any' as const,
    billable: 'any' as const,
    billableShare: 'any' as const,
    global: '',
    hours: 'any' as const,
  },
  grouping: ['project' as const],
  memberId: null,
  projectId: null,
};

function makePreset(id: string, name: string): SavedReport {
  return {
    config,
    createdAt: '2026-07-01T10:00:00.000Z',
    createdBy: null,
    id,
    name,
    updatedAt: '2026-07-01T10:00:00.000Z',
  };
}

const presets = [
  makePreset('preset-1', 'Monthly billing'),
  makePreset('preset-2', 'Team workload'),
];

function mountBar(
  props: Partial<InstanceType<typeof SavedReportsBar>['$props']> = {},
) {
  return mount(SavedReportsBar, {
    global: { plugins: [PrimeVue] },
    props: {
      activeId: null,
      error: null,
      isDirty: false,
      isSaving: false,
      presets,
      ...props,
    },
  });
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('SavedReportsBar mobile layout', () => {
  it('renders the pills in a scroll strip with fixed manage and new buttons', () => {
    const wrapper = mountBar();

    const strip = wrapper.find('[data-testid="saved-reports-strip"]');
    expect(
      strip.find('[data-testid="saved-report-tab-preset-1"]').exists(),
    ).toBe(true);
    expect(wrapper.find('[data-testid="saved-reports-manage"]').exists()).toBe(
      true,
    );
    expect(wrapper.find('[data-testid="saved-report-new"]').text()).toBe('');
  });

  it('hides the manage button when there are no presets', () => {
    const wrapper = mountBar({ presets: [] });

    expect(wrapper.find('[data-testid="saved-reports-manage"]').exists()).toBe(
      false,
    );
  });

  it('emits new from the plus button', async () => {
    const wrapper = mountBar();

    await wrapper.find('[data-testid="saved-report-new"]').trigger('click');

    expect(wrapper.emitted('new')).toHaveLength(1);
  });

  it('emits select when a pill is tapped', async () => {
    const wrapper = mountBar();

    await wrapper
      .find('[data-testid="saved-report-tab-preset-2"]')
      .trigger('click');

    expect(wrapper.emitted('select')).toEqual([['preset-2']]);
  });

  it('opens the save sheet from Save as…', async () => {
    const wrapper = mountBar();

    expect(
      document.querySelector('[data-testid="save-sheet-option-new"]'),
    ).toBeNull();

    await wrapper.find('[data-testid="saved-report-save-as"]').trigger('click');

    expect(
      document.querySelector('[data-testid="save-sheet-option-new"]'),
    ).not.toBeNull();
  });

  it('relays saveAsNew from the save sheet', async () => {
    const wrapper = mountBar();
    await wrapper.find('[data-testid="saved-report-save-as"]').trigger('click');

    await wrapper
      .findComponent('[data-testid="save-sheet-name-input"]')
      .setValue('  Client hours  ');
    await wrapper
      .findComponent('[data-testid="save-sheet-confirm"]')
      .trigger('click');

    expect(wrapper.emitted('saveAsNew')).toEqual([['Client hours']]);
  });

  it('opens the manage sheet listing every preset', async () => {
    const wrapper = mountBar({ activeId: 'preset-1' });

    await wrapper.find('[data-testid="saved-reports-manage"]').trigger('click');

    expect(
      document.querySelector('[data-testid="saved-sheet-row-preset-1"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-testid="saved-sheet-row-preset-2"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-testid="saved-sheet-active-check"]'),
    ).not.toBeNull();
  });

  it('emits save directly from the Save pill for a dirty loaded preset', async () => {
    const wrapper = mountBar({ activeId: 'preset-1', isDirty: true });

    await wrapper.find('[data-testid="saved-report-save"]').trigger('click');

    expect(wrapper.emitted('save')).toHaveLength(1);
  });
});
