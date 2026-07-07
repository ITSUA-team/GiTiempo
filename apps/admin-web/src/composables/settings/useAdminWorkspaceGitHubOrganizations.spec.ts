import { defineComponent, ref, shallowRef } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import type {
  GitHubOwner,
  WorkspaceGitHubOrganizationResponse,
} from '@gitiempo/shared';
import type { AdminSettingsClient } from '@/services/admin-settings-client';
import { createTestQueryPlugin } from '@/test/query-client';
import { useAdminWorkspaceGitHubOrganizations } from './useAdminWorkspaceGitHubOrganizations';

type WorkspaceGitHubOrganizationsClient = Pick<
  AdminSettingsClient,
  | 'addWorkspaceGitHubOrganization'
  | 'listAvailableGitHubOrganizations'
  | 'listWorkspaceGitHubOrganizations'
  | 'removeWorkspaceGitHubOrganization'
>;

const availableOrganization: GitHubOwner = {
  avatarUrl: null,
  label: 'Octo-Org',
  login: 'Octo-Org',
  type: 'organization',
  url: 'https://github.com/Octo-Org',
};

const otherOrganization: GitHubOwner = {
  avatarUrl: null,
  label: 'Other-Org',
  login: 'Other-Org',
  type: 'organization',
  url: 'https://github.com/Other-Org',
};

const addedOrganization: WorkspaceGitHubOrganizationResponse = {
  createdAt: '2026-05-01T10:00:00.000Z',
  createdByUserId: '44444444-4444-4444-8444-444444444444',
  id: '33333333-3333-4333-8333-333333333333',
  organizationLogin: 'Octo-Org',
  workspaceId: '11111111-1111-4111-8111-111111111111',
};

function createClient(
  overrides: Partial<WorkspaceGitHubOrganizationsClient> = {},
): WorkspaceGitHubOrganizationsClient {
  return {
    addWorkspaceGitHubOrganization: vi.fn().mockResolvedValue(addedOrganization),
    listAvailableGitHubOrganizations: vi.fn().mockResolvedValue({
      items: [availableOrganization],
    }),
    listWorkspaceGitHubOrganizations: vi.fn().mockResolvedValue({ items: [] }),
    removeWorkspaceGitHubOrganization: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createSubject({
  availableOrganizationsEnabled: isAvailableOrganizationsEnabled = true,
  client = createClient(),
  enabled: isEnabled = true,
}: {
  availableOrganizationsEnabled?: boolean;
  client?: WorkspaceGitHubOrganizationsClient;
  enabled?: boolean;
} = {}) {
  let result!: ReturnType<typeof useAdminWorkspaceGitHubOrganizations>;
  const availableOrganizationsEnabled = ref(isAvailableOrganizationsEnabled);
  const enabled = ref(isEnabled);
  const scope = shallowRef({
    role: 'admin' as const,
    userId: 'user-1',
    workspaceId: 'workspace-1',
  });

  mount(
    defineComponent({
      setup() {
        result = useAdminWorkspaceGitHubOrganizations({
          availableOrganizationsEnabled,
          client,
          enabled,
          scope,
        });

        return () => null;
      },
    }),
    {
      global: {
        plugins: [createTestQueryPlugin()],
      },
    },
  );

  return { availableOrganizationsEnabled, client, enabled, result };
}

describe('useAdminWorkspaceGitHubOrganizations', () => {
  it('adds a selected organization from the loaded selectable list', async () => {
    const { client, result } = createSubject();
    await flushPromises();

    result.selectedOrganization.value = availableOrganization;
    await flushPromises();
    await result.addOrganization();

    expect(client.addWorkspaceGitHubOrganization).toHaveBeenCalledWith({
      organizationLogin: 'Octo-Org',
    });
    expect(result.organizationLoginError.value).toBeNull();
  });

  it('does not add a stale selection when setup organizations are gated off', async () => {
    const { client, result } = createSubject({
      availableOrganizationsEnabled: false,
    });
    await flushPromises();

    result.selectedOrganization.value = availableOrganization;
    await flushPromises();
    await result.addOrganization();

    expect(client.listAvailableGitHubOrganizations).not.toHaveBeenCalled();
    expect(client.addWorkspaceGitHubOrganization).not.toHaveBeenCalled();
    expect(result.organizationLoginError.value).toBe(
      'Confirm your GitHub account connection before adding organizations',
    );
  });

  it('does not add while selectable organizations failed to load', async () => {
    const client = createClient({
      listAvailableGitHubOrganizations: vi
        .fn()
        .mockRejectedValue(new Error('GitHub organizations unavailable')),
    });
    const { result } = createSubject({ client });
    await flushPromises();

    result.selectedOrganization.value = availableOrganization;
    await flushPromises();
    await result.addOrganization();

    expect(client.addWorkspaceGitHubOrganization).not.toHaveBeenCalled();
    expect(result.organizationLoginError.value).toBe(
      'Reload GitHub organizations before adding workspace organizations',
    );
  });

  it('does not add a selected organization missing from current selectable options', async () => {
    const client = createClient({
      listAvailableGitHubOrganizations: vi.fn().mockResolvedValue({
        items: [otherOrganization],
      }),
    });
    const { result } = createSubject({ client });
    await flushPromises();

    result.selectedOrganization.value = availableOrganization;
    await flushPromises();
    await result.addOrganization();

    expect(client.addWorkspaceGitHubOrganization).not.toHaveBeenCalled();
    expect(result.organizationLoginError.value).toBe(
      'Select a GitHub organization from the available list',
    );
  });
});
