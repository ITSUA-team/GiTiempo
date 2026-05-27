import { defineComponent, shallowRef } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import type { AdminSettingsClient } from '@/services/admin-settings-client';
import { createTestQueryPlugin } from '@/test/query-client';
import { useAdminSettingsData } from './useAdminSettingsData';

type AdminSettingsDataErrorHandler = NonNullable<
  Parameters<typeof useAdminSettingsData>[0]['onError']
>;

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

function createClient(
  overrides: Partial<
    Pick<AdminSettingsClient, 'getWorkspace' | 'getWorkspaceSettings'>
  > = {},
) {
  return {
    getWorkspace: vi.fn().mockResolvedValue(workspaceResponse),
    getWorkspaceSettings: vi.fn().mockResolvedValue(settingsResponse),
    ...overrides,
  } satisfies Pick<
    AdminSettingsClient,
    'getWorkspace' | 'getWorkspaceSettings'
  >;
}

function createSubject({
  accessToken = 'access-token',
  client = createClient(),
  onError = vi.fn(),
}: {
  accessToken?: string | null;
  client?: Pick<AdminSettingsClient, 'getWorkspace' | 'getWorkspaceSettings'>;
  onError?: AdminSettingsDataErrorHandler;
} = {}) {
  let data!: ReturnType<typeof useAdminSettingsData>;
  const token = shallowRef(accessToken);
  const scope = shallowRef({
    role: 'admin' as const,
    userId: 'user-1',
    workspaceId: 'workspace-1',
  });

  mount(
    defineComponent({
      setup() {
        data = useAdminSettingsData({
          accessToken: token,
          client,
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

  return { client, data, onError, token };
}

describe('useAdminSettingsData', () => {
  it('loads workspace and settings source data', async () => {
    const { client, data, onError } = createSubject();

    const result = await data.loadSettings();

    expect(client.getWorkspace).toHaveBeenCalledWith('access-token');
    expect(client.getWorkspaceSettings).toHaveBeenCalledWith('access-token');
    expect(result).toEqual({
      settings: settingsResponse,
      workspace: workspaceResponse,
    });
    expect(data.workspace.value).toBe(workspaceResponse);
    expect(data.settings.value).toBe(settingsResponse);
    expect(data.requestError.value).toBeNull();
    expect(data.initialLoaded.value).toBe(true);
    expect(data.isInitialLoading.value).toBe(false);
    expect(onError).not.toHaveBeenCalled();
  });

  it('keeps failed loads retryable with scoped error reporting', async () => {
    const client = createClient({
      getWorkspace: vi
        .fn()
        .mockRejectedValueOnce(new Error('Network unavailable'))
        .mockResolvedValueOnce(workspaceResponse),
    });
    const { data, onError } = createSubject({ client });

    await expect(data.loadSettings()).resolves.toBeNull();

    expect(data.requestError.value).toBe('Network unavailable');
    expect(data.initialLoaded.value).toBe(false);
    expect(onError).toHaveBeenCalledWith(
      'Network unavailable',
      expect.any(Error),
      'load-settings',
    );

    await expect(data.retryLoad()).resolves.toEqual({
      settings: settingsResponse,
      workspace: workspaceResponse,
    });

    expect(data.requestError.value).toBeNull();
    expect(data.workspace.value).toBe(workspaceResponse);
    expect(client.getWorkspace).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('blocks load attempts when the access token is absent', async () => {
    const { client, data, onError } = createSubject({ accessToken: null });

    await expect(data.loadSettings()).resolves.toBeNull();

    expect(client.getWorkspace).not.toHaveBeenCalled();
    expect(client.getWorkspaceSettings).not.toHaveBeenCalled();
    expect(data.requestError.value).toBe(
      'Authentication is required to load settings.',
    );
    expect(data.initialLoaded.value).toBe(true);
    expect(data.loading.value).toBe(false);
    expect(onError).toHaveBeenCalledWith(
      'Authentication is required to load settings.',
      undefined,
      'load-settings',
    );
  });
});
