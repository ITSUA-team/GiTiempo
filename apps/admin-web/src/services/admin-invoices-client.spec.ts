import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthenticatedApiClient } from '@gitiempo/web-shared/http';

import { createAdminInvoicesClient } from './admin-invoices-client';

function createTestApiClient(fetchFn: typeof fetch) {
  return createAuthenticatedApiClient({
    apiBaseUrl: 'https://api.example.test',
    fetchFn,
    getToken: () => 'access-token',
    onRefreshFailed: vi.fn(),
    refreshAccessToken: async () => 'access-token',
  });
}

const validUuid = '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001';

const validInvoiceResponse = {
  id: validUuid,
  workspaceId: validUuid,
  projectId: validUuid,
  title: 'March Invoice',
  status: 'draft',
  dateFrom: '2027-03-01',
  dateTo: '2027-03-31',
  hourlyRate: 75,
  currency: 'USD',
  discountPercent: 10,
  totalHours: 40,
  totalAmount: 2700,
  notes: 'Net 30',
  createdBy: validUuid,
  createdAt: '2027-04-01T10:00:00.000Z',
  updatedAt: '2027-04-01T10:00:00.000Z',
  project: { id: validUuid, name: 'Demo Client' },
  createdByUser: {
    id: validUuid,
    email: 'admin@example.com',
    displayName: 'Admin',
    avatarUrl: null,
  },
  timeEntryCount: 5,
};

const validListResponse = {
  items: [validInvoiceResponse],
  meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

describe('createAdminInvoicesClient', () => {
  const fetchFn = vi.fn<typeof fetch>();
  const client = createAdminInvoicesClient({
    apiClient: createTestApiClient(fetchFn),
  });

  beforeEach(() => {
    fetchFn.mockReset();
  });

  it('lists invoices with auth headers and parses the response', async () => {
    fetchFn.mockResolvedValue(
      new Response(JSON.stringify(validListResponse), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    );

    const result = await client.listInvoices();

    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.example.test/invoices',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
        method: 'GET',
      }),
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.title).toBe('March Invoice');
  });

  it('builds query string for page, limit, projectId, and status filters', async () => {
    fetchFn.mockResolvedValue(
      new Response(JSON.stringify(validListResponse), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    );

    await client.listInvoices({
      page: 2,
      limit: 50,
      projectId: validUuid,
      status: 'draft',
    });

    const url = (fetchFn.mock.calls[0]?.[0] as string) ?? '';
    expect(url).toContain('page=2');
    expect(url).toContain('limit=50');
    expect(url).toContain('projectId=');
    expect(url).toContain('status=draft');
  });

  it('omits default page and limit from the query string', async () => {
    fetchFn.mockResolvedValue(
      new Response(JSON.stringify(validListResponse), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    );

    await client.listInvoices();

    const url = (fetchFn.mock.calls[0]?.[0] as string) ?? '';
    expect(url).toBe('https://api.example.test/invoices');
  });

  it('creates an invoice with the expected payload and parses the response', async () => {
    fetchFn.mockResolvedValue(
      new Response(JSON.stringify(validInvoiceResponse), {
        headers: { 'Content-Type': 'application/json' },
        status: 201,
      }),
    );

    const result = await client.createInvoice({
      title: 'March Invoice',
      dateFrom: '2027-03-01',
      dateTo: '2027-03-31',
    });

    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.example.test/invoices',
      expect.objectContaining({
        body: JSON.stringify({
          title: 'March Invoice',
          dateFrom: '2027-03-01',
          dateTo: '2027-03-31',
        }),
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
          'Content-Type': 'application/json',
        }),
        method: 'POST',
      }),
    );
    expect(result.title).toBe('March Invoice');
  });

  it('gets a single invoice by id', async () => {
    fetchFn.mockResolvedValue(
      new Response(JSON.stringify(validInvoiceResponse), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    );

    const result = await client.getInvoice(validUuid);

    expect(fetchFn).toHaveBeenCalledWith(
      `https://api.example.test/invoices/${validUuid}`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
        method: 'GET',
      }),
    );
    expect(result.id).toBe(validUuid);
  });

  it('updates an invoice with the expected payload', async () => {
    fetchFn.mockResolvedValue(
      new Response(
        JSON.stringify({ ...validInvoiceResponse, status: 'sent' }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        },
      ),
    );

    const result = await client.updateInvoice(validUuid, { status: 'sent' });

    expect(fetchFn).toHaveBeenCalledWith(
      `https://api.example.test/invoices/${validUuid}`,
      expect.objectContaining({
        body: JSON.stringify({ status: 'sent' }),
        method: 'PATCH',
      }),
    );
    expect(result.status).toBe('sent');
  });

  it('deletes an invoice with no content response', async () => {
    fetchFn.mockResolvedValue(
      new Response(null, { status: 204 }),
    );

    await client.deleteInvoice(validUuid);

    expect(fetchFn).toHaveBeenCalledWith(
      `https://api.example.test/invoices/${validUuid}`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
        method: 'DELETE',
      }),
    );
    const [, requestOptions] = fetchFn.mock.calls[0] ?? [];
    expect(requestOptions?.body).toBeUndefined();
  });

  it('surfaces backend 422 no-eligible-entries errors', async () => {
    fetchFn.mockResolvedValue(
      new Response(
        JSON.stringify({
          message: 'No eligible billable time entries found for the given criteria',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 422,
        },
      ),
    );

    await expect(
      client.createInvoice({
        title: 'Empty Invoice',
        dateFrom: '2027-03-01',
        dateTo: '2027-03-31',
      }),
    ).rejects.toThrow('No eligible billable time entries found for the given criteria');
  });

  it('surfaces backend 409 invalid status transition errors', async () => {
    fetchFn.mockResolvedValue(
      new Response(
        JSON.stringify({
          message: "Cannot transition invoice from 'paid' to 'sent'",
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 409,
        },
      ),
    );

    await expect(
      client.updateInvoice(validUuid, { status: 'sent' }),
    ).rejects.toThrow("Cannot transition invoice from 'paid' to 'sent'");
  });
});