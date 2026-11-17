import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PrimeVue from 'primevue/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { giTiempoPrimeVueOptions } from '@gitiempo/web-config/theme';

import { Form } from '@primevue/forms';

import { useAuthStore } from '@/stores/auth';

const testMocks = vi.hoisted(() => ({
  createInvite: vi.fn(),
  errorToast: vi.fn(),
  successToast: vi.fn(),
}));

vi.mock('@/services/admin-members-client', () => ({
  adminMembersClient: {
    createInvite: testMocks.createInvite,
  },
}));

vi.mock('@/composables/feedback/useToasts', () => ({
  useToasts: () => ({
    errorToast: testMocks.errorToast,
    successToast: testMocks.successToast,
  }),
}));

import MemberInviteDialog from './MemberInviteDialog.vue';

function token(claims: Record<string, unknown> = { sub: 'admin', workspaceId: 'A', role: 'admin' }) {
  return `header.${btoa(JSON.stringify(claims))}.signature`;
}

const DialogStub = {
  emits: ['update:visible'],
  props: {
    closable: { type: Boolean, default: true },
    dismissableMask: { type: Boolean, default: false },
    header: { type: String, default: '' },
    modal: { type: Boolean, default: false },
    pt: { type: Object, default: () => ({}) },
    style: { type: Object, default: () => ({}) },
    visible: { type: Boolean, default: false },
  },
  template:
    '<div v-if="visible" data-testid="invite-dialog" :data-closable="String(closable)" :data-dismissable-mask="String(dismissableMask)" :data-pt-root="pt && pt.root ? pt.root : \'\'"><button data-testid="dialog-close" type="button" @click="$emit(\'update:visible\', false)">Close</button><slot /></div>',
};

describe('MemberInviteDialog', () => {
  beforeEach(() => {
    testMocks.createInvite.mockReset();
    testMocks.errorToast.mockReset();
    testMocks.successToast.mockReset();
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation(() => ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: false,
        media: '',
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    { sub: 'admin', workspaceId: 'A', role: 'member' },
    { workspaceId: 'A', role: 'admin' },
    { sub: 'admin', role: 'admin' },
    { sub: 'admin', workspaceId: 'A' },
  ])('blocks invite submits without complete admin claims: %s', async (claims) => {
    const pinia = createPinia();
    setActivePinia(pinia);
    useAuthStore(pinia).accessToken = token(claims);
    const wrapper = mount(MemberInviteDialog, {
      props: { visible: true },
      global: {
        plugins: [pinia, [PrimeVue, giTiempoPrimeVueOptions]],
        stubs: { AppDialog: { name: 'AppDialog', props: ['visible'], template: '<div><slot /></div>' } },
      },
    });
    const form = wrapper.getComponent(Form);
    expect(wrapper.getComponent({ name: 'AppDialog' }).props('visible')).toBe(false);
    form.vm.$emit('submit', {
      valid: true, values: { email: 'test@example.com', role: 'member' }, reset: vi.fn(),
    });
    await flushPromises();
    expect(testMocks.createInvite).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('rejects a validated submit after role loss while the old profile remains admin', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const auth = useAuthStore(pinia);
    auth.accessToken = token();
    const wrapper = mount(MemberInviteDialog, {
      props: { visible: true },
      global: {
        plugins: [pinia, [PrimeVue, giTiempoPrimeVueOptions]],
        stubs: { Dialog: DialogStub },
      },
    });
    const form = wrapper.getComponent(Form);
    auth.accessToken = token({ sub: 'admin', workspaceId: 'A', role: 'member' });
    form.vm.$emit('submit', {
      valid: true, values: { email: 'test@example.com', role: 'member' }, reset: vi.fn(),
    });
    await flushPromises();
    expect(testMocks.createInvite).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="invite-dialog"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('shows a role validation message and blocks submit until a role is chosen', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    useAuthStore(pinia).accessToken = token();

    const wrapper = mount(MemberInviteDialog, {
      props: {
        visible: true,
      },
      global: {
        plugins: [pinia, [PrimeVue, giTiempoPrimeVueOptions]],
        stubs: {
          Dialog: DialogStub,
        },
      },
    });

    await wrapper.get('input#invite-email').setValue('new-member@example.com');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(testMocks.createInvite).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Select a role.');
  });

  it('closes and resets a successful invite without duplicate success feedback', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    useAuthStore(pinia).accessToken = token();
    const wrapper = mount(MemberInviteDialog, {
      props: { visible: true },
      global: {
        plugins: [pinia, [PrimeVue, giTiempoPrimeVueOptions]],
        stubs: { Dialog: DialogStub },
      },
    });
    const reset = vi.fn();
    const values = { email: 'new-member@example.com', role: 'member' };
    wrapper.getComponent(Form).vm.$emit('submit', { valid: true, values, reset });
    await flushPromises();

    expect(testMocks.createInvite).toHaveBeenCalledExactlyOnceWith(values);
    expect(reset).toHaveBeenCalledOnce();
    expect(wrapper.emitted('update:visible')).toEqual([[false]]);
    expect(wrapper.emitted('created')).toEqual([[]]);
    expect(testMocks.successToast).not.toHaveBeenCalled();
    expect(testMocks.errorToast).not.toHaveBeenCalled();
  });

  it('shows only the primary invite action in the popup form', () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    useAuthStore(pinia).accessToken = token();

    const wrapper = mount(MemberInviteDialog, {
      props: {
        visible: true,
      },
      global: {
        plugins: [pinia, [PrimeVue, giTiempoPrimeVueOptions]],
        stubs: {
          Dialog: DialogStub,
        },
      },
    });
    const dialog = wrapper.get('[data-testid="invite-dialog"]');

    expect(wrapper.text()).toContain('Send Invite');
    expect(wrapper.text()).not.toContain('Cancel');
    expect(dialog.attributes('data-closable')).toBe('true');
    expect(dialog.attributes('data-dismissable-mask')).toBe('true');
    expect(dialog.attributes('data-pt-root')).toBe(
      'w-[min(480px,calc(100vw-2rem))]',
    );
  });

  it('resets the invite form when dismissed through dialog close', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    useAuthStore(pinia).accessToken = token();

    const wrapper = mount(MemberInviteDialog, {
      props: {
        visible: true,
      },
      global: {
        plugins: [pinia, [PrimeVue, giTiempoPrimeVueOptions]],
        stubs: {
          Dialog: DialogStub,
        },
      },
    });

    await wrapper.get('input#invite-email').setValue('new-member@example.com');
    await wrapper.get('[data-testid="dialog-close"]').trigger('click');
    await wrapper.setProps({ visible: false });
    await wrapper.setProps({ visible: true });

    expect(wrapper.emitted('update:visible')?.[0]).toEqual([false]);
    expect((wrapper.get('input#invite-email').element as HTMLInputElement).value).toBe('');
  });
});
