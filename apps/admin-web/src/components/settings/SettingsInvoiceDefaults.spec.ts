import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import SettingsInvoiceDefaults from './SettingsInvoiceDefaults.vue';

const mocks = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock('@/composables/query', () => ({
  useUpdateWorkspaceSettingsMutation: () => ({ mutateAsync: mocks.save }),
}));
vi.mock('@/services/admin-settings-client', () => ({ getAdminSettingsClient: () => ({}) }));

const field = { props: ['modelValue', 'id', 'inputId'], emits: ['update:modelValue'], template: '<input :id="id || inputId" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' };
function render() {
  return mount(SettingsInvoiceDefaults, {
    props: { scope: { userId: 'admin', workspaceId: 'workspace-a' } },
    global: { stubs: {
      SettingsCard: { template: '<section><slot /></section>' },
      InputText: field, Textarea: field, Select: field, FileUpload: true,
      Message: { template: '<div role="alert"><slot /></div>' },
      Button: { props: ['label', 'disabled', 'type'], template: '<button :type="type || \'button\'" :disabled="disabled">{{ label }}</button>' },
    } },
  });
}

beforeEach(() => { mocks.save.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('invoice billing defaults', () => {
  it('loads a reactive saved profile without mutating its source', async () => {
    const wrapper = render();
    const profile = reactive({ sender: { name: 'Saved Studio', address: '', email: '', taxId: '' }, payment: { method: '', terms: '', beneficiary: '', provider: '', account: '', instructions: '' }, invoicePrefix: 'INV', logo: null });
    await wrapper.setProps({ profile });
    expect(wrapper.get<HTMLInputElement>('#invoice-sender-name').element.value).toBe('Saved Studio');
    await wrapper.get('#invoice-sender-name').setValue('Local edit');
    expect(profile.sender.name).toBe('Saved Studio');
  });

  it('saves edited defaults and clears the dirty state', async () => {
    mocks.save.mockImplementation(async input => input);
    const wrapper = render();
    await wrapper.get('#invoice-sender-name').setValue('Studio');
    await wrapper.get('#invoice-payment-method').setValue('Bank transfer');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ billingProfile: expect.objectContaining({ sender: expect.objectContaining({ name: 'Studio' }) }) }));
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined();
  });

  it('retains drafts when the same scope object is refreshed', async () => {
    const wrapper = render();
    await wrapper.get('#invoice-sender-name').setValue('Local edit');
    await wrapper.setProps({ scope: { userId: 'admin', workspaceId: 'workspace-a' } });
    expect(wrapper.get<HTMLInputElement>('#invoice-sender-name').element.value).toBe('Local edit');
  });

  it('keeps entered values after a rejected save', async () => {
    mocks.save.mockImplementation(async () => { throw new Error('Please retry'); });
    const wrapper = render();
    await wrapper.get('#invoice-sender-name').setValue('Unsaved Studio');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(wrapper.get<HTMLInputElement>('#invoice-sender-name').element.value).toBe('Unsaved Studio');
    expect(wrapper.text()).toContain('Please retry');
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeUndefined();
  });

  it('shows field validation without sending invalid data', async () => {
    const wrapper = render();
    await wrapper.get('#invoice-prefix').setValue('');
    await wrapper.get('form').trigger('submit');
    expect(mocks.save).not.toHaveBeenCalled();
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
  });

  it('ignores logo reads completed after switching workspace', async () => {
    let finish!: () => void;
    vi.stubGlobal('FileReader', class {
      result = 'data:image/png;base64,YQ==';
      onload: (() => void) | null = null;
      readAsDataURL() { finish = () => this.onload?.(); }
    });
    const wrapper = render();
    wrapper.findComponent({ name: 'FileUpload' }).vm.$emit('uploader', { files: [new File(['a'], 'logo.png')] });
    await wrapper.setProps({ scope: { userId: 'admin', workspaceId: 'workspace-b' } });
    finish();
    await flushPromises();
    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined();
  });

  it('ignores a save after leaving and returning to the same workspace', async () => {
    let resolve!: (value: unknown) => void;
    mocks.save.mockReturnValue(new Promise(done => { resolve = done; }));
    const wrapper = render();
    await wrapper.get('#invoice-sender-name').setValue('Old draft');
    await wrapper.get('form').trigger('submit');
    const sent = mocks.save.mock.calls[0][0];
    await wrapper.setProps({ scope: { userId: 'admin', workspaceId: 'workspace-b' } });
    await wrapper.setProps({ scope: { userId: 'admin', workspaceId: 'workspace-a' } });
    resolve(sent);
    await flushPromises();
    expect(wrapper.get<HTMLInputElement>('#invoice-sender-name').element.value).toBe('');
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined();
  });

  it('ignores an old workspace response after switching workspace', async () => {
    let resolve!: (value: unknown) => void;
    mocks.save.mockReturnValue(new Promise(done => { resolve = done; }));
    const wrapper = render();
    await wrapper.get('#invoice-sender-name').setValue('Workspace A');
    await wrapper.get('form').trigger('submit');
    const sent = mocks.save.mock.calls[0][0];
    await wrapper.setProps({ scope: { userId: 'admin', workspaceId: 'workspace-b' } });
    resolve(sent);
    await flushPromises();
    expect(wrapper.get<HTMLInputElement>('#invoice-sender-name').element.value).toBe('');
  });
});
