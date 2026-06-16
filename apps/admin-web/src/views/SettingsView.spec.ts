import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PrimeVue from 'primevue/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { giTiempoPrimeVueOptions } from '@gitiempo/web-config/theme';

import { useAuthStore } from '@/stores/auth';
import { createTestQueryPlugin } from '@/test/query-client';

const testMocks = vi.hoisted(() => ({
  errorToast: vi.fn(),
  getWorkspace: vi.fn(),
  getWorkspaceSettings: vi.fn(),
  successToast: vi.fn(),
  updateWorkspace: vi.fn(),
  updateWorkspaceSettings: vi.fn(),
}));

vi.mock('@/services/admin-settings-client', () => ({
  getAdminSettingsClient: () => ({
    getWorkspace: testMocks.getWorkspace,
    getWorkspaceSettings: testMocks.getWorkspaceSettings,
    updateWorkspace: testMocks.updateWorkspace,
    updateWorkspaceSettings: testMocks.updateWorkspaceSettings,
  }),
}));

vi.mock('@/composables/feedback/useToasts', () => ({
  useToasts: () => ({
    errorToast: testMocks.errorToast,
    successToast: testMocks.successToast,
  }),
}));

import SettingsView from './SettingsView.vue';

const originalSupportedValuesOf = Intl.supportedValuesOf;

function createDeferred<T>() {
  let resolveDeferred = (value: T): void => {
    void value;
  };

  const promise = new Promise<T>((resolve) => {
    resolveDeferred = resolve;
  });

  return { promise, resolve: resolveDeferred };
}

const workspaceResponse = {
  createdAt: '2026-05-01T10:00:00.000Z',
  id: '11111111-1111-4111-8111-111111111111',
  name: 'GiTiempo Studio',
  updatedAt: '2026-05-01T10:00:00.000Z',
};

const settingsResponse = {
  createdAt: '2026-05-01T10:00:00.000Z',
  currency: 'USD',
  defaultHourlyRate: 120,
  id: '22222222-2222-4222-8222-222222222222',
  timeZone: 'UTC',
  updatedAt: '2026-05-01T10:00:00.000Z',
  workspaceId: '11111111-1111-4111-8111-111111111111',
};

const SkeletonStub = {
  name: 'Skeleton',
  template: '<div data-testid="skeleton" />',
};

const SettingsPageSkeletonStub = {
  name: 'SettingsPageSkeleton',
  template: `
    <div role="status" aria-busy="true">
      <div data-testid="skeleton" />
      <div data-testid="skeleton" />
    </div>
  `,
};

const AutoCompleteStub = {
  emits: ['complete', 'update:modelValue'],
  props: [
    'completeOnFocus',
    'dropdown',
    'forceSelection',
    'inputId',
    'invalid',
    'minLength',
    'modelValue',
    'optionLabel',
    'suggestions',
  ],
  template: `
    <div>
      <input
        :id="inputId"
        :aria-invalid="invalid ? 'true' : undefined"
        :value="modelValue?.[optionLabel] ?? ''"
        @focus="$emit('complete', { query: '' })"
      />
      <button
        v-for="option in suggestions"
        :key="option.value"
        :data-testid="inputId + '-option-' + option.value"
        type="button"
        @click="$emit('update:modelValue', option)"
      >
        {{ option[optionLabel] }}
      </button>
    </div>
  `,
};

const SelectStub = {
  emits: ['update:modelValue'],
  props: [
    'inputId',
    'invalid',
    'modelValue',
    'optionLabel',
    'optionValue',
    'options',
  ],
  template: `
    <select
      :id="inputId"
      :aria-invalid="invalid ? 'true' : undefined"
      :value="modelValue"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option
        v-for="option in options"
        :key="option[optionValue]"
        :value="option[optionValue]"
      >
        {{ option[optionLabel] }}
      </option>
    </select>
  `,
};

function mountSettingsView() {
  const pinia = createPinia();
  setActivePinia(pinia);

  const authStore = useAuthStore(pinia);
  authStore.accessToken = 'access-token';

  return mount(SettingsView, {
    global: {
      plugins: [pinia, createTestQueryPlugin(), [PrimeVue, giTiempoPrimeVueOptions]],
      stubs: {
        AutoComplete: AutoCompleteStub,
        Select: SelectStub,
        Skeleton: SkeletonStub,
        SettingsPageSkeleton: SettingsPageSkeletonStub,
      },
    },
  });
}

describe('SettingsView', () => {
  beforeEach(() => {
    testMocks.errorToast.mockReset();
    testMocks.getWorkspace.mockReset();
    testMocks.getWorkspaceSettings.mockReset();
    testMocks.successToast.mockReset();
    testMocks.updateWorkspace.mockReset();
    testMocks.updateWorkspaceSettings.mockReset();

    testMocks.getWorkspace.mockResolvedValue(workspaceResponse);
    testMocks.getWorkspaceSettings.mockResolvedValue(settingsResponse);
    testMocks.updateWorkspace.mockResolvedValue(workspaceResponse);
    testMocks.updateWorkspaceSettings.mockResolvedValue(settingsResponse);

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

    Object.defineProperty(Intl, 'supportedValuesOf', {
      configurable: true,
      value: vi.fn().mockReturnValue(['America/New_York', 'Europe/Kyiv']),
    });
  });

  afterEach(() => {
    if (originalSupportedValuesOf) {
      Object.defineProperty(Intl, 'supportedValuesOf', {
        configurable: true,
        value: originalSupportedValuesOf,
      });
    } else {
      Reflect.deleteProperty(Intl, 'supportedValuesOf');
    }

    vi.unstubAllGlobals();
  });

  it('shows the settings skeleton before the first load resolves, then renders editable and inactive fields', async () => {
    const workspaceRequest = createDeferred<typeof workspaceResponse>();
    const settingsRequest = createDeferred<typeof settingsResponse>();

    testMocks.getWorkspace.mockReturnValueOnce(workspaceRequest.promise);
    testMocks.getWorkspaceSettings.mockReturnValueOnce(settingsRequest.promise);

    const wrapper = mountSettingsView();

    expect(wrapper.get('[role="status"]').attributes('aria-busy')).toBe('true');
    expect(wrapper.findAll('[data-testid="skeleton"]').length).toBeGreaterThan(
      0,
    );
    expect(wrapper.text()).not.toContain('Workspace name');

    workspaceRequest.resolve(workspaceResponse);
    settingsRequest.resolve(settingsResponse);
    await flushPromises();

    expect(wrapper.find('[role="status"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Settings');
    expect(wrapper.text()).toContain(
      'Configure workspace defaults, billing preferences, and organization details.',
    );
    expect(wrapper.text()).toContain('Workspace name');
    expect(wrapper.text()).toContain('Default hourly rate');
    expect(wrapper.text()).toContain('Currency');
    expect(wrapper.text()).toContain('Time zone');
    expect(wrapper.text()).toContain('Billing Defaults');
    expect(wrapper.text()).toContain('Invoice prefix');
    expect(wrapper.text()).toContain('Payment terms');
    expect(wrapper.text()).toContain('Organization');
    expect(wrapper.text()).toContain('Legal entity');
    expect(wrapper.text()).toContain('Tax ID');
    expect(
      wrapper.get<HTMLInputElement>('#settings-workspace-name').element.value,
    ).toBe('GiTiempo Studio');
    expect(
      wrapper.get<HTMLInputElement>('#settings-time-zone').element.value,
    ).toBe('UTC');
    expect(
      wrapper.get<HTMLInputElement>('#settings-invoice-prefix').element
        .disabled,
    ).toBe(true);
    expect(
      wrapper.get<HTMLInputElement>('#settings-payment-terms').element.disabled,
    ).toBe(true);
    expect(
      wrapper.get<HTMLInputElement>('#settings-legal-entity').element.disabled,
    ).toBe(true);
    expect(
      wrapper.get<HTMLInputElement>('#settings-tax-id').element.disabled,
    ).toBe(true);
  });

  it('submits changed workspace fields through the settings form save action', async () => {
    testMocks.updateWorkspace.mockResolvedValueOnce({
      ...workspaceResponse,
      name: 'Updated Workspace',
    });

    const wrapper = mountSettingsView();
    await flushPromises();

    await wrapper.get('#settings-workspace-name').setValue('Updated Workspace');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Save Settings')
      ?.trigger('click');
    await flushPromises();

    expect(testMocks.updateWorkspace).toHaveBeenCalledWith({
      name: 'Updated Workspace',
    });
    expect(testMocks.updateWorkspaceSettings).not.toHaveBeenCalled();
    expect(testMocks.successToast).toHaveBeenCalledWith('Settings saved.');
  });

  it('submits changed time zone through the existing workspace settings save action', async () => {
    testMocks.updateWorkspaceSettings.mockResolvedValueOnce({
      ...settingsResponse,
      timeZone: 'Europe/Kyiv',
    });

    const wrapper = mountSettingsView();
    await flushPromises();

    await wrapper.get('#settings-time-zone').trigger('focus');
    await wrapper
      .get('[data-testid="settings-time-zone-option-Europe/Kyiv"]')
      .trigger('click');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Save Settings')
      ?.trigger('click');
    await flushPromises();

    expect(testMocks.updateWorkspace).not.toHaveBeenCalled();
    expect(testMocks.updateWorkspaceSettings).toHaveBeenCalledWith(
      {
        timeZone: 'Europe/Kyiv',
      },
    );
    expect(testMocks.successToast).toHaveBeenCalledWith('Settings saved.');
  });

  it('keeps initial request failures distinct and retryable', async () => {
    testMocks.getWorkspace
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce(workspaceResponse);

    const wrapper = mountSettingsView();
    await flushPromises();

    expect(wrapper.text()).toContain('Settings');
    expect(wrapper.text()).toContain('Failed to load settings');
    expect(wrapper.text()).toContain('Network unavailable');
    expect(wrapper.text()).not.toContain('Workspace name');
    expect(wrapper.text()).not.toContain('Time zone');
    expect(testMocks.errorToast).toHaveBeenCalledWith(
      'Network unavailable',
      expect.objectContaining({
        logContext: { action: 'load-settings', feature: 'settings' },
      }),
    );

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Try again')
      ?.trigger('click');
    await flushPromises();

    expect(wrapper.text()).not.toContain('Failed to load settings');
    expect(wrapper.text()).toContain('Workspace name');
    expect(wrapper.text()).toContain('Time zone');
    expect(testMocks.getWorkspace).toHaveBeenCalledTimes(2);
  });

  it('resets pending edits from the route action row without saving', async () => {
    const wrapper = mountSettingsView();
    await flushPromises();

    await wrapper.get('#settings-workspace-name').setValue('Draft Workspace');
    await wrapper.get('#settings-time-zone').trigger('focus');
    await wrapper
      .get('[data-testid="settings-time-zone-option-Europe/Kyiv"]')
      .trigger('click');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Cancel')
      ?.trigger('click');

    expect(
      wrapper.get<HTMLInputElement>('#settings-workspace-name').element.value,
    ).toBe('GiTiempo Studio');
    expect(
      wrapper.get<HTMLInputElement>('#settings-time-zone').element.value,
    ).toBe('UTC');
    expect(testMocks.updateWorkspace).not.toHaveBeenCalled();
    expect(testMocks.updateWorkspaceSettings).not.toHaveBeenCalled();
  });
});
