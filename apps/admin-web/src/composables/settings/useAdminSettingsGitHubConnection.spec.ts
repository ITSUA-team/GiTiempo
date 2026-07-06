import { defineComponent, ref, shallowRef } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import type { GitHubConnectionStatusResponse } from '@gitiempo/shared';
import type { AdminSettingsClient } from '@/services/admin-settings-client';
import { createTestQueryPlugin } from '@/test/query-client';
import { useAdminSettingsGitHubConnection } from './useAdminSettingsGitHubConnection';

type GitHubConnectionErrorHandler = NonNullable<
  Parameters<typeof useAdminSettingsGitHubConnection>[0]['onError']
>;

const connectedStatus: GitHubConnectionStatusResponse = {
  account: {
    avatarUrl: 'https://avatars.example.test/octo.png',
    connectedAt: '2026-05-01T10:00:00.000Z',
    githubUserId: '123456',
    login: 'octocat',
    updatedAt: '2026-05-01T10:00:00.000Z',
  },
  status: 'connected',
};

const disconnectedStatus: GitHubConnectionStatusResponse = {
  account: null,
  status: 'disconnected',
};

function createClient(
  overrides: Partial<Pick<AdminSettingsClient, 'getGitHubConnectionStatus'>> = {},
) {
  return {
    getGitHubConnectionStatus: vi.fn().mockResolvedValue(connectedStatus),
    ...overrides,
  } satisfies Pick<AdminSettingsClient, 'getGitHubConnectionStatus'>;
}

function createSubject({
  client = createClient(),
  enabled: isEnabled = true,
  onError = vi.fn(),
}: {
  client?: Pick<AdminSettingsClient, 'getGitHubConnectionStatus'>;
  enabled?: boolean;
  onError?: GitHubConnectionErrorHandler;
} = {}) {
  let result!: ReturnType<typeof useAdminSettingsGitHubConnection>;
  const enabled = ref(isEnabled);
  const scope = shallowRef({
    role: 'admin' as const,
    userId: 'user-1',
    workspaceId: 'workspace-1',
  });

  mount(
    defineComponent({
      setup() {
        result = useAdminSettingsGitHubConnection({
          client,
          enabled,
          onError,
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

  return { client, enabled, onError, result };
}

describe('useAdminSettingsGitHubConnection', () => {
  it('loads a connected account status', async () => {
    const { client, onError, result } = createSubject();

    await flushPromises();

    expect(client.getGitHubConnectionStatus).toHaveBeenCalledWith();
    expect(result.connection.value).toEqual(connectedStatus);
    expect(result.account.value?.login).toBe('octocat');
    expect(result.isConnected.value).toBe(true);
    expect(result.requestError.value).toBeNull();
    expect(result.isInitialLoading.value).toBe(false);
    expect(onError).not.toHaveBeenCalled();
  });

  it('exposes disconnected status without treating it as an error', async () => {
    const client = createClient({
      getGitHubConnectionStatus: vi.fn().mockResolvedValue(disconnectedStatus),
    });
    const { onError, result } = createSubject({ client });

    await flushPromises();

    expect(result.connection.value).toEqual(disconnectedStatus);
    expect(result.account.value).toBeNull();
    expect(result.isConnected.value).toBe(false);
    expect(result.requestError.value).toBeNull();
    expect(onError).not.toHaveBeenCalled();
  });

  it('keeps failed status loads retryable', async () => {
    const client = createClient({
      getGitHubConnectionStatus: vi
        .fn()
        .mockRejectedValueOnce(new Error('GitHub status unavailable'))
        .mockResolvedValueOnce(connectedStatus),
    });
    const { onError, result } = createSubject({ client });

    await flushPromises();

    expect(result.requestError.value).toBe('GitHub status unavailable');
    expect(result.isConnected.value).toBe(false);
    expect(onError).toHaveBeenCalledWith(
      'GitHub status unavailable',
      expect.any(Error),
      'load-github-connection-status',
    );

    await result.retryLoad();
    await flushPromises();

    expect(result.requestError.value).toBeNull();
    expect(result.isConnected.value).toBe(true);
    expect(client.getGitHubConnectionStatus).toHaveBeenCalledTimes(2);
  });

  it('does not request status when disabled', async () => {
    const { client, result } = createSubject({ enabled: false });

    await flushPromises();

    expect(client.getGitHubConnectionStatus).not.toHaveBeenCalled();
    expect(result.connection.value).toBeNull();
    expect(result.isConnected.value).toBe(false);
    expect(result.loading.value).toBe(false);
  });
});
