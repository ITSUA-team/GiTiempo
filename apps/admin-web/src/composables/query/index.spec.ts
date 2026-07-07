import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, shallowRef } from 'vue';

import { adminSettingsKeys, type AdminServerStateScope } from '@/lib/query-keys';
import { createTestQueryClient, createTestQueryPlugin } from '@/test/query-client';

import { useGitHubConnectionStatusQuery } from './index';

const scope: AdminServerStateScope = {
  role: 'admin',
  userId: 'user-1',
  workspaceId: 'workspace-1',
};

describe('admin-web query composables', () => {
  it('loads GitHub connection status with the scoped settings key', async () => {
    const client = {
      getGitHubConnectionStatus: vi.fn().mockResolvedValue({
        status: 'connected',
        account: {
          githubUserId: 'github-user-1',
          login: 'octocat',
          avatarUrl: null,
          connectedAt: '2026-06-18T00:00:00.000Z',
          updatedAt: '2026-06-18T00:00:00.000Z',
        },
      }),
    };
    const queryClient = createTestQueryClient();
    const QueryProbe = defineComponent({
      name: 'GitHubConnectionQueryProbe',
      setup() {
        const enabled = shallowRef(true);
        const scopedState = shallowRef(scope);
        const query = useGitHubConnectionStatusQuery({
          client,
          enabled,
          scope: scopedState,
        });

        return () =>
          h(
            'div',
            { 'data-testid': 'github-connection-query-probe' },
            query.data.value?.status ?? 'pending',
          );
      },
    });

    const wrapper = mount(QueryProbe, {
      global: {
        plugins: [createTestQueryPlugin(queryClient)],
      },
    });
    await flushPromises();

    expect(client.getGitHubConnectionStatus).toHaveBeenCalledTimes(1);
    expect(
      queryClient.getQueryData(adminSettingsKeys.githubConnection(scope)),
    ).toEqual({
      status: 'connected',
      account: {
        githubUserId: 'github-user-1',
        login: 'octocat',
        avatarUrl: null,
        connectedAt: '2026-06-18T00:00:00.000Z',
        updatedAt: '2026-06-18T00:00:00.000Z',
      },
    });
    expect(
      wrapper.get('[data-testid="github-connection-query-probe"]').text(),
    ).toBe('connected');
  });
});
