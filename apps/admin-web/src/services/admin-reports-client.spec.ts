import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthenticatedApiClient } from '@gitiempo/web-shared/http';

import { createAdminReportsClient } from './admin-reports-client';

const projectId = '11111111-1111-4111-8111-111111111111';
const userId = '33333333-3333-4333-8333-333333333333';

const reportResponse = {
  dateRange: {
    dateFrom: '2026-05-01T00:00:00.000Z',
    dateTo: '2026-06-01T00:00:00.000Z',
  },
  groupBy: ['project'],
  items: [
    {
      billableSeconds: 3600,
      billableShare: 0.5,
      entryCount: 2,
      firstStartedAt: '2026-05-01T10:00:00.000Z',
      groupBy: ['project'],
      lastStartedAt: '2026-05-02T10:00:00.000Z',
      nonBillableSeconds: 3600,
      project: { id: projectId, name: 'Project Orion' },
      task: null,
      totalSeconds: 7200,
      user: null,
    },
  ],
  meta: { limit: 20, page: 2, total: 21, totalPages: 2 },
  summary: {
    billableSeconds: 3600,
    billableShare: 0.5,
    entryCount: 2,
    nonBillableSeconds: 3600,
    totalSeconds: 7200,
  },
} as const;

function createTestApiClient(fetchFn: typeof fetch) {
  return createAuthenticatedApiClient({
    apiBaseUrl: 'https://api.example.test',
    fetchFn,
    getToken: () => 'access-token',
    onRefreshFailed: vi.fn(),
    refreshAccessToken: async () => 'access-token',
  });
}

describe('createAdminReportsClient', () => {
  const fetchFn = vi.fn<typeof fetch>();
  const client = createAdminReportsClient({
    apiClient: createTestApiClient(fetchFn),
  });

  beforeEach(() => {
    fetchFn.mockReset();
  });

  it('gets time reports with auth headers and serialized shared filters', async () => {
    fetchFn.mockResolvedValue(
      new Response(JSON.stringify(reportResponse), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    );

    const result = await client.getTimeReport({
      dateFrom: '2026-05-01T00:00:00.000Z',
      dateTo: '2026-06-01T00:00:00.000Z',
      groupBy: ['project'],
      limit: 20,
      page: 2,
      projectId,
      search: 'orion',
      sortBy: 'project',
      sortOrder: 'asc',
      userId,
    });

    const [url, init] = fetchFn.mock.calls[0] ?? [];
    const requestUrl = new URL(String(url));

    expect(requestUrl.origin).toBe('https://api.example.test');
    expect(requestUrl.pathname).toBe('/reports/time');
    expect(requestUrl.searchParams.get('page')).toBe('2');
    expect(requestUrl.searchParams.get('limit')).toBe('20');
    expect(requestUrl.searchParams.get('dateFrom')).toBe(
      '2026-05-01T00:00:00.000Z',
    );
    expect(requestUrl.searchParams.get('dateTo')).toBe(
      '2026-06-01T00:00:00.000Z',
    );
    expect(requestUrl.searchParams.get('groupBy')).toBe('project');
    expect(requestUrl.searchParams.get('projectId')).toBe(projectId);
    expect(requestUrl.searchParams.get('userId')).toBe(userId);
    expect(requestUrl.searchParams.get('search')).toBe('orion');
    expect(requestUrl.searchParams.get('sortBy')).toBe('project');
    expect(requestUrl.searchParams.get('sortOrder')).toBe('asc');
    expect(init).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
        method: 'GET',
      }),
    );
    expect(result.summary.totalSeconds).toBe(7200);
    expect(result.items[0]?.project?.name).toBe('Project Orion');
  });

  it('exports time reports as CSV using backend filename metadata', async () => {
    fetchFn.mockResolvedValue(
      new Response('Group By,Project\nproject,Project Orion\n', {
        headers: {
          'Content-Disposition': 'attachment; filename="time-report-2026-05.csv"',
          'Content-Type': 'text/csv; charset=utf-8',
        },
        status: 200,
      }),
    );

    const result = await client.exportTimeReport({
      dateFrom: '2026-05-01T00:00:00.000Z',
      dateTo: '2026-06-01T00:00:00.000Z',
      groupBy: ['user'],
      projectId,
      sortBy: 'user',
      sortOrder: 'asc',
      userId,
    });

    const [url, init] = fetchFn.mock.calls[0] ?? [];
    const requestUrl = new URL(String(url));

    expect(requestUrl.pathname).toBe('/reports/time/export');
    expect(requestUrl.searchParams.get('groupBy')).toBe('user');
    expect(requestUrl.searchParams.get('projectId')).toBe(projectId);
    expect(requestUrl.searchParams.get('userId')).toBe(userId);
    expect(requestUrl.searchParams.get('sortBy')).toBe('user');
    expect(requestUrl.searchParams.get('sortOrder')).toBe('asc');
    expect(init).toEqual(
      expect.objectContaining({
        headers: { Authorization: 'Bearer access-token' },
        method: 'GET',
      }),
    );
    expect(result.filename).toBe('time-report-2026-05.csv');
    expect(result.blob.type).toBe('text/csv;charset=utf-8');
    expect(result.blob.size).toBeGreaterThan(0);
  });

  it('surfaces API error messages from the report endpoints', async () => {
    fetchFn
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Reports are forbidden' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 403,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Reports are forbidden' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 403,
        }),
      );

    await expect(
      client.getTimeReport({ limit: 20, page: 1 }),
    ).rejects.toThrow('Reports are forbidden');

    await expect(client.exportTimeReport()).rejects.toThrow(
      'Reports are forbidden',
    );
  });
});
