import { defineComponent, ref, shallowRef } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import type { WorkspaceGitHubOrganizationResponse } from '@gitiempo/shared';
import type { AdminSettingsClient } from '@/services/admin-settings-client';
import { createTestQueryPlugin } from '@/test/query-client';

import { useAdminWorkspaceGitHubInstallations } from './useAdminWorkspaceGitHubInstallations';

type InstallationsClient = Pick<
  AdminSettingsClient,
  | 'completeWorkspaceGitHubInstallation'
  | 'listWorkspaceGitHubInstallations'
  | 'reverifyWorkspaceGitHubInstallation'
  | 'setupWorkspaceGitHubInstallation'
>;

const installation = {
  id: '55555555-5555-4555-8555-555555555555',
  installationId: '123456',
  organizationId: '654321',
  organizationLogin: 'Octo-Org',
  recoveryReason: null,
  status: 'verified' as const,
  verifiedAt: '2026-05-01T10:00:00.000Z',
};

const organization: WorkspaceGitHubOrganizationResponse = {
  id: '11111111-1111-4111-8111-111111111111',
  workspaceId: '22222222-2222-4222-8222-222222222222',
  organizationLogin: 'Octo-Org',
  createdByUserId: '33333333-3333-4333-8333-333333333333',
  createdAt: '2026-05-01T10:00:00.000Z',
};

function createClient(overrides: Partial<InstallationsClient> = {}): InstallationsClient {
  return {
    completeWorkspaceGitHubInstallation: vi.fn().mockResolvedValue(installation),
    listWorkspaceGitHubInstallations: vi.fn().mockResolvedValue({ items: [installation] }),
    reverifyWorkspaceGitHubInstallation: vi.fn().mockResolvedValue(installation),
    setupWorkspaceGitHubInstallation: vi.fn().mockResolvedValue({
      expiresAt: '2026-05-01T10:10:00.000Z',
      installationUrl: 'https://github.com/apps/gi-tiempo/installations/new',
      state: 'a'.repeat(32),
    }),
    ...overrides,
  };
}

function createSubject({
  canConfigure = true,
  client = createClient(),
  navigate = vi.fn(),
  organizations: initialOrganizations = [] as readonly WorkspaceGitHubOrganizationResponse[],
} = {}) {
  const errors = vi.fn();
  const organizations = shallowRef(initialOrganizations);
  let result!: ReturnType<typeof useAdminWorkspaceGitHubInstallations>;

  mount(
    defineComponent({
      setup() {
        result = useAdminWorkspaceGitHubInstallations({
          canConfigure: ref(canConfigure),
          client,
          enabled: ref(true),
          navigate,
          onError: errors,
          organizations,
          scope: shallowRef({ role: 'admin', userId: 'user-1', workspaceId: 'workspace-1' }),
        });
        return () => null;
      },
    }),
    { global: { plugins: [createTestQueryPlugin()] } },
  );

  return { client, errors, navigate, organizations, result };
}

describe('useAdminWorkspaceGitHubInstallations', () => {
  it('shows saved installation state even when the admin cannot configure GitHub', async () => {
    const { client, result } = createSubject({ canConfigure: false });
    await flushPromises();

    expect(client.listWorkspaceGitHubInstallations).toHaveBeenCalledOnce();
    expect(result.items.value).toEqual([installation]);
  });

  it('blocks setup without OAuth organization access guidance', async () => {
    const { client, errors, result } = createSubject({ canConfigure: false });
    await flushPromises();

    await result.beginSetup('Octo-Org');

    expect(client.setupWorkspaceGitHubInstallation).not.toHaveBeenCalled();
    expect(errors).toHaveBeenCalledWith(
      'Authorize GitHub organization access from your profile before setting up the GitHub App.',
      expect.any(Error),
      'setup-workspace-github-installation',
    );
  });

  it('automatically confirms a discovered App for a missing allowed organization', async () => {
    const client = createClient({
      listWorkspaceGitHubInstallations: vi.fn().mockResolvedValue({ items: [] }),
      setupWorkspaceGitHubInstallation: vi.fn().mockResolvedValue({
        existingInstallationId: '987654',
        expiresAt: '2026-05-01T10:10:00.000Z',
        installationUrl: 'https://github.com/apps/gi-tiempo/installations/new',
        state: 'a'.repeat(32),
      }),
    });
    createSubject({
      client,
      organizations: [organization],
    });

    await flushPromises();
    await flushPromises();

    expect(client.setupWorkspaceGitHubInstallation).toHaveBeenCalledWith({
      organizationLogin: 'Octo-Org',
    });
    expect(client.completeWorkspaceGitHubInstallation).toHaveBeenCalledWith({
      installationId: '987654',
      state: 'a'.repeat(32),
    });
    expect(client.listWorkspaceGitHubInstallations).toHaveBeenCalled();
  });

  it('checks an organization as soon as it is added to the workspace policy', async () => {
    const client = createClient({
      listWorkspaceGitHubInstallations: vi.fn().mockResolvedValue({ items: [] }),
    });
    const { organizations } = createSubject({ client });
    await flushPromises();

    organizations.value = [organization];
    await flushPromises();
    await flushPromises();

    expect(client.setupWorkspaceGitHubInstallation).toHaveBeenCalledWith({
      organizationLogin: 'Octo-Org',
    });
  });

  it('automatically rechecks a verified installation when Settings opens', async () => {
    const { client } = createSubject({
      organizations: [organization],
    });

    await flushPromises();

    expect(client.reverifyWorkspaceGitHubInstallation).toHaveBeenCalledWith(installation.id);
    expect(client.setupWorkspaceGitHubInstallation).not.toHaveBeenCalled();
  });

  it('rediscovers an unavailable association when Settings opens', async () => {
    const unavailableInstallation = {
      ...installation,
      recoveryReason: 'GitHub App installation is no longer available',
      status: 'unavailable' as const,
    };
    const client = createClient({
      listWorkspaceGitHubInstallations: vi.fn().mockResolvedValue({
        items: [unavailableInstallation],
      }),
      setupWorkspaceGitHubInstallation: vi.fn().mockResolvedValue({
        existingInstallationId: '987654',
        expiresAt: '2026-05-01T10:10:00.000Z',
        installationUrl: 'https://github.com/apps/gi-tiempo/installations/new',
        state: 'b'.repeat(32),
      }),
    });
    createSubject({ client, organizations: [organization] });

    await flushPromises();

    expect(client.setupWorkspaceGitHubInstallation).toHaveBeenCalledWith({
      organizationLogin: 'Octo-Org',
    });
    expect(client.completeWorkspaceGitHubInstallation).toHaveBeenCalledWith({
      installationId: '987654',
      state: 'b'.repeat(32),
    });
  });

  it('rediscovers an installation immediately after GitHub reports a stale verified link', async () => {
    const unavailableInstallation = {
      ...installation,
      recoveryReason: 'GitHub App installation is no longer available',
      status: 'unavailable' as const,
    };
    const client = createClient({
      reverifyWorkspaceGitHubInstallation: vi.fn().mockResolvedValue(unavailableInstallation),
      setupWorkspaceGitHubInstallation: vi.fn().mockResolvedValue({
        existingInstallationId: '987654',
        expiresAt: '2026-05-01T10:10:00.000Z',
        installationUrl: 'https://github.com/apps/gi-tiempo/installations/new',
        state: 'c'.repeat(32),
      }),
    });
    createSubject({ client, organizations: [organization] });

    await flushPromises();

    expect(client.reverifyWorkspaceGitHubInstallation).toHaveBeenCalledWith(installation.id);
    expect(client.setupWorkspaceGitHubInstallation).toHaveBeenCalledWith({
      organizationLogin: 'Octo-Org',
    });
    expect(client.completeWorkspaceGitHubInstallation).toHaveBeenCalledWith({
      installationId: '987654',
      state: 'c'.repeat(32),
    });
  });

  it('opens the stateful installation URL after binding setup to the selected organization', async () => {
    const installationUrl = `https://github.com/apps/gi-tiempo/installations/new?state=${'a'.repeat(32)}`;
    const client = createClient({
      setupWorkspaceGitHubInstallation: vi.fn().mockResolvedValue({
        expiresAt: '2026-05-01T10:10:00.000Z',
        installationUrl,
        state: 'a'.repeat(32),
      }),
    });
    const navigate = vi.fn();
    const { result } = createSubject({ client, navigate });
    await flushPromises();

    await result.beginInstallation('Octo-Org');

    expect(client.setupWorkspaceGitHubInstallation).toHaveBeenCalledWith({
      organizationLogin: 'Octo-Org',
    });
    expect(navigate).toHaveBeenCalledWith(installationUrl);
  });

});
