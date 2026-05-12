import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PrimeVue from 'primevue/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { giTiempoPrimeVueOptions } from '@gitiempo/web-config/theme';

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

vi.mock('@/composables/useToasts', () => ({
  useToasts: () => ({
    errorToast: testMocks.errorToast,
    successToast: testMocks.successToast,
  }),
}));

import MemberInviteDialog from './MemberInviteDialog.vue';

const DialogStub = {
  props: {
    header: { type: String, default: '' },
    modal: { type: Boolean, default: false },
    style: { type: Object, default: () => ({}) },
    visible: { type: Boolean, default: false },
  },
  template: '<div v-if="visible"><slot /></div>',
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

  it('shows a role validation message and blocks submit until a role is chosen', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const authStore = useAuthStore(pinia);
    authStore.accessToken = 'access-token';

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
});
