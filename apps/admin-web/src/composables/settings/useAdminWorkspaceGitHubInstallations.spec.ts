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
          organizations: shallowRef(initialOrganizations),
          scope: shallowRef({ role: 'admin', userId: 'user-1', workspaceId: 'workspace-1' }),
        });
        return () => null;
      },
    }),
    { global: { plugins: [createTestQueryPlugin()] } },
  );

  return { client, errors, navigate, result };
}

describe('useAdminWorkspaceGitHubInstallations', () => {
  it('shows saved installation state even when the admin cannot configure GitHub', async () => {
    const { client, result } = createSubject({ canConfigure: false });
    await flushPromises();

    expect(client.listWorkspaceGitHubInstallations).toHaveBeenCalledOnce();
    expect(result.items.value).toEqual([installation]);
  });

  it('blocks setup until the admin can prove GitHub owner authority', async () => {
    const { client, errors, result } = createSubject({ canConfigure: false });
    await flushPromises();

    await result.beginSetup('Octo-Org');

    expect(client.setupWorkspaceGitHubInstallation).not.toHaveBeenCalled();
    expect(errors).toHaveBeenCalledTimes(1);
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

  it('does not reverify an organization that already has an association', async () => {
    const { client } = createSubject({
      organizations: [organization],
    });

    await flushPromises();

    expect(client.setupWorkspaceGitHubInstallation).not.toHaveBeenCalled();
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
