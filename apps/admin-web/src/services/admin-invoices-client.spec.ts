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

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		headers: { 'Content-Type': 'application/json' },
		status,
	});
}

function getRequestBody(
	fetchFn: ReturnType<typeof vi.fn<typeof fetch>>,
): unknown {
	const [, requestOptions] = fetchFn.mock.calls.at(-1) ?? [];
	const body = requestOptions?.body;

	if (typeof body !== 'string') {
		throw new Error('Expected request body');
	}

	return JSON.parse(body);
}

const workspaceId = '11111111-1111-4111-8111-111111111111';
const projectId = '22222222-2222-4222-8222-222222222222';
const invoiceId = '33333333-3333-4333-8333-333333333333';
const userId = '44444444-4444-4444-8444-444444444444';
const taskId = '55555555-5555-4555-8555-555555555555';
const entryId = '66666666-6666-4666-8666-666666666666';

const timeEntrySummary = {
	description: null,
	durationSeconds: 7200,
	endedAt: '2026-04-21T11:00:00.000Z',
	id: entryId,
	isBillable: true,
	startedAt: '2026-04-21T09:00:00.000Z',
	taskId,
	taskName: 'Implementation',
	userId,
	userName: 'Alex Admin',
};

const invoiceListItem = {
	createdAt: '2026-04-30T18:00:00.000Z',
	createdBy: userId,
	createdByName: 'Alex Admin',
	currency: 'USD',
	dateFrom: '2026-04-01',
	dateTo: '2026-04-30',
	discountPercent: 0,
	hourlyRate: 75,
	id: invoiceId,
	notes: null,
	project: { id: projectId, name: 'Project Orion' },
	projectId,
	status: 'draft',
	timeEntryCount: 1,
	title: 'Invoice 2026-04',
	totalAmount: 937.5,
	totalHours: 12.5,
	updatedAt: '2026-04-30T18:00:00.000Z',
	workspaceId,
};

const invoiceResponse = {
	...invoiceListItem,
	timeEntries: [timeEntrySummary],
};

const invoiceListResponse = {
	items: [invoiceListItem],
	meta: { limit: 20, page: 1, total: 23, totalPages: 2 },
};

const eligibleEntriesResponse = {
	count: 1,
	defaultCurrency: 'USD',
	defaultHourlyRate: 120,
	entries: [timeEntrySummary],
	totalHours: 12.5,
};

const invoiceStatsResponse = {
	byStatus: { draft: 2, paid: 1, sent: 3 },
	thisMonth: {
		currency: 'USD',
		invoiceCount: 6,
		projectCount: 4,
		totalAmount: 2400,
	},
};

describe('createAdminInvoicesClient', () => {
	const fetchFn = vi.fn<typeof fetch>();
	const client = createAdminInvoicesClient({
		apiClient: createTestApiClient(fetchFn),
	});

	beforeEach(() => {
		fetchFn.mockReset();
	});

	it('lists invoices with pagination defaults and parsed items', async () => {
		fetchFn.mockResolvedValue(jsonResponse(invoiceListResponse));

		const result = await client.listInvoices();

		expect(fetchFn).toHaveBeenCalledWith(
			'https://api.example.test/invoices?page=1&limit=20',
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: 'Bearer access-token',
				}),
				method: 'GET',
			}),
		);
		expect(result.meta).toEqual({ limit: 20, page: 1, total: 23, totalPages: 2 });
		expect(result.items[0]?.title).toBe('Invoice 2026-04');
	});

	it('serializes invoice list filters into a validated query string', async () => {
		fetchFn.mockResolvedValue(jsonResponse(invoiceListResponse));

		await client.listInvoices({
			dateFrom: '2026-04-01',
			dateTo: '2026-04-30',
			projectId,
			search: 'orion',
			status: 'draft',
		});

		expect(fetchFn).toHaveBeenCalledWith(
			'https://api.example.test/invoices?page=1&limit=20&dateFrom=2026-04-01&dateTo=2026-04-30&projectId=22222222-2222-4222-8222-222222222222&status=draft&search=orion',
			expect.objectContaining({
				method: 'GET',
			}),
		);
	});

	it('serializes eligible entry previews with project scope and date bounds', async () => {
		fetchFn
			.mockResolvedValueOnce(jsonResponse(eligibleEntriesResponse))
			.mockResolvedValueOnce(jsonResponse(eligibleEntriesResponse));

		const result = await client.listEligibleEntries({
			dateFrom: '2026-04-01',
			dateTo: '2026-04-30',
			projectId,
		});

		await client.listEligibleEntries({
			dateFrom: '2026-04-01',
			dateTo: '2026-04-30',
		});

		expect(fetchFn).toHaveBeenNthCalledWith(
			1,
			'https://api.example.test/invoices/eligible-entries?projectId=22222222-2222-4222-8222-222222222222&dateFrom=2026-04-01&dateTo=2026-04-30',
			expect.objectContaining({
				method: 'GET',
			}),
		);
		expect(fetchFn).toHaveBeenNthCalledWith(
			2,
			'https://api.example.test/invoices/eligible-entries?dateFrom=2026-04-01&dateTo=2026-04-30',
			expect.objectContaining({
				method: 'GET',
			}),
		);
		expect(result.count).toBe(1);
		expect(result.totalHours).toBe(12.5);
		expect(result.entries[0]?.durationSeconds).toBe(7200);
		expect(result.defaultHourlyRate).toBe(120);
		expect(result.defaultCurrency).toBe('USD');
	});

	it('creates invoices with the validated payload and uppercase currency', async () => {
		fetchFn.mockResolvedValue(
			jsonResponse({ ...invoiceResponse, status: 'draft' }),
		);

		const result = await client.createInvoice({
			currency: 'eur',
			dateFrom: '2026-04-01',
			dateTo: '2026-04-30',
			discountPercent: 10,
			hourlyRate: 85.5,
			notes: 'April billing',
			projectId,
			title: 'Invoice 2026-04',
		});

		expect(fetchFn).toHaveBeenCalledWith(
			'https://api.example.test/invoices',
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: 'Bearer access-token',
					'Content-Type': 'application/json',
				}),
				method: 'POST',
			}),
		);
		expect(getRequestBody(fetchFn)).toEqual({
			currency: 'EUR',
			dateFrom: '2026-04-01',
			dateTo: '2026-04-30',
			discountPercent: 10,
			hourlyRate: 85.5,
			notes: 'April billing',
			projectId,
			title: 'Invoice 2026-04',
		});
		expect(result.title).toBe('Invoice 2026-04');
		expect(result.timeEntries[0]?.durationSeconds).toBe(7200);
	});

	it('updates invoices with only the provided editable fields', async () => {
		fetchFn.mockResolvedValue(
			jsonResponse({ ...invoiceResponse, status: 'sent', notes: null }),
		);

		const result = await client.updateInvoice(invoiceId, {
			notes: null,
			status: 'sent',
		});

		expect(fetchFn).toHaveBeenCalledWith(
			`https://api.example.test/invoices/${invoiceId}`,
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: 'Bearer access-token',
					'Content-Type': 'application/json',
				}),
				method: 'PATCH',
			}),
		);
		expect(getRequestBody(fetchFn)).toEqual({
			notes: null,
			status: 'sent',
		});
		expect(result.status).toBe('sent');
	});

	it('loads invoice details with auth headers and parses time entries', async () => {
		fetchFn.mockResolvedValue(jsonResponse(invoiceResponse));

		const result = await client.getInvoice(invoiceId);

		expect(fetchFn).toHaveBeenCalledWith(
			`https://api.example.test/invoices/${invoiceId}`,
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: 'Bearer access-token',
				}),
				method: 'GET',
			}),
		);
		expect(result.project?.name).toBe('Project Orion');
		expect(result.timeEntryCount).toBe(1);
		expect(result.timeEntries[0]?.userName).toBe('Alex Admin');
	});

	it('loads invoice stats with auth headers', async () => {
		fetchFn.mockResolvedValue(jsonResponse(invoiceStatsResponse));

		const result = await client.getInvoiceStats();

		expect(fetchFn).toHaveBeenCalledWith(
			'https://api.example.test/invoices/stats',
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: 'Bearer access-token',
				}),
				method: 'GET',
			}),
		);
		expect(result.byStatus).toEqual({ draft: 2, paid: 1, sent: 3 });
		expect(result.thisMonth).toEqual({
			currency: 'USD',
			invoiceCount: 6,
			projectCount: 4,
			totalAmount: 2400,
		});
	});

	it('deletes invoices with DELETE and no request body', async () => {
		fetchFn.mockResolvedValue(new Response(null, { status: 204 }));

		await client.deleteInvoice(invoiceId);

		expect(fetchFn).toHaveBeenCalledWith(
			`https://api.example.test/invoices/${invoiceId}`,
			expect.objectContaining({
				headers: {
					Authorization: 'Bearer access-token',
				},
				method: 'DELETE',
			}),
		);
		const [, requestOptions] = fetchFn.mock.calls[0] ?? [];
		expect(requestOptions?.body).toBeUndefined();
	});

	it('rejects empty invoice updates before sending requests', async () => {
		expect(() => {
			void client.updateInvoice(invoiceId, {});
		}).toThrow('At least one field must be provided');
		expect(fetchFn).not.toHaveBeenCalled();
	});

	it('surfaces API errors from invoice reads', async () => {
		fetchFn.mockResolvedValue(
			jsonResponse({ message: 'Admin or PM role required' }, 403),
		);

		await expect(client.listInvoices()).rejects.toThrow(
			'Admin or PM role required',
		);
	});

	it('surfaces API errors from invoice deletes', async () => {
		fetchFn.mockResolvedValue(
			jsonResponse({ message: 'Invoice not found' }, 404),
		);

		await expect(client.deleteInvoice(invoiceId)).rejects.toThrow(
			'Invoice not found',
		);

		expect(fetchFn).toHaveBeenCalledWith(
			`https://api.example.test/invoices/${invoiceId}`,
			expect.objectContaining({
				method: 'DELETE',
			}),
		);
	});
});