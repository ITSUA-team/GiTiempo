import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PrimeVue from 'primevue/config';
import type { WorkspaceGitHubOrganizationRecoveryPayload } from '@gitiempo/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { giTiempoPrimeVueOptions } from '@gitiempo/web-config/theme';

import { useAuthStore } from '@/stores/auth';
import { createTestQueryPlugin } from '@/test/query-client';

const testMocks = vi.hoisted(() => ({
  addWorkspaceGitHubOrganization: vi.fn(),
  errorToast: vi.fn(),
  getWorkspace: vi.fn(),
  listWorkspaceGitHubOrganizations: vi.fn(),
  removeWorkspaceGitHubOrganization: vi.fn(),
  getWorkspaceSettings: vi.fn(),
  successToast: vi.fn(),
  updateWorkspace: vi.fn(),
  updateWorkspaceSettings: vi.fn(),
}));

vi.mock('@/services/admin-settings-client', () => ({
  getAdminSettingsClient: () => ({
    addWorkspaceGitHubOrganization: testMocks.addWorkspaceGitHubOrganization,
    getWorkspace: testMocks.getWorkspace,
    listWorkspaceGitHubOrganizations:
      testMocks.listWorkspaceGitHubOrganizations,
    removeWorkspaceGitHubOrganization:
      testMocks.removeWorkspaceGitHubOrganization,
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

const workspaceGitHubOrganizationResponse = {
  id: '33333333-3333-4333-8333-333333333333',
  workspaceId: '11111111-1111-4111-8111-111111111111',
  organizationLogin: 'Octo-Org',
  createdByUserId: '44444444-4444-4444-8444-444444444444',
  createdAt: '2026-05-01T10:00:00.000Z',
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

function createRecoveryError(
  message: string,
  recovery: WorkspaceGitHubOrganizationRecoveryPayload,
): Error & {
  body: { recovery: WorkspaceGitHubOrganizationRecoveryPayload };
  code: WorkspaceGitHubOrganizationRecoveryPayload['reason'];
  recovery: WorkspaceGitHubOrganizationRecoveryPayload;
} {
  const error = new Error(message) as Error & {
    body: { recovery: WorkspaceGitHubOrganizationRecoveryPayload };
    code: WorkspaceGitHubOrganizationRecoveryPayload['reason'];
    recovery: WorkspaceGitHubOrganizationRecoveryPayload;
  };
  error.code = recovery.reason;
  error.recovery = recovery;
  error.body = { recovery };
  return error;
}

function createLegacyRecoveryError(
  message: string,
  code: WorkspaceGitHubOrganizationRecoveryPayload['reason'],
): Error & { code: WorkspaceGitHubOrganizationRecoveryPayload['reason'] } {
  const error = new Error(message) as Error & {
    code: WorkspaceGitHubOrganizationRecoveryPayload['reason'];
  };
  error.code = code;
  return error;
}

function createRecoveryPayload(
  reason: WorkspaceGitHubOrganizationRecoveryPayload['reason'],
  organizationLogin = 'My-test-org-for-clock',
): WorkspaceGitHubOrganizationRecoveryPayload {
  switch (reason) {
    case 'workspace_github_organization_connection_required':
      return {
        organizationLogin,
        reason,
        steps: [
          { id: 'install' as const, status: 'unknown' },
          { id: 'approve' as const, status: 'action_required' },
          { id: 'reconnect' as const, status: 'disconnected' },
          { id: 'retry' as const, status: 'blocked' },
        ],
      };
    case 'workspace_github_organization_app_access_blocked':
      return {
        organizationLogin,
        reason,
        steps: [
          { id: 'install' as const, status: 'complete' },
          { id: 'approve' as const, status: 'blocked' },
          { id: 'reconnect' as const, status: 'action_required' },
          { id: 'retry' as const, status: 'blocked' },
        ],
      };
    case 'workspace_github_organization_provider_retryable':
      return {
        organizationLogin,
        reason,
        steps: [
          { id: 'install' as const, status: 'unknown' },
          { id: 'approve' as const, status: 'action_required' },
          { id: 'reconnect' as const, status: 'complete' },
          { id: 'retry' as const, status: 'ready' },
        ],
      };
    case 'workspace_github_organization_not_visible':
    default:
      return {
        organizationLogin,
        reason,
        steps: [
          { id: 'install' as const, status: 'action_required' },
          { id: 'approve' as const, status: 'action_required' },
          { id: 'reconnect' as const, status: 'complete' },
          { id: 'retry' as const, status: 'blocked' },
        ],
      };
  }
}

async function addOrganization(
  wrapper: ReturnType<typeof mountSettingsView>,
  organizationLogin = 'My-test-org-for-clock',
) {
  await wrapper
    .get('#settings-github-organization-login')
    .setValue(organizationLogin);
  await wrapper
    .findAll('button')
    .find((button) => button.text() === 'Add organization')
    ?.trigger('click');
  await flushPromises();
}

function mountSettingsView() {
  const pinia = createPinia();
  setActivePinia(pinia);

  const authStore = useAuthStore(pinia);
  authStore.accessToken = 'access-token';

  return mount(SettingsView, {
    global: {
      plugins: [
        pinia,
        createTestQueryPlugin(),
        [PrimeVue, giTiempoPrimeVueOptions],
      ],
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
    testMocks.addWorkspaceGitHubOrganization.mockReset();
    testMocks.errorToast.mockReset();
    testMocks.getWorkspace.mockReset();
    testMocks.listWorkspaceGitHubOrganizations.mockReset();
    testMocks.removeWorkspaceGitHubOrganization.mockReset();
    testMocks.getWorkspaceSettings.mockReset();
    testMocks.successToast.mockReset();
    testMocks.updateWorkspace.mockReset();
    testMocks.updateWorkspaceSettings.mockReset();

    testMocks.addWorkspaceGitHubOrganization.mockResolvedValue(
      workspaceGitHubOrganizationResponse,
    );
    testMocks.getWorkspace.mockResolvedValue(workspaceResponse);
    testMocks.listWorkspaceGitHubOrganizations.mockResolvedValue({ items: [] });
    testMocks.removeWorkspaceGitHubOrganization.mockResolvedValue(undefined);
    testMocks.getWorkspaceSettings.mockResolvedValue(settingsResponse);
    testMocks.updateWorkspace.mockResolvedValue(workspaceResponse);
    testMocks.updateWorkspaceSettings.mockResolvedValue(settingsResponse);
    vi.stubEnv(
      'VITE_GITHUB_APP_INSTALL_URL',
      'https://github.com/apps/gi-tiempo/installations/new',
    );
    vi.stubEnv('VITE_USER_APP_URL', 'https://user.example.test/login');

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
    vi.unstubAllEnvs();
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
    expect(wrapper.text()).toContain('GitHub Workspace Access');
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
    expect(wrapper.text()).toContain(
      'No GitHub organizations are allowed for this workspace yet.',
    );
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
    expect(testMocks.updateWorkspaceSettings).toHaveBeenCalledWith({
      timeZone: 'Europe/Kyiv',
    });
    expect(testMocks.successToast).toHaveBeenCalledWith('Settings saved.');
  });

  it('keeps initial request failures distinct and retryable', async () => {
    testMocks.getWorkspace
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce(workspaceResponse);

    const wrapper = mountSettingsView();
    await flushPromises();

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

  it('validates the GitHub organization login before sending an add request', async () => {
    const wrapper = mountSettingsView();
    await flushPromises();

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Add organization')
      ?.trigger('click');
    await flushPromises();

    expect(testMocks.addWorkspaceGitHubOrganization).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Organization login is required');
  });

  it('adds a GitHub organization and refreshes the authoritative policy list', async () => {
    testMocks.listWorkspaceGitHubOrganizations.mockResolvedValue({
      items: [workspaceGitHubOrganizationResponse],
    });
    testMocks.listWorkspaceGitHubOrganizations.mockResolvedValueOnce({
      items: [],
    });

    const wrapper = mountSettingsView();
    await flushPromises();

    await wrapper
      .get('#settings-github-organization-login')
      .setValue('Octo-Org');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Add organization')
      ?.trigger('click');
    await flushPromises();

    expect(testMocks.addWorkspaceGitHubOrganization).toHaveBeenCalledWith({
      organizationLogin: 'Octo-Org',
    });
    expect(testMocks.successToast).toHaveBeenCalledWith(
      'GitHub organization added.',
    );
    expect(wrapper.text()).toContain('Octo-Org');
  });

  it('keeps the entered organization login when add fails', async () => {
    testMocks.addWorkspaceGitHubOrganization.mockRejectedValueOnce(
      new Error('GitHub organization is not visible to your connected account'),
    );

    const wrapper = mountSettingsView();
    await flushPromises();

    await wrapper
      .get('#settings-github-organization-login')
      .setValue('Octo-Org');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Add organization')
      ?.trigger('click');
    await flushPromises();

    expect(
      wrapper.get<HTMLInputElement>('#settings-github-organization-login')
        .element.value,
    ).toBe('Octo-Org');
    expect(testMocks.errorToast).toHaveBeenCalledWith(
      'GitHub organization is not visible to your connected account',
      expect.objectContaining({
        logContext: {
          action: 'add-workspace-github-organization',
          feature: 'settings-github-workspace-access',
        },
      }),
    );
  });

  it('removes a saved GitHub organization and refreshes the policy list', async () => {
    testMocks.listWorkspaceGitHubOrganizations.mockResolvedValue({
      items: [],
    });
    testMocks.listWorkspaceGitHubOrganizations.mockResolvedValueOnce({
      items: [workspaceGitHubOrganizationResponse],
    });

    const wrapper = mountSettingsView();
    await flushPromises();

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Remove')
      ?.trigger('click');
    await flushPromises();

    expect(testMocks.removeWorkspaceGitHubOrganization).toHaveBeenCalledWith(
      '33333333-3333-4333-8333-333333333333',
    );
    expect(testMocks.successToast).toHaveBeenCalledWith(
      'GitHub organization removed.',
    );
    expect(wrapper.text()).toContain(
      'No GitHub organizations are allowed for this workspace yet.',
    );
  });

  it('keeps saved rows visible when remove fails', async () => {
    testMocks.listWorkspaceGitHubOrganizations.mockResolvedValue({
      items: [workspaceGitHubOrganizationResponse],
    });
    testMocks.removeWorkspaceGitHubOrganization.mockRejectedValueOnce(
      new Error('Could not remove organization'),
    );

    const wrapper = mountSettingsView();
    await flushPromises();

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Remove')
      ?.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Octo-Org');
    expect(testMocks.errorToast).toHaveBeenCalledWith(
      'Could not remove organization',
      expect.objectContaining({
        logContext: {
          action: 'remove-workspace-github-organization',
          feature: 'settings-github-workspace-access',
        },
      }),
    );
  });

  it('shows the GitHub policy request error state and retries independently from the settings form', async () => {
    testMocks.listWorkspaceGitHubOrganizations
      .mockRejectedValueOnce(new Error('GitHub policy unavailable'))
      .mockResolvedValueOnce({ items: [] });

    const wrapper = mountSettingsView();
    await flushPromises();

    expect(wrapper.text()).toContain('Failed to load GitHub workspace access');
    expect(wrapper.text()).toContain('GitHub policy unavailable');
    expect(wrapper.text()).toContain('Workspace name');
    expect(testMocks.errorToast).toHaveBeenCalledWith(
      'GitHub policy unavailable',
      expect.objectContaining({
        logContext: {
          action: 'load-workspace-github-organizations',
          feature: 'settings-github-workspace-access',
        },
      }),
    );

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Try again')
      ?.trigger('click');
    await flushPromises();

    expect(wrapper.text()).not.toContain(
      'Failed to load GitHub workspace access',
    );
    expect(testMocks.listWorkspaceGitHubOrganizations).toHaveBeenCalledTimes(2);
  });

  it('shows a disconnected GitHub recovery checklist after add failure', async () => {
    testMocks.addWorkspaceGitHubOrganization.mockRejectedValueOnce(
      createRecoveryError(
        'Connect GitHub before adding an allowed organization',
        createRecoveryPayload(
          'workspace_github_organization_connection_required',
        ),
      ),
    );

    const wrapper = mountSettingsView();
    await flushPromises();
    await addOrganization(wrapper);

    expect(wrapper.text()).toContain('GitHub App access');
    expect(
      wrapper
        .get('[data-testid="settings-github-recovery-step-reconnect"]')
        .text(),
    ).toContain('Connect GitHub before retrying this organization');
    expect(wrapper.text()).not.toContain('Not connected');
    expect(
      wrapper
        .get('[data-testid="settings-github-recovery-link-install"]')
        .attributes('href'),
    ).toBe('https://github.com/apps/gi-tiempo/installations/new');
    expect(
      wrapper
        .get('[data-testid="settings-github-recovery-link-reconnect"]')
        .attributes('href'),
    ).toBe('https://user.example.test/profile');
  });

  it('shows a not-visible organization recovery checklist with organization settings links', async () => {
    testMocks.addWorkspaceGitHubOrganization.mockRejectedValueOnce(
      createRecoveryError(
        'GitHub organization is not visible to your connected account',
        createRecoveryPayload('workspace_github_organization_not_visible'),
      ),
    );

    const wrapper = mountSettingsView();
    await flushPromises();
    await addOrganization(wrapper);

    expect(
      wrapper
        .get('[data-testid="settings-github-recovery-step-install"]')
        .text(),
    ).toContain('Choose the organization, install GiTiempo');
    expect(
      wrapper
        .get('[data-testid="settings-github-recovery-step-approve"]')
        .text(),
    ).toContain('Open organization settings, approve pending access');
    expect(wrapper.text()).not.toContain('Needs install');
    expect(wrapper.text()).not.toContain('Needs review');
    expect(
      wrapper
        .get('[data-testid="settings-github-recovery-link-approve"]')
        .attributes('href'),
    ).toBe(
      'https://github.com/organizations/My-test-org-for-clock/settings/installations',
    );
  });

  it('shows a blocked GitHub App recovery checklist with retry', async () => {
    testMocks.addWorkspaceGitHubOrganization.mockRejectedValueOnce(
      createRecoveryError(
        'GitHub organization blocks this GitHub App',
        createRecoveryPayload('workspace_github_organization_app_access_blocked'),
      ),
    );

    const wrapper = mountSettingsView();
    await flushPromises();
    await addOrganization(wrapper);

    expect(
      wrapper
        .get('[data-testid="settings-github-recovery-step-install"]')
        .text(),
    ).toContain('GiTiempo is already installed for this organization');
    expect(
      wrapper
        .get('[data-testid="settings-github-recovery-step-approve"]')
        .text(),
    ).toContain('unblock or approve the installed GiTiempo app');
    expect(
      wrapper
        .get('[data-testid="settings-github-recovery-step-reconnect"]')
        .text(),
    ).toContain('Reconnect after GitHub-side approval');
    expect(wrapper.text()).not.toContain('Installed');
    expect(wrapper.text()).not.toContain('Blocked');
    expect(wrapper.text()).not.toContain('Reconnect needed');
    expect(wrapper.text()).toContain('Retry check');
  });

  it('shows a blocked GitHub App recovery checklist for legacy reason-only errors', async () => {
    testMocks.addWorkspaceGitHubOrganization.mockRejectedValueOnce(
      createLegacyRecoveryError(
        'GitHub organization blocks this GitHub App',
        'workspace_github_organization_app_access_blocked',
      ),
    );

    const wrapper = mountSettingsView();
    await flushPromises();
    await addOrganization(wrapper);

    expect(
      wrapper
        .get('[data-testid="settings-github-recovery-step-install"]')
        .text(),
    ).toContain('GiTiempo is already installed for this organization');
    expect(
      wrapper
        .get('[data-testid="settings-github-recovery-step-approve"]')
        .text(),
    ).toContain('unblock or approve the installed GiTiempo app');
    expect(wrapper.text()).not.toContain('Installed');
    expect(wrapper.text()).not.toContain('Blocked');
    expect(wrapper.text()).toContain('Retry check');
  });

  it('shows a retryable provider recovery checklist', async () => {
    testMocks.addWorkspaceGitHubOrganization.mockRejectedValueOnce(
      createRecoveryError(
        'GitHub organization validation is temporarily unavailable. Try again.',
        createRecoveryPayload('workspace_github_organization_provider_retryable'),
      ),
    );

    const wrapper = mountSettingsView();
    await flushPromises();
    await addOrganization(wrapper);

    expect(
      wrapper
        .get('[data-testid="settings-github-recovery-step-install"]')
        .text(),
    ).toContain('Open the GitHub App installation request page');
    expect(
      wrapper.get('[data-testid="settings-github-recovery-step-retry"]').text(),
    ).toContain('retry the same organization login');
    expect(wrapper.text()).not.toContain('Unknown');
    expect(wrapper.text()).not.toContain('Ready');
  });

  it('retries the same organization and returns to the saved-row state after recovery succeeds', async () => {
    testMocks.addWorkspaceGitHubOrganization.mockRejectedValueOnce(
      createRecoveryError(
        'GitHub organization blocks this GitHub App',
        createRecoveryPayload('workspace_github_organization_app_access_blocked'),
      ),
    );
    testMocks.listWorkspaceGitHubOrganizations.mockResolvedValue({
      items: [
        {
          ...workspaceGitHubOrganizationResponse,
          organizationLogin: 'My-test-org-for-clock',
        },
      ],
    });
    testMocks.listWorkspaceGitHubOrganizations.mockResolvedValueOnce({
      items: [],
    });

    const wrapper = mountSettingsView();
    await flushPromises();
    await addOrganization(wrapper);

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Retry check')
      ?.trigger('click');
    await flushPromises();

    expect(testMocks.addWorkspaceGitHubOrganization).toHaveBeenNthCalledWith(
      2,
      {
        organizationLogin: 'My-test-org-for-clock',
      },
    );
    expect(wrapper.text()).not.toContain('GitHub App access');
    expect(wrapper.text()).toContain('My-test-org-for-clock');
    expect(testMocks.successToast).toHaveBeenCalledWith(
      'GitHub organization added.',
    );
  });

  it('keeps the checklist visible when retry stays blocked', async () => {
    testMocks.addWorkspaceGitHubOrganization
      .mockRejectedValueOnce(
        createRecoveryError(
          'GitHub organization blocks this GitHub App',
          createRecoveryPayload(
            'workspace_github_organization_app_access_blocked',
          ),
        ),
      )
      .mockRejectedValueOnce(
        createRecoveryError(
          'GitHub organization blocks this GitHub App',
          createRecoveryPayload(
            'workspace_github_organization_app_access_blocked',
          ),
        ),
      );

    const wrapper = mountSettingsView();
    await flushPromises();
    await addOrganization(wrapper);

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Retry check')
      ?.trigger('click');
    await flushPromises();

    expect(testMocks.addWorkspaceGitHubOrganization).toHaveBeenNthCalledWith(
      2,
      {
        organizationLogin: 'My-test-org-for-clock',
      },
    );
    expect(wrapper.text()).toContain('GitHub App access');
    expect(
      wrapper
        .get('[data-testid="settings-github-recovery-step-approve"]')
        .text(),
    ).toContain('unblock or approve the installed GiTiempo app');
    expect(wrapper.text()).not.toContain('Blocked');
  });
});
