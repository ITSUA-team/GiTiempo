import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { describe, expect, it } from 'vitest';
import type { SavedReport } from '@gitiempo/shared';
import SavedReportsBar from './SavedReportsBar.vue';

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

function mountBar(props: Partial<InstanceType<typeof SavedReportsBar>['$props']> = {}) {
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

describe('SavedReportsBar tabs', () => {
  it('renders one tab per preset', () => {
    const wrapper = mountBar();

    expect(wrapper.find('[data-testid="saved-report-tab-preset-1"]').text()).toContain(
      'Monthly billing',
    );
    expect(wrapper.find('[data-testid="saved-report-tab-preset-2"]').text()).toContain(
      'Team workload',
    );
  });

  it('distinguishes the active tab', () => {
    const wrapper = mountBar({ activeId: 'preset-1' });

    const active = wrapper.find('[data-testid="saved-report-tab-preset-1"]');
    const inactive = wrapper.find('[data-testid="saved-report-tab-preset-2"]');

    expect(active.classes().join(' ')).toContain('bg-accent-tint');
    expect(inactive.classes().join(' ')).not.toContain('bg-accent-tint');
    expect(active.find('.pi-bookmark').exists()).toBe(true);
  });

  it('emits select when a tab is activated', async () => {
    const wrapper = mountBar();

    await wrapper.find('[data-testid="saved-report-tab-preset-2"]').trigger('click');

    expect(wrapper.emitted('select')).toEqual([['preset-2']]);
  });

  it('emits new when New report is activated', async () => {
    const wrapper = mountBar();

    await wrapper.find('[data-testid="saved-report-new"]').trigger('click');

    expect(wrapper.emitted('new')).toHaveLength(1);
  });
});

describe('SavedReportsBar dirty state', () => {
  it('hides the indicator when the view matches the preset', () => {
    const wrapper = mountBar({ activeId: 'preset-1' });

    expect(wrapper.find('[data-testid="saved-report-dirty"]').exists()).toBe(false);
  });

  it('shows the indicator when the view has diverged', () => {
    const wrapper = mountBar({ activeId: 'preset-1', isDirty: true });

    expect(wrapper.find('[data-testid="saved-report-dirty"]').text()).toContain(
      'Unsaved changes',
    );
  });
});

describe('SavedReportsBar saving', () => {
  it('disables Save when nothing is loaded', () => {
    const wrapper = mountBar({ isDirty: true });

    expect(
      wrapper.find('[data-testid="saved-report-save"]').attributes('disabled'),
    ).toBeDefined();
  });

  it('disables Save when the loaded preset is unchanged', () => {
    const wrapper = mountBar({ activeId: 'preset-1' });

    expect(
      wrapper.find('[data-testid="saved-report-save"]').attributes('disabled'),
    ).toBeDefined();
  });

  it('enables Save for a dirty loaded preset and emits on click', async () => {
    const wrapper = mountBar({ activeId: 'preset-1', isDirty: true });
    const save = wrapper.find('[data-testid="saved-report-save"]');

    expect(save.attributes('disabled')).toBeUndefined();
    await save.trigger('click');

    expect(wrapper.emitted('save')).toHaveLength(1);
  });

  it('disables Save while a save is in flight', () => {
    const wrapper = mountBar({
      activeId: 'preset-1',
      isDirty: true,
      isSaving: true,
    });

    expect(
      wrapper.find('[data-testid="saved-report-save"]').attributes('disabled'),
    ).toBeDefined();
  });

  it('shows an error message when saving failed', () => {
    const wrapper = mountBar({
      error: 'A saved report named "Monthly billing" already exists',
    });

    expect(wrapper.find('[data-testid="saved-report-error"]').text()).toContain(
      'already exists',
    );
  });
});

describe('SavedReportsBar save as new', () => {
  it('asks for a name before emitting', async () => {
    const wrapper = mountBar();

    await wrapper.find('[data-testid="saved-report-save-as"]').trigger('click');

    expect(wrapper.emitted('saveAsNew')).toBeUndefined();
    expect(
      document.querySelector('[data-testid="saved-report-name-input"]'),
    ).not.toBeNull();
  });

  it('emits the trimmed name on confirm', async () => {
    const wrapper = mountBar();
    await wrapper.find('[data-testid="saved-report-save-as"]').trigger('click');

    await wrapper
      .findComponent('[data-testid="saved-report-name-input"]')
      .setValue('  Client hours  ');
    await wrapper
      .findComponent('[data-testid="saved-report-name-confirm"]')
      .trigger('click');

    expect(wrapper.emitted('saveAsNew')).toEqual([['Client hours']]);
  });

  it('does not emit for a blank name', async () => {
    const wrapper = mountBar();
    await wrapper.find('[data-testid="saved-report-save-as"]').trigger('click');

    await wrapper
      .findComponent('[data-testid="saved-report-name-input"]')
      .setValue('   ');
    await wrapper
      .findComponent('[data-testid="saved-report-name-confirm"]')
      .trigger('click');

    expect(wrapper.emitted('saveAsNew')).toBeUndefined();
  });

  it('does not offer the overflow menu without a loaded preset', () => {
    const wrapper = mountBar();

    expect(wrapper.find('[data-testid="saved-report-overflow"]').exists()).toBe(
      false,
    );
  });

  it('offers the overflow menu for the loaded preset', () => {
    const wrapper = mountBar({ activeId: 'preset-1' });

    expect(wrapper.find('[data-testid="saved-report-overflow"]').exists()).toBe(
      true,
    );
  });
});
