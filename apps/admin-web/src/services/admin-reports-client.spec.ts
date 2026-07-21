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

  it('gets time reports with auth headers and a validated JSON body', async () => {
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
    // Filters travel as a validated JSON body, never in the URL.
    expect(requestUrl.search).toBe('');
    expect(init).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
        method: 'POST',
      }),
    );
    expect(JSON.parse(String(init?.body))).toEqual({
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
    expect(result.summary.totalSeconds).toBe(7200);
    expect(result.items[0]?.project?.name).toBe('Project Orion');
  });

  it('names a PDF download correctly even without Content-Disposition', async () => {
    // Cross-origin responses can hide the filename header; the name must be
    // rebuilt from the request dates and the actual blob type.
    fetchFn.mockResolvedValueOnce(
      new Response(new Blob(['%PDF-1.3'], { type: 'application/pdf' }), {
        headers: { 'Content-Type': 'application/pdf' },
        status: 200,
      }),
    );

    const pdfResult = await client.exportTimeReport({
      dateFrom: '2026-07-01T00:00:00.000Z',
      dateTo: '2026-08-01T00:00:00.000Z',
      format: 'pdf',
    });

    expect(pdfResult.filename).toBe('time-report-2026-07-01_2026-08-01.pdf');

    fetchFn.mockResolvedValueOnce(
      new Response(new Blob(['Group By\n'], { type: 'text/csv' }), {
        headers: { 'Content-Type': 'text/csv; charset=utf-8' },
        status: 200,
      }),
    );

    const csvResult = await client.exportTimeReport({});

    expect(csvResult.filename).toBe('time-report.csv');
  });

  it('exports time reports as CSV using backend filename metadata', async () => {
    fetchFn.mockResolvedValue(
      new Response('Group By,Project\nproject,Project Orion\n', {
        headers: {
          'Content-Disposition':
            'attachment; filename="time-report-2026-05.csv"',
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

    // Filters travel as a validated JSON body, never in the URL.
    expect(requestUrl.pathname).toBe('/reports/time/export');
    expect(requestUrl.search).toBe('');
    expect(init).toEqual(expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(String(init?.body))).toEqual({
      dateFrom: '2026-05-01T00:00:00.000Z',
      dateTo: '2026-06-01T00:00:00.000Z',
      // format defaults to csv so existing consumers keep the detailed CSV
      format: 'csv',
      groupBy: ['user'],
      projectId,
      sortBy: 'user',
      sortOrder: 'asc',
      userId,
    });
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

    await expect(client.getTimeReport({ limit: 20, page: 1 })).rejects.toThrow(
      'Reports are forbidden',
    );

    await expect(client.exportTimeReport()).rejects.toThrow(
      'Reports are forbidden',
    );
  });
});
