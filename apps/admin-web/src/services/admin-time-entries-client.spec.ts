import { describe, expect, it, vi } from 'vitest';

import { createAdminTimeEntriesClient } from './admin-time-entries-client';

const projectId = '00000000-0000-4000-8000-000000000101';
const userId = '00000000-0000-4000-8000-000000000102';

describe('admin time entries client', () => {
  it.each([
    ['projects', '/management/projects', {}],
    ['members', `/management/projects/${projectId}/time-entry-members`, { purpose: 'filter' }],
    ['tasks', `/management/projects/${projectId}/time-entry-tasks`, { userId }],
  ] as const)('loads further pages of %s choices', async (picker, path, filters) => {
    const requestJson = vi.fn()
      .mockResolvedValueOnce({ items: [{ id: 'first' }], meta: { totalPages: 2 } })
      .mockResolvedValueOnce({ items: [{ id: 'second' }], meta: { totalPages: 2 } });
    const client = createAdminTimeEntriesClient({ requestJson, requestNoContent: vi.fn() });
    const current = () => true;
    const request = {
      projects: () => client.projects(current),
      members: () => client.members(projectId, 'filter', current),
      tasks: async () => (await client.tasks(projectId, userId, current)).items,
    };

    await expect(request[picker]()).resolves.toEqual([{ id: 'first' }, { id: 'second' }]);
    expect(requestJson.mock.calls.map(([options]) => {
      const url = new URL(options.path, 'https://example.test');
      return { path: url.pathname, query: Object.fromEntries(url.searchParams) };
    })).toEqual([
      { path, query: { page: '1', limit: '100', ...filters } },
      { path, query: { page: '2', limit: '100', ...filters } },
    ]);
  });

  it('queries task-first choices and preserves assignment on an empty owner-scoped result', async () => {
    const taskId = '00000000-0000-4000-8000-000000000103';
    const requestJson = vi.fn()
      .mockResolvedValueOnce({ items: [], meta: { totalPages: 0 } })
      .mockResolvedValueOnce({ items: [], meta: { totalPages: 0 } })
      .mockResolvedValueOnce({ items: [], meta: { totalPages: 0 }, isOwnerAssigned: true });
    const client = createAdminTimeEntriesClient({ requestJson, requestNoContent: vi.fn() });
    const current = () => true;

    await client.tasks(projectId, undefined, current);
    await client.members(projectId, 'create', current, taskId);
    await expect(client.tasks(projectId, userId, current)).resolves.toEqual({
      items: [], isOwnerAssigned: true,
    });
    expect(requestJson.mock.calls.map(([options]) => options.path)).toEqual([
      `/management/projects/${projectId}/time-entry-tasks?page=1&limit=100`,
      `/management/projects/${projectId}/time-entry-members?page=1&limit=100&purpose=create&taskId=${taskId}`,
      `/management/projects/${projectId}/time-entry-tasks?page=1&limit=100&userId=${userId}`,
    ]);
  });

  it('stops requesting option pages when the selection becomes stale', async () => {
    let current = true;
    const requestJson = vi.fn().mockImplementationOnce(async () => {
      current = false;
      return { items: [], meta: { totalPages: 2 } };
    });
    const client = createAdminTimeEntriesClient({ requestJson, requestNoContent: vi.fn() });

    await client.members(projectId, 'create', () => current);

    expect(requestJson).toHaveBeenCalledOnce();
  });
});
