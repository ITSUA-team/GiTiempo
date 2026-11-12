import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import PrimeVue from 'primevue/config';
import Checkbox from 'primevue/checkbox';
import SelectButton from 'primevue/selectbutton';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InvoiceTimeDisplayMode, InvoiceTimeEntrySummary } from '@gitiempo/shared';
import { giTiempoPrimeVueOptions } from '@gitiempo/web-config/theme';
import InvoiceEditorEntries from './InvoiceEditorEntries.vue';

function entry(id: string, taskId = 'task-a'): InvoiceTimeEntrySummary {
  return {
    id, taskId, taskName: taskId === 'task-a' ? 'Dashboard UX' : 'Invoice editing',
    userId: 'worker', userName: id === 'a1' ? 'Alex' : 'Sam',
    startedAt: '2026-11-01T09:00:00Z', endedAt: '2026-11-01T09:06:00Z',
    durationSeconds: 360, roundedDurationSeconds: 900, description: 'Individual work', isBillable: true,
  };
}
const entries = [entry('a1'), entry('b1', 'task-b'), entry('a2')];
function mountEditor(mobile = false) {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: mobile, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  const selection = ref(['a1', 'b1', 'a2']);
  const mode = ref<InvoiceTimeDisplayMode>('tasks');
  const eligible = ref(entries);
  const unavailable = ref<Array<{id: string; label: string}>>([]);
  const state = ref<'ready' | 'error'>('ready');
  const retry = vi.fn();
  const wrapper = mount(defineComponent({
    components: { InvoiceEditorEntries },
    setup: () => ({ selection, mode, eligible, unavailable, state, retry }),
    template: '<InvoiceEditorEntries v-model="selection" v-model:time-display-mode="mode" :entries="eligible" :unavailable="unavailable" :state="state" @retry="retry" />',
  }), {global: {plugins: [[PrimeVue, giTiempoPrimeVueOptions]]}});
  return {wrapper, selection, mode, eligible, unavailable, state, retry};
}

describe('invoice grouped entry selection', () => {
  beforeEach(() => vi.restoreAllMocks());

  it.each([false, true])('keeps partially and fully excluded tasks restorable across mode changes (mobile=%s)', async mobile => {
    const {wrapper, selection, mode} = mountEditor(mobile);
    const group = () => wrapper.get('[data-task-id="task-a"]');
    expect(group().text()).toContain('2 of 2 entries included');
    expect(group().text()).toContain('30m');
    const expand = group().get('button');
    expect(expand.attributes('aria-expanded')).toBe('false');
    expect(expand.attributes('aria-controls')).toBeDefined();
    expect(group().get('[role="region"]').attributes('id')).toBe(expand.attributes('aria-controls'));
    await expand.trigger('click');
    expect(expand.attributes('aria-expanded')).toBe('true');
    const checks = group().findAllComponents(Checkbox).filter((check: VueWrapper<InstanceType<typeof Checkbox>>) => !check.props('binary'));
    expect(checks).toHaveLength(2);
    await checks[0]!.vm.$emit('update:modelValue', ['b1', 'a2']);
    await flushPromises();
    expect(selection.value).toEqual(['b1', 'a2']);
    expect(group().text()).toContain('1 of 2 entries included');
    expect(group().text()).toContain('15m');
    expect(wrapper.findAll('[role="status"]').some(status => status.text() === '2 of 3 entries included.')).toBe(true);
    expect(wrapper.find('[data-testid="invoice-task-entry-table"]').exists()).toBe(!mobile);
    expect(group().findAll('article')).toHaveLength(mobile ? 2 : 0);
    const selector = wrapper.getComponent(SelectButton);
    expect(selector.attributes('aria-labelledby')).toBe('invoice-time-display-mode-label');
    expect(wrapper.get('#invoice-time-display-mode-label').text()).toBe('Show time by');
    for (const value of ['entries', 'tasks', 'entries', 'tasks']) {
      await selector.vm.$emit('update:modelValue', value);
      await flushPromises();
      expect(selection.value).toEqual(['b1', 'a2']);
    }
    expect(mode.value).toBe('tasks');
    await group().get('button').trigger('click');
    await group().findAllComponents(Checkbox).find((check: VueWrapper<InstanceType<typeof Checkbox>>) => !check.props('binary'))!.vm.$emit('update:modelValue', ['b1']);
    await flushPromises();
    expect(group().text()).toContain('0 of 2 entries included');
    expect(group().text()).toContain('0m');
    await group().findAllComponents(Checkbox).find((check: VueWrapper<InstanceType<typeof Checkbox>>) => !check.props('binary'))!.vm.$emit('update:modelValue', ['b1', 'a1']);
    await flushPromises();
    expect(group().text()).toContain('1 of 2 entries included');
    wrapper.unmount();
  });

  it('scopes mixed-state select-all to the expanded task and retains other and unavailable selections', async () => {
    const {wrapper, selection} = mountEditor();
    selection.value = ['a1', 'b1', 'missing'];
    await flushPromises();
    const group = wrapper.get('[data-task-id="task-a"]');
    await group.get('button').trigger('click');
    const checkbox = group.getComponent(Checkbox);
    expect(checkbox.props('indeterminate')).toBe(true);
    expect(checkbox.find('input').attributes('aria-checked')).toBe('mixed');
    await checkbox.find('input').trigger('change');
    await flushPromises();
    expect(selection.value).toEqual(['b1', 'missing', 'a1', 'a2']);
    await checkbox.find('input').trigger('change');
    await flushPromises();
    expect(selection.value).toEqual(['b1', 'missing']);
    wrapper.unmount();
  });

  it('recomputes grouped hours from refreshed per-entry rounding without changing selection', async () => {
    const {wrapper, eligible, selection} = mountEditor();
    selection.value = ['a1', 'b1'];
    eligible.value = entries.map(row => ({...row, roundedDurationSeconds: 1800}));
    await flushPromises();
    expect(wrapper.get('[data-task-id="task-a"]').text()).toContain('30m');
    expect(selection.value).toEqual(['a1', 'b1']);
    wrapper.unmount();
  });

  it('keeps unavailable entry recovery and failed-read retry available in Task mode', async () => {
    const {wrapper, eligible, unavailable, selection, state, retry} = mountEditor(true);
    unavailable.value = [{id: 'a1', label: 'Dashboard UX'}];
    eligible.value = entries.slice(1);
    await flushPromises();
    expect(wrapper.text()).toContain('Dashboard UX · Unavailable');
    await wrapper.get('[role="alert"] button').trigger('click');
    expect(selection.value).toEqual(['b1', 'a2']);
    state.value = 'error';
    await flushPromises();
    expect(wrapper.text()).toContain('Failed to load eligible entries');
    await wrapper.get('[role="alert"] button').trigger('click');
    expect(retry).toHaveBeenCalledOnce();
    wrapper.unmount();
  });
});
