import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import {
  adminMutationInvalidationKeys,
  type AdminServerStateScope,
} from '@/lib/query-keys';
import { createTestQueryClient, createTestQueryPlugin } from '@/test/query-client';
import { useAdminSettingsSaveMutation } from './useAdminSettingsSaveMutation';

const scope: AdminServerStateScope = { role: null, userId: null, workspaceId: null };

function mountSettingsSave() {
  const client = {
    updateWorkspace: vi.fn().mockResolvedValue({
      createdAt: '2026-05-01T10:00:00.000Z',
      id: 'workspace-1',
      name: 'Updated Workspace',
      updatedAt: '2026-05-02T10:00:00.000Z',
    }),
    updateWorkspaceSettings: vi.fn().mockResolvedValue({
      createdAt: '2026-05-01T10:00:00.000Z',
      currency: 'EUR',
      defaultHourlyRate: null,
      id: 'settings-1',
      timeZone: 'UTC',
      updatedAt: '2026-05-02T10:00:00.000Z',
      workspaceId: 'workspace-1',
    }),
  };
  const queryClient = createTestQueryClient();
  const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
  let api!: ReturnType<typeof useAdminSettingsSaveMutation>;

  mount(
    defineComponent({
      setup() {
        api = useAdminSettingsSaveMutation({
          client,
          scope: () => scope,
          token: () => 'access-token',
        });

        return () => null;
      },
    }),
    {
      global: {
        plugins: [createTestQueryPlugin(queryClient)],
      },
    },
  );

  return { api, client, invalidateQueries };
}

describe('useAdminSettingsSaveMutation', () => {
  it('updates workspace settings and invalidates settings queries', async () => {
    const { api, client, invalidateQueries } = mountSettingsSave();

    await api.updateWorkspace({ name: 'Updated Workspace' });
    expect(client.updateWorkspace).toHaveBeenCalledWith('access-token', {
      name: 'Updated Workspace',
    });
    expect(invalidateQueries.mock.calls.map(([options]) => options)).toEqual(
      adminMutationInvalidationKeys
        .afterSettingsSave(scope)
        .map((queryKey) => ({ queryKey })),
    );

    invalidateQueries.mockClear();
    await api.updateWorkspaceSettings({ currency: 'EUR' });
    expect(client.updateWorkspaceSettings).toHaveBeenCalledWith('access-token', {
      currency: 'EUR',
    });
    expect(invalidateQueries.mock.calls.map(([options]) => options)).toEqual(
      adminMutationInvalidationKeys
        .afterSettingsSave(scope)
        .map((queryKey) => ({ queryKey })),
    );
  });
});
