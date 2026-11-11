import { mount, flushPromises } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PrimeVue from 'primevue/config';
import RadioButton from 'primevue/radiobutton';
import Select from 'primevue/select';
import InvoiceGroups from './InvoiceGroups.vue';
import InvoiceMoveToolbar from './InvoiceMoveToolbar.vue';
const api = vi.hoisted(() => ({ request: vi.fn(), requestJson: vi.fn() }));
vi.mock('@/services/admin-invoices-client', () => ({
  adminInvoicesClient: {
    listGroups: api.requestJson,
    createGroup: (body: unknown) =>
      api.request({ path: '/invoices/groups', method: 'POST', body }),
    updateGroup: api.request,
    deleteGroup: api.request,
    moveInvoices: (body: unknown) =>
      api.request({ path: '/invoices/groups/move', method: 'POST', body }),
  },
}));
describe('Personal invoice groups', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    api.request.mockReset();
    api.request.mockResolvedValue({});
    api.requestJson.mockResolvedValue({
      groups: [{ id: 'group-a', name: 'Retainers', count: 2 }],
      allCount: 3,
      ungroupedCount: 1,
    });
  });
  function render() {
    return mount(InvoiceGroups, {
      props: {
        scope: 'user-a',
      },
      global: { plugins: [PrimeVue], stubs: { Teleport: true } },
    });
  }
  it('selects a personal view and keeps All and Ungrouped available', async () => {
    const wrapper = render();
    await flushPromises();
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Retainers'))!
      .trigger('click');
    expect(wrapper.emitted('select')?.[0]).toEqual(['group-a']);
    expect(wrapper.text()).toContain('Ungrouped');
    expect(wrapper.text()).toContain('All invoices');
  });
  function renderMove(groupId: string | null = null) {
    return mount(InvoiceMoveToolbar, {
      props: {
        scope: 'user-a',
        rows: [{ id: 'invoice-a', groupId }],
        groups: [{ id: 'group-a', name: 'Retainers' }],
        selection: ['invoice-a'],
      },
      global: { plugins: [PrimeVue], stubs: { Teleport: true } },
    });
  }
  it('searches destinations and submits one move', async () => {
    const wrapper = renderMove();
    await wrapper.get('button[aria-label="Move to group"]').trigger('click');
    await wrapper.get('input[aria-label="Search groups"]').setValue('retain');
    expect(wrapper.get('[role="radiogroup"]').text()).not.toContain(
      'Ungrouped',
    );
    wrapper.getComponent(RadioButton).vm.$emit('update:modelValue', 'group-a');
    await flushPromises();
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Move invoice')!
      .trigger('click');
    await flushPromises();
    expect(api.request).toHaveBeenCalledWith({
      path: '/invoices/groups/move',
      method: 'POST',
      body: { invoiceIds: ['invoice-a'], groupId: 'group-a' },
    });
    expect(wrapper.emitted('moved')).toHaveLength(1);
  });
  it('preserves selection when a bulk move fails', async () => {
    api.request.mockRejectedValue(new Error('Unavailable invoice'));
    const wrapper = renderMove('group-a');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Remove from group')!
      .trigger('click');
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toContain(
      'Unavailable invoice',
    );
    expect(wrapper.emitted('update:selection')).toBeUndefined();
    expect(wrapper.emitted('moved')).toBeUndefined();
  });
  it('provides a mobile group picker and desktop rail controls', async () => {
    const wrapper = render();
    await flushPromises();
    const picker = wrapper.findComponent(Select);
    expect(picker.props('ariaLabel')).toBe('Invoice group');
    expect(picker.props('placeholder')).toBe('All invoices');
    picker.vm.$emit('update:modelValue', 'ungrouped');
    await flushPromises();
    expect(wrapper.emitted('select')?.[0]).toEqual(['ungrouped']);
    expect(
      wrapper
        .findAll('button')
        .find((b) => b.text().includes('Retainers'))!
        .classes(),
    ).toContain('sm:flex');
  });
  it('disables the actual current destination when viewing All invoices', async () => {
    const wrapper = renderMove('group-a');
    await wrapper.get('button[aria-label="Move to group"]').trigger('click');
    const current = wrapper
      .findAllComponents(RadioButton)
      .find((option) => option.props('value') === 'group-a')!;
    expect(current.props('disabled')).toBe(true);
    expect(wrapper.text()).toContain('Retainers · Current');
  });
  it('shows a retryable group loading error', async () => {
    api.requestJson.mockRejectedValueOnce(new Error('Groups unavailable'));
    const wrapper = render();
    await flushPromises();
    expect(wrapper.find('[role="alert"]').text()).toContain(
      'Groups unavailable',
    );
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Retry')!
      .trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Retainers');
  });
  it('keeps the mobile picker interactive during a count refresh', async () => {
    const wrapper = render();
    await flushPromises();
    let finish!: (value: unknown) => void;
    api.requestJson.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    await wrapper.setProps({ refreshToken: 1 });
    expect(wrapper.getComponent(Select).props('loading')).toBe(false);
    expect(wrapper.getComponent(Select).props('options')).toContainEqual(expect.objectContaining({ name: 'Retainers' }));
    finish({ groups: [], allCount: 1, ungroupedCount: 1 });
    await flushPromises();
  });

  it('refreshes counts after a move even when invoice rows are unchanged', async () => {
    const wrapper = render();
    await flushPromises();
    const calls = api.requestJson.mock.calls.length;
    await wrapper.setProps({ refreshToken: 1 });
    await flushPromises();
    expect(api.requestJson.mock.calls.length).toBe(calls + 1);
  });
  it('switches both group controls to the newly created personal group', async () => {
    const wrapper = render();
    await flushPromises();
    api.request.mockResolvedValueOnce({ id: 'group-new', name: 'Monthly' });
    api.requestJson.mockResolvedValueOnce({
      groups: [{ id: 'group-new', name: 'Monthly', count: 0 }],
      allCount: 3,
      ungroupedCount: 1,
    });
    await wrapper.get('button[aria-label="Create group"]').trigger('click');
    await wrapper.get('#group-name').setValue('Monthly');
    await wrapper.get('#invoice-group-form').trigger('submit');
    await flushPromises();
    expect(wrapper.emitted('select')).toEqual([['group-new']]);
    expect(wrapper.getComponent(Select).props('modelValue')).toBe('group-new');
    expect(wrapper.findAll('button').find(button => button.text().includes('Monthly'))!
      .attributes('aria-pressed')).toBe('true');
  });
  it('does not select a created group after the account scope changes', async () => {
    let finish!: (value: unknown) => void;
    api.request.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const wrapper = render();
    await flushPromises();
    await wrapper.get('button[aria-label="Create group"]').trigger('click');
    await wrapper.get('#group-name').setValue('Monthly');
    await wrapper.get('#invoice-group-form').trigger('submit');
    await wrapper.setProps({ scope: 'user-b' });
    finish({ id: 'group-old', name: 'Monthly' });
    await flushPromises();
    expect(wrapper.emitted('select')).toBeUndefined();
    expect(wrapper.getComponent(Select).props('modelValue')).toBe(null);
  });
  it('shows duplicate-name failures inside the still-open group dialog', async () => {
    api.request.mockRejectedValueOnce(
      new Error('A group with this name already exists'),
    );
    const wrapper = render();
    await flushPromises();
    await wrapper.get('button[aria-label="Create group"]').trigger('click');
    await wrapper.get('#group-name').setValue('Retainers');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Create group')!
      .trigger('click');
    await flushPromises();
    const dialog = wrapper.get('[role="dialog"]');
    expect(wrapper.emitted('select')).toBeUndefined();
    expect(dialog.get('[role="alert"]').text()).toContain(
      'already have a group',
    );
    expect((dialog.get('#group-name').element as HTMLInputElement).value).toBe(
      'Retainers',
    );
  });
  it('shows delete failures inside its confirmation dialog', async () => {
    api.request.mockRejectedValueOnce(new Error('Delete unavailable'));
    const wrapper = render();
    await flushPromises();
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Retainers'))!
      .trigger('click');
    await wrapper.get('button[aria-label="Delete group"]').trigger('click');
    await wrapper
      .get('[role="dialog"]')
      .findAll('button')
      .find((button) => button.text() === 'Delete group')!
      .trigger('click');
    await flushPromises();
    expect(
      wrapper.get('[role="dialog"]').get('[role="alert"]').text(),
    ).toContain('Delete unavailable');
  });
  it('keeps the latest group load when an older request resolves afterward', async () => {
    let resolveOld!: (value: unknown) => void;
    api.requestJson.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveOld = resolve;
      }),
    );
    const wrapper = render();
    api.requestJson.mockResolvedValue({
      groups: [{ id: 'group-a', name: 'New name', count: 4 }],
      allCount: 4,
      ungroupedCount: 0,
    });
    await wrapper.setProps({ refreshToken: 1 });
    await flushPromises();
    resolveOld({
      groups: [{ id: 'group-a', name: 'Old name', count: 1 }],
      allCount: 1,
      ungroupedCount: 0,
    });
    await flushPromises();
    expect(wrapper.text()).toContain('New name');
    expect(wrapper.text()).not.toContain('Old name');
  });
  it('marks All and Ungrouped active and provides an icon create action', async () => {
    const wrapper = render();
    await flushPromises();
    const all = wrapper
      .findAll('button')
      .find((button) => button.text().includes('All invoices'))!;
    expect(all.attributes('aria-pressed')).toBe('true');
    const ungrouped = wrapper
      .findAll('button')
      .find((button) => button.text().startsWith('Ungrouped'))!;
    await ungrouped.trigger('click');
    expect(ungrouped.attributes('aria-pressed')).toBe('true');
    expect(all.attributes('aria-pressed')).toBe('false');
    expect(
      wrapper.get('button[aria-label="Create group"]').classes(),
    ).toContain('h-[38px]');
  });
  it('opens creation while a custom group is selected without deleting it', async () => {
    const wrapper = render();
    await flushPromises();
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Retainers'))!
      .trigger('click');
    await wrapper.get('button[aria-label="Create group"]').trigger('click');
    expect(wrapper.find('#group-name').exists()).toBe(true);
    expect(api.request).not.toHaveBeenCalled();
  });
});
