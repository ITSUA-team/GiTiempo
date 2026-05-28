import { defineComponent, shallowRef } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import type { AdminSettingsClient } from '@/services/admin-settings-client';
import { createTestQueryPlugin } from '@/test/query-client';
import { useAdminSettingsPersistence } from './useAdminSettingsPersistence';

type AdminSettingsPersistenceErrorHandler = NonNullable<
  Parameters<typeof useAdminSettingsPersistence>[0]['onError']
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

const currentValues = {
  currency: 'USD',
  defaultHourlyRate: 120,
  timeZone: 'UTC',
  workspaceName: 'GiTiempo Studio',
};

function createClient(
  overrides: Partial<
    Pick<AdminSettingsClient, 'updateWorkspace' | 'updateWorkspaceSettings'>
  > = {},
) {
  return {
    updateWorkspace: vi.fn().mockResolvedValue(workspaceResponse),
    updateWorkspaceSettings: vi.fn().mockResolvedValue(settingsResponse),
    ...overrides,
  } satisfies Pick<
    AdminSettingsClient,
    'updateWorkspace' | 'updateWorkspaceSettings'
  >;
}

function createSubject({
  accessToken = 'access-token',
  client = createClient(),
  onError = vi.fn(),
}: {
  accessToken?: string | null;
  client?: Pick<
    AdminSettingsClient,
    'updateWorkspace' | 'updateWorkspaceSettings'
  >;
  onError?: AdminSettingsPersistenceErrorHandler;
} = {}) {
  let persistence!: ReturnType<typeof useAdminSettingsPersistence>;
  const token = shallowRef(accessToken);
  const scope = shallowRef({
    role: 'admin' as const,
    userId: 'user-1',
    workspaceId: 'workspace-1',
  });

  mount(
    defineComponent({
      setup() {
        persistence = useAdminSettingsPersistence({
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

  return { client, onError, persistence, token };
}

describe('useAdminSettingsPersistence', () => {
  it('saves workspace-only changes', async () => {
    const client = createClient({
      updateWorkspace: vi.fn().mockResolvedValue({
        ...workspaceResponse,
        name: 'Updated Workspace',
      }),
    });
    const { persistence } = createSubject({ client });

    const result = await persistence.saveSettings({
      current: currentValues,
      settings: settingsResponse,
      values: {
        ...currentValues,
        workspaceName: 'Updated Workspace',
      },
      workspace: workspaceResponse,
    });

    expect(client.updateWorkspace).toHaveBeenCalledWith({
      name: 'Updated Workspace',
    });
    expect(client.updateWorkspaceSettings).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      values: { workspaceName: 'Updated Workspace' },
      wroteChanges: true,
    });
  });

  it('saves settings-only changes', async () => {
    const client = createClient({
      updateWorkspaceSettings: vi.fn().mockResolvedValue({
        ...settingsResponse,
        currency: 'EUR',
        defaultHourlyRate: null,
        timeZone: 'Europe/Kyiv',
      }),
    });
    const { persistence } = createSubject({ client });

    const result = await persistence.saveSettings({
      current: currentValues,
      settings: settingsResponse,
      values: {
        currency: 'EUR',
        defaultHourlyRate: null,
        timeZone: 'Europe/Kyiv',
        workspaceName: 'GiTiempo Studio',
      },
      workspace: workspaceResponse,
    });

    expect(client.updateWorkspace).not.toHaveBeenCalled();
    expect(client.updateWorkspaceSettings).toHaveBeenCalledWith({
      currency: 'EUR',
      defaultHourlyRate: null,
      timeZone: 'Europe/Kyiv',
    });
    expect(result).toMatchObject({
      values: {
        currency: 'EUR',
        defaultHourlyRate: null,
        timeZone: 'Europe/Kyiv',
      },
      wroteChanges: true,
    });
  });

  it('returns normalized values without update requests when nothing changed', async () => {
    const { client, persistence } = createSubject();

    const result = await persistence.saveSettings({
      current: currentValues,
      settings: settingsResponse,
      values: currentValues,
      workspace: workspaceResponse,
    });

    expect(client.updateWorkspace).not.toHaveBeenCalled();
    expect(client.updateWorkspaceSettings).not.toHaveBeenCalled();
    expect(result).toEqual({
      settings: settingsResponse,
      values: currentValues,
      workspace: workspaceResponse,
      wroteChanges: false,
    });
  });

  it('reports save failures and preserves retryable state', async () => {
    const client = createClient({
      updateWorkspaceSettings: vi
        .fn()
        .mockRejectedValue(new Error('Could not save settings')),
    });
    const { onError, persistence } = createSubject({ client });

    await expect(
      persistence.saveSettings({
        current: currentValues,
        settings: settingsResponse,
        values: {
          ...currentValues,
          currency: 'EUR',
        },
        workspace: workspaceResponse,
      }),
    ).resolves.toBeNull();

    expect(persistence.saving.value).toBe(false);
    expect(onError).toHaveBeenCalledWith(
      'Could not save settings',
      expect.any(Error),
    );
  });

  it('does not call update clients when access token is absent', async () => {
    const { client, persistence } = createSubject({ accessToken: null });

    await expect(
      persistence.saveSettings({
        current: currentValues,
        settings: settingsResponse,
        values: {
          ...currentValues,
          workspaceName: 'Updated Workspace',
        },
        workspace: workspaceResponse,
      }),
    ).resolves.toBeNull();

    expect(client.updateWorkspace).not.toHaveBeenCalled();
    expect(client.updateWorkspaceSettings).not.toHaveBeenCalled();
  });
});
