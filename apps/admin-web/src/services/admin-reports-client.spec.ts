import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAdminReportsClient } from './admin-reports-client';

const projectId = '11111111-1111-4111-8111-111111111111';
const taskId = '22222222-2222-4222-8222-222222222222';
const userId = '33333333-3333-4333-8333-333333333333';
const workspaceId = '44444444-4444-4444-8444-444444444444';
const entryId = '55555555-5555-4555-8555-555555555555';

describe('createAdminReportsClient', () => {
  const fetchFn = vi.fn<typeof fetch>();
  const client = createAdminReportsClient({
    apiBaseUrl: 'https://api.example.test',
    fetchFn,
  });

  beforeEach(() => {
    fetchFn.mockReset();
  });

  it('lists project entries with auth headers, pagination, and serialized filters', async () => {
    fetchFn.mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
            {
              createdAt: '2026-05-01T10:00:00.000Z',
              description: null,
              durationSeconds: 7200,
              endedAt: '2026-05-01T12:00:00.000Z',
              id: entryId,
              isBillable: true,
              project: { id: projectId, name: 'Project Orion' },
              projectId,
              source: 'manual',
              startedAt: '2026-05-01T10:00:00.000Z',
              task: { id: taskId, title: 'API work' },
              taskId,
              updatedAt: '2026-05-01T12:00:00.000Z',
              user: {
                avatarUrl: null,
                displayName: 'Alex Admin',
                email: 'alex@example.com',
                id: userId,
              },
              userId,
              workspaceId,
            },
          ],
          meta: { limit: 100, page: 2, total: 101, totalPages: 2 },
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        },
      ),
    );

    const result = await client.listProjectEntries('access-token', projectId, {
      dateFrom: '2026-05-01T00:00:00.000Z',
      dateTo: '2026-05-08T00:00:00.000Z',
      limit: 100,
      page: 2,
      search: 'api',
    });

    const [url, init] = fetchFn.mock.calls[0] ?? [];
    const requestUrl = new URL(String(url));

    expect(requestUrl.origin).toBe('https://api.example.test');
    expect(requestUrl.pathname).toBe(`/projects/${projectId}/time-entries`);
    expect(requestUrl.searchParams.get('page')).toBe('2');
    expect(requestUrl.searchParams.get('limit')).toBe('100');
    expect(requestUrl.searchParams.get('dateFrom')).toBe(
      '2026-05-01T00:00:00.000Z',
    );
    expect(requestUrl.searchParams.get('dateTo')).toBe(
      '2026-05-08T00:00:00.000Z',
    );
    expect(requestUrl.searchParams.get('search')).toBe('api');
    expect(init).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
        method: 'GET',
      }),
    );
    expect(result.meta.totalPages).toBe(2);
    expect(result.items[0]?.project.name).toBe('Project Orion');
  });

  it('surfaces API error messages from the project entries endpoint', async () => {
    fetchFn.mockResolvedValue(
      new Response(JSON.stringify({ message: 'Project not found' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 404,
      }),
    );

    await expect(
      client.listProjectEntries('access-token', projectId, { limit: 100, page: 1 }),
    ).rejects.toThrow('Project not found');
  });
});
