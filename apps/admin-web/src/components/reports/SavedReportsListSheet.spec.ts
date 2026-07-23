import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { afterEach, describe, expect, it } from 'vitest';
import type { SavedReport } from '@gitiempo/shared';
import SavedReportsListSheet from './SavedReportsListSheet.vue';

const config = {
  dateRange: {
    dateFrom: '2026-07-01T00:00:00.000Z',
    dateTo: '2026-07-15T00:00:00.000Z',
    kind: 'absolute' as const,
  },
  filters: {
    activity: 'any' as const,
    billable: 'any' as const,
    billableShare: 'any' as const,
    global: '',
    hours: 'any' as const,
  },
  grouping: ['project' as const, 'user' as const],
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

async function mountSheet(
  props: Partial<InstanceType<typeof SavedReportsListSheet>['$props']> = {},
) {
  const wrapper = mount(SavedReportsListSheet, {
    global: { plugins: [PrimeVue] },
    props: {
      activeId: 'preset-1',
      presets,
      visible: false,
      ...props,
    },
  });

  // Dialog only mounts its content when visibility transitions to true.
  await wrapper.setProps({ visible: true });
  return wrapper;
}

function query(selector: string): HTMLElement | null {
  return document.querySelector(selector);
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('SavedReportsListSheet', () => {
  it('renders a row per preset with its config summary', async () => {
    await mountSheet();

    const row = query('[data-testid="saved-sheet-row-preset-1"]');
    expect(row?.textContent).toContain('Monthly billing');
    expect(row?.textContent).toContain('Jul 1 – Jul 15');
    expect(row?.textContent).toContain('Project › Member');
  });

  it('marks only the active row with a check', async () => {
    await mountSheet();

    const active = query('[data-testid="saved-sheet-row-preset-1"]');
    const idle = query('[data-testid="saved-sheet-row-preset-2"]');
    expect(
      active?.querySelector('[data-testid="saved-sheet-active-check"]'),
    ).not.toBeNull();
    expect(
      idle?.querySelector('[data-testid="saved-sheet-active-check"]'),
    ).toBeNull();
  });

  it('applies a preset on tap and closes', async () => {
    const wrapper = await mountSheet();

    query('[data-testid="saved-sheet-row-preset-2"]')
      ?.querySelector('button')
      ?.click();
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('select')).toEqual([['preset-2']]);
    expect(wrapper.emitted('update:visible')).toEqual([[false]]);
  });

  it('offers a per-row overflow with rename and delete', async () => {
    const wrapper = await mountSheet();

    query('[data-testid="saved-sheet-overflow-preset-2"]')?.click();
    await wrapper.vm.$nextTick();

    const menuText = document.body.textContent ?? '';
    expect(menuText).toContain('Rename');
    expect(menuText).toContain('Delete');
  });

  it('starts a new report and closes', async () => {
    const wrapper = await mountSheet();

    query('[data-testid="saved-sheet-new"]')?.click();
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('new')).toHaveLength(1);
    expect(wrapper.emitted('update:visible')).toEqual([[false]]);
  });
});
