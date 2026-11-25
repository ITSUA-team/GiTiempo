import { createAuthenticatedApiClient } from '@gitiempo/web-shared/http';
import { describe, expect, it, vi } from 'vitest';

import { createAdminTimeEntriesClient } from './admin-time-entries-client';

const projectId = '00000000-0000-4000-8000-000000000101';
const userId = '00000000-0000-4000-8000-000000000102';
const destinationId = '00000000-0000-4000-8000-000000000103';
const taskId = '00000000-0000-4000-8000-000000000104';
const entryId = '00000000-0000-4000-8000-000000000105';
const workspaceId = '00000000-0000-4000-8000-000000000106';

function authenticatedClient(fetchFn: typeof fetch) {
  return createAdminTimeEntriesClient(createAuthenticatedApiClient({
    apiBaseUrl: 'https://api.example.test',
    fetchFn,
    getToken: () => 'access-token',
    onRefreshFailed: vi.fn(),
    refreshAccessToken: async () => 'access-token',
  }));
}

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

  it('patches the source path with destination fields and parses the resulting entry', async () => {
    const input = { projectId: destinationId, userId, taskId };
    const entry = {
      ...input,
      id: entryId,
      workspaceId,
      workspace: { id: workspaceId, name: 'Workspace' },
      project: { id: destinationId, name: 'Destination' },
      task: { id: taskId, title: 'Destination task' },
      user: { id: userId, displayName: 'Member', email: 'member@example.com', avatarUrl: null },
      startedAt: '2026-11-25T09:00:00.000Z',
      endedAt: '2026-11-25T10:00:00.000Z',
      createdAt: '2026-11-25T10:00:00.000Z',
      updatedAt: '2026-11-25T10:30:00.000Z',
      durationSeconds: 3600,
      isBillable: false,
      source: 'manual',
      description: null,
      invoiceId: null,
      githubIssue: null,
    };
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(Response.json(entry));

    await expect(authenticatedClient(fetchFn).update(projectId, entryId, input)).resolves.toEqual(entry);

    expect(fetchFn).toHaveBeenCalledWith(
      `https://api.example.test/management/projects/${projectId}/time-entries/${entryId}`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
        method: 'PATCH',
      }),
    );
    expect(JSON.parse(String(fetchFn.mock.calls[0]?.[1]?.body))).toEqual(input);
  });

  it('keeps the status and details of a reassignment rejected by the API', async () => {
    const body = { message: 'Owner cannot track time on this task' };
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(Response.json(body, { status: 422 }));

    await expect(authenticatedClient(fetchFn).update(projectId, entryId, { userId })).rejects.toMatchObject({
      status: 422,
      message: body.message,
      body,
    });
  });
});
