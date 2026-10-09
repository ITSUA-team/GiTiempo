import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import type { GitHubConnectionStatusResponse } from '@gitiempo/shared';
import SettingsGitHubAccountCard from './SettingsGitHubAccountCard.vue';

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

const SkeletonStub = {
  template: '<div data-testid="skeleton" />',
};

const connectedStatus: GitHubConnectionStatusResponse = {
  account: {
    avatarUrl: 'https://avatars.example.test/octo.png',
    connectedAt: '2026-05-01T10:00:00.000Z',
    githubUserId: '123456',
    login: 'octocat',
    updatedAt: '2026-05-01T10:00:00.000Z',
  },
  capabilities: {
    organizationDiscovery: 'ready',
    personalData: 'ready',
  },
  disconnect: 'allowed',
  oauth: {
    missingScopes: [],
    status: 'authorized',
  },
  status: 'connected',
};

const disconnectedStatus: GitHubConnectionStatusResponse = {
  account: null,
  capabilities: {
    organizationDiscovery: 'authorization_required',
    personalData: 'authorization_required',
  },
  disconnect: 'allowed',
  oauth: {
    missingScopes: [],
    status: 'not_authorized',
  },
  status: 'disconnected',
};

function mountCard(
  props: Partial<InstanceType<typeof SettingsGitHubAccountCard>['$props']> = {},
) {
  return mount(SettingsGitHubAccountCard, {
    global: {
      stubs: {
        Avatar: { template: '<span data-testid="avatar" />' },
        Button: ButtonStub,
        Skeleton: SkeletonStub,
        SurfaceCard: { template: '<section><slot /></section>' },
      },
    },
    props: {
      connection: disconnectedStatus,
      isInitialLoading: false,
      profileHref: 'https://user.example.test/profile',
      requestError: null,
      ...props,
    },
  });
}

describe('SettingsGitHubAccountCard', () => {
  it('renders loading state without account details', () => {
    const wrapper = mountCard({ connection: null, isInitialLoading: true });

    expect(wrapper.get('[data-testid="settings-github-account-loading"]')).toBeTruthy();
    expect(wrapper.findAll('[data-testid="skeleton"]')).toHaveLength(3);
    expect(wrapper.text()).not.toContain('octocat');
  });

  it('renders connected safe account details and profile link', () => {
    const wrapper = mountCard({ connection: connectedStatus });

    expect(wrapper.get('[data-testid="settings-github-account-connected"]')).toBeTruthy();
    expect(wrapper.text()).toContain('octocat');
    expect(wrapper.text()).toContain('Connected GitHub identity');
    expect(wrapper.text()).not.toContain('token');
    expect(wrapper.get('a').attributes('href')).toBe(
      'https://user.example.test/profile',
    );
  });

  it('shows distinct OAuth and personal-data recovery guidance', () => {
    const wrapper = mountCard({
      connection: {
        ...connectedStatus,
        capabilities: {
          organizationDiscovery: 'permission_required',
          personalData: 'authorization_required',
        },
      },
    });

    expect(
      wrapper.get('[data-testid="settings-github-account-organization-recovery"]').text(),
    ).toContain('organization permission');
    expect(
      wrapper.get('[data-testid="settings-github-account-personal-data-recovery"]').text(),
    ).toContain('Authorize GitHub App data');
  });

  it('shows account-permission recovery without blocking ready organization or App access', () => {
    const wrapper = mountCard({
      connection: {
        ...connectedStatus,
        oauth: { missingScopes: ['read:project'], status: 'authorized' },
      },
    });

    expect(
      wrapper.get('[data-testid="settings-github-account-oauth-permission-recovery"]').text(),
    ).toContain('GitHub account permissions need attention');
    expect(wrapper.find('[data-testid="settings-github-account-organization-recovery"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="settings-github-account-personal-data-recovery"]').exists()).toBe(false);
  });

  it('renders disconnected prerequisite guidance', () => {
    const wrapper = mountCard({ connection: disconnectedStatus });

    expect(
      wrapper.get('[data-testid="settings-github-account-disconnected"]'),
    ).toBeTruthy();
    expect(wrapper.text()).toContain('GitHub is not connected');
    expect(wrapper.text()).toContain(
      'Connect GitHub from your user profile before adding workspace organizations.',
    );
  });

  it('renders retryable request-error state', async () => {
    const wrapper = mountCard({
      connection: null,
      requestError: 'GitHub status failed',
    });

    expect(wrapper.get('[data-testid="settings-github-account-error"]')).toBeTruthy();
    expect(wrapper.text()).toContain('GitHub status failed');

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Try again')
      ?.trigger('click');

    expect(wrapper.emitted('retry')).toHaveLength(1);
  });
});
