import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import SettingsGitHubWorkspaceAccessCard from './SettingsGitHubWorkspaceAccessCard.vue';

const SkeletonStub = {
  template: '<div data-testid="skeleton" />',
};

const ButtonStub = {
  emits: ['click'],
  props: ['asChild', 'label'],
  template: `
    <slot
      v-if="asChild"
      :a11yAttrs="{ 'aria-label': label }"
      class="p-button"
    />
    <button
      v-else
      type="button"
      @click="$emit('click', $event)"
    >
      {{ label }}
    </button>
  `,
};

const InputTextStub = {
  emits: ['update:modelValue'],
  props: ['id', 'modelValue'],
  template:
    '<input :id="id" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
};

function createProps(overrides: Record<string, unknown> = {}) {
  return {
    addOrganizationGateMessage: null,
    adding: false,
    canAddOrganization: true,
    isInitialLoading: false,
    items: [],
    organizationLogin: '',
    organizationLoginError: null,
    recoveryChecklist: null,
    removingOrganizationId: null,
    requestError: null,
    ...overrides,
  };
}

describe('SettingsGitHubWorkspaceAccessCard', () => {
  it('renders the empty state without substituting fake organization rows', () => {
    const wrapper = mount(SettingsGitHubWorkspaceAccessCard, {
      global: {
        stubs: {
          Button: ButtonStub,
          InputText: InputTextStub,
          Message: { template: '<small><slot /></small>' },
          Skeleton: SkeletonStub,
          SurfaceCard: { template: '<section><slot /></section>' },
        },
      },
      props: createProps(),
    });

    expect(
      wrapper.get('[data-testid="settings-github-organizations-empty"]').text(),
    ).toContain('No GitHub organizations are allowed for this workspace yet.');
  });

  it('renders loading placeholders for the organization policy list', () => {
    const wrapper = mount(SettingsGitHubWorkspaceAccessCard, {
      global: {
        stubs: {
          Button: ButtonStub,
          InputText: InputTextStub,
          Message: { template: '<small><slot /></small>' },
          Skeleton: SkeletonStub,
          SurfaceCard: { template: '<section><slot /></section>' },
        },
      },
      props: createProps({ isInitialLoading: true }),
    });

    expect(
      wrapper
        .get('[data-testid="settings-github-organizations-loading"]')
        .findAll('[data-testid="skeleton"]').length,
    ).toBeGreaterThan(2);
  });

  it('renders saved organization rows and emits remove actions', async () => {
    const wrapper = mount(SettingsGitHubWorkspaceAccessCard, {
      global: {
        stubs: {
          Button: ButtonStub,
          InputText: InputTextStub,
          Message: { template: '<small><slot /></small>' },
          SurfaceCard: { template: '<section><slot /></section>' },
        },
      },
      props: createProps({
        items: [
          {
            id: 'org-1',
            workspaceId: 'workspace-1',
            organizationLogin: 'Octo-Org',
            createdByUserId: 'user-1',
            createdAt: '2026-06-18T00:00:00.000Z',
          },
        ],
      }),
    });

    expect(wrapper.text()).toContain('Octo-Org');

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Remove')
      ?.trigger('click');

    expect(wrapper.emitted('remove')).toEqual([['org-1']]);
  });

  it('hides the add organization setup action when GitHub is disconnected', () => {
    const wrapper = mount(SettingsGitHubWorkspaceAccessCard, {
      global: {
        stubs: {
          Button: ButtonStub,
          InputText: InputTextStub,
          Message: { template: '<small><slot /></small>' },
          SurfaceCard: { template: '<section><slot /></section>' },
        },
      },
      props: createProps({
        addOrganizationGateMessage:
          'Connect your GitHub account before adding workspace organizations.',
        canAddOrganization: false,
      }),
    });

    expect(wrapper.text()).not.toContain('Add organization');
    expect(
      wrapper.get('[data-testid="settings-github-add-gate"]').text(),
    ).toContain('Connect your GitHub account before adding workspace organizations.');
    expect(wrapper.find('#settings-github-organization-login').exists()).toBe(false);
  });

  it('keeps saved rows removable while the add setup action is gated', async () => {
    const wrapper = mount(SettingsGitHubWorkspaceAccessCard, {
      global: {
        stubs: {
          Button: ButtonStub,
          InputText: InputTextStub,
          Message: { template: '<small><slot /></small>' },
          SurfaceCard: { template: '<section><slot /></section>' },
        },
      },
      props: createProps({
        addOrganizationGateMessage:
          'Connect your GitHub account before adding workspace organizations.',
        canAddOrganization: false,
        items: [
          {
            id: 'org-1',
            workspaceId: 'workspace-1',
            organizationLogin: 'Octo-Org',
            createdByUserId: 'user-1',
            createdAt: '2026-06-18T00:00:00.000Z',
          },
        ],
      }),
    });

    expect(wrapper.text()).toContain('Octo-Org');
    expect(wrapper.text()).not.toContain('Add organization');

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Remove')
      ?.trigger('click');

    expect(wrapper.emitted('remove')).toEqual([['org-1']]);
  });

  it('shows the request-error state with retry', async () => {
    const wrapper = mount(SettingsGitHubWorkspaceAccessCard, {
      global: {
        stubs: {
          Button: ButtonStub,
          InputText: InputTextStub,
          Message: { template: '<small><slot /></small>' },
          SurfaceCard: { template: '<section><slot /></section>' },
        },
      },
      props: createProps({
        requestError: 'GitHub request failed',
      }),
    });

    expect(
      wrapper.get('[data-testid="settings-github-organizations-error"]').text(),
    ).toContain('GitHub request failed');

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Try again')
      ?.trigger('click');

    expect(wrapper.emitted('retry')).toHaveLength(1);
    expect(wrapper.find('#settings-github-organization-login').exists()).toBe(false);
  });

  it('renders the GitHub App recovery checklist with link and retry actions', async () => {
    const wrapper = mount(SettingsGitHubWorkspaceAccessCard, {
      global: {
        stubs: {
          Button: ButtonStub,
          InputText: InputTextStub,
          Message: { template: '<small><slot /></small>' },
          SurfaceCard: { template: '<section><slot /></section>' },
        },
      },
      props: createProps({
        recoveryChecklist: {
          organizationLogin: 'My-test-org-for-clock',
          steps: [
            {
              action: {
                ariaLabel:
                  'Open GitHub App install page for My-test-org-for-clock',
                href: 'https://github.com/apps/gi-tiempo/installations/new',
                kind: 'link',
                label: 'Open install',
                target: '_blank',
              },
              description: 'Choose the organization and install GiTiempo.',
              id: 'install',
              title: 'Install GitHub App for organization',
            },
            {
              action: {
                ariaLabel:
                  'Retry workspace allow-list check for My-test-org-for-clock',
                kind: 'retry',
                label: 'Retry check',
              },
              description: 'Retry the same organization login.',
              id: 'retry',
              title: 'Retry workspace allow-list check',
            },
          ],
        },
      }),
    });

    expect(wrapper.text()).toContain('GitHub App access');
    expect(wrapper.text()).toContain('Install GitHub App for organization');
    expect(wrapper.text()).toContain('Retry workspace allow-list check');
    expect(wrapper.text()).not.toContain('Installed');
    expect(wrapper.text()).not.toContain('Still blocked');
    expect(
      wrapper
        .get('[data-testid="settings-github-recovery-link-install"]')
        .attributes('href'),
    ).toBe('https://github.com/apps/gi-tiempo/installations/new');

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Retry check')
      ?.trigger('click');

    expect(wrapper.emitted('retryAdd')).toHaveLength(1);
  });
});
