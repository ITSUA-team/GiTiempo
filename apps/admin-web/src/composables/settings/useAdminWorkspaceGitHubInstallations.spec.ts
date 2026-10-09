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
  canConfigure: initialCanConfigure = true,
  client = createClient(),
  navigate = vi.fn(),
  organizations: initialOrganizations = [] as readonly WorkspaceGitHubOrganizationResponse[],
} = {}) {
  const errors = vi.fn();
  const canConfigure = ref(initialCanConfigure);
  const organizations = shallowRef(initialOrganizations);
  const scope = shallowRef({ role: 'admin' as const, userId: 'user-1', workspaceId: 'workspace-1' });
  let result!: ReturnType<typeof useAdminWorkspaceGitHubInstallations>;

  mount(
    defineComponent({
      setup() {
        result = useAdminWorkspaceGitHubInstallations({
          canConfigure,
          client,
          enabled: ref(true),
          navigate,
          onError: errors,
          organizations,
          scope,
        });
        return () => null;
      },
    }),
    { global: { plugins: [createTestQueryPlugin()] } },
  );

  return { canConfigure, client, errors, navigate, organizations, result, scope };
}

describe('useAdminWorkspaceGitHubInstallations', () => {
  it('does not set up an organization removed while a previous organization is checked', async () => {
    let resolveFirst!: (value: typeof installation) => void;
    const secondOrganization = { ...organization, id: '44444444-4444-4444-8444-444444444444', organizationLogin: 'Other-Org' };
    const client = createClient({
      reverifyWorkspaceGitHubInstallation: vi.fn(() => new Promise<typeof installation>((resolve) => { resolveFirst = resolve; })),
    });
    const { organizations } = createSubject({ client, organizations: [organization, secondOrganization] });
    await flushPromises();

    organizations.value = [organization];
    resolveFirst(installation);
    await flushPromises();

    expect(client.setupWorkspaceGitHubInstallation).not.toHaveBeenCalled();
  });

  it('keeps the new workspace check pending when an older same-login check finishes', async () => {
    const resolvers: ((value: typeof installation) => void)[] = [];
    const client = createClient({
      reverifyWorkspaceGitHubInstallation: vi.fn(() => new Promise<typeof installation>((resolve) => { resolvers.push(resolve); })),
    });
    const { result, scope } = createSubject({ client, organizations: [organization] });
    await flushPromises();

    scope.value = { ...scope.value, workspaceId: 'workspace-2' };
    await flushPromises();
    expect(resolvers).toHaveLength(2);

    resolvers[0]!(installation);
    await flushPromises();
    expect(result.checkingOrganizationLogins.value).toEqual(['octo-org']);

    resolvers[1]!(installation);
    await flushPromises();
    expect(result.checkingOrganizationLogins.value).toEqual([]);
  });

  it('does not rediscover an explicitly disconnected installation', async () => {
    const client = createClient({
      listWorkspaceGitHubInstallations: vi.fn().mockResolvedValue({ items: [{ ...installation, status: 'disconnected' }] }),
    });
    createSubject({ client, organizations: [organization] });
    await flushPromises();

    expect(client.setupWorkspaceGitHubInstallation).not.toHaveBeenCalled();
    expect(client.reverifyWorkspaceGitHubInstallation).not.toHaveBeenCalled();
  });

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

  it('discovers a missing installation after OAuth organization access becomes ready', async () => {
    const client = createClient({
      listWorkspaceGitHubInstallations: vi.fn().mockResolvedValue({ items: [] }),
    });
    const { canConfigure, errors, navigate } = createSubject({
      canConfigure: false,
      client,
      organizations: [organization],
    });
    await flushPromises();

    expect(client.setupWorkspaceGitHubInstallation).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();

    canConfigure.value = true;
    await flushPromises();

    expect(client.setupWorkspaceGitHubInstallation).toHaveBeenCalledWith({
      organizationLogin: 'Octo-Org',
    });
    expect(navigate).not.toHaveBeenCalled();
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

  it('discovers an unavailable verified installation after OAuth organization access becomes ready', async () => {
    const unavailableInstallation = {
      ...installation,
      recoveryReason: 'GitHub App installation is no longer available',
      status: 'unavailable' as const,
    };
    const client = createClient({
      listWorkspaceGitHubInstallations: vi
        .fn()
        .mockResolvedValueOnce({ items: [installation] })
        .mockResolvedValue({ items: [unavailableInstallation] }),
      reverifyWorkspaceGitHubInstallation: vi.fn().mockResolvedValue(unavailableInstallation),
      setupWorkspaceGitHubInstallation: vi.fn().mockResolvedValue({
        existingInstallationId: '987654',
        expiresAt: '2026-05-01T10:10:00.000Z',
        installationUrl: 'https://github.com/apps/gi-tiempo/installations/new',
        state: 'd'.repeat(32),
      }),
    });
    const { canConfigure } = createSubject({
      canConfigure: false,
      client,
      organizations: [organization],
    });

    await flushPromises();
    await flushPromises();

    expect(client.reverifyWorkspaceGitHubInstallation).toHaveBeenCalledWith(installation.id);
    expect(client.setupWorkspaceGitHubInstallation).not.toHaveBeenCalled();

    canConfigure.value = true;
    await flushPromises();
    await flushPromises();

    expect(client.setupWorkspaceGitHubInstallation).toHaveBeenCalledWith({
      organizationLogin: 'Octo-Org',
    });
    expect(client.completeWorkspaceGitHubInstallation).toHaveBeenCalledWith({
      installationId: '987654',
      state: 'd'.repeat(32),
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
