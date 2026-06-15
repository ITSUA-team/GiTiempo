import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthenticatedApiClient } from '@gitiempo/web-shared/http';

import { createAdminProjectsClient } from './admin-projects-client';

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

function getRequestBody(fetchFn: ReturnType<typeof vi.fn<typeof fetch>>): unknown {
	const [, requestOptions] = fetchFn.mock.calls.at(-1) ?? [];
	const body = requestOptions?.body;

	if (typeof body !== 'string') {
		throw new Error('Expected request body');
	}

	return JSON.parse(body);
}

const projectResponse = {
	color: null,
	createdAt: '2026-05-01T10:00:00.000Z',
	defaultBillableForTasks: false,
	description: null,
	id: '11111111-1111-4111-8111-111111111111',
	isActive: true,
	members: [],
	name: 'Project Orion',
	source: 'manual',
	totalSeconds: 3600,
	updatedAt: '2026-05-01T10:00:00.000Z',
	visibility: 'private',
	workspaceId: '22222222-2222-4222-8222-222222222222',
};

const taskResponse = {
	createdAt: '2026-05-01T10:00:00.000Z',
	defaultBillableForTimeEntries: false,
	githubIssue: null,
	id: '33333333-3333-4333-8333-333333333333',
	isActive: true,
	projectId: projectResponse.id,
	status: 'open',
	title: 'Improve reports filters',
	updatedAt: '2026-05-01T10:00:00.000Z',
	workspaceId: projectResponse.workspaceId,
};

describe('createAdminProjectsClient', () => {
	const fetchFn = vi.fn<typeof fetch>();
	const client = createAdminProjectsClient({
		apiClient: createTestApiClient(fetchFn),
	});

	beforeEach(() => {
		fetchFn.mockReset();
	});

	it('creates projects with the billable default payload', async () => {
		fetchFn.mockResolvedValue(jsonResponse(projectResponse));

		const result = await client.createProject({
			defaultBillableForTasks: false,
			name: 'Project Orion',
			visibility: 'private',
		});

		expect(fetchFn).toHaveBeenCalledWith(
			'https://api.example.test/projects',
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: 'Bearer access-token',
					'Content-Type': 'application/json',
				}),
				method: 'POST',
			}),
		);
		expect(getRequestBody(fetchFn)).toEqual({
			defaultBillableForTasks: false,
			name: 'Project Orion',
			visibility: 'private',
		});
		expect(result.defaultBillableForTasks).toBe(false);
	});

	it('updates projects with the future default only', async () => {
		fetchFn.mockResolvedValue(
			jsonResponse({ ...projectResponse, defaultBillableForTasks: true }),
		);

		await client.updateProject(projectResponse.id, {
			defaultBillableForTasks: true,
			visibility: 'public',
		});

		expect(fetchFn).toHaveBeenCalledWith(
			`https://api.example.test/projects/${projectResponse.id}`,
			expect.objectContaining({
				method: 'PATCH',
			}),
		);
		expect(getRequestBody(fetchFn)).toEqual({
			defaultBillableForTasks: true,
			visibility: 'public',
		});
	});

	it('loads downstream tasks and project time entries for backfill detection', async () => {
		fetchFn
			.mockResolvedValueOnce(jsonResponse([taskResponse]))
			.mockResolvedValueOnce(
				jsonResponse({
					items: [],
					meta: { limit: 1, page: 1, total: 3, totalPages: 3 },
				}),
			);

		await expect(
			client.listProjectTasks(projectResponse.id),
		).resolves.toHaveLength(1);
		await expect(
			client.listProjectTimeEntries(projectResponse.id, { limit: 1 }),
		).resolves.toEqual(
			expect.objectContaining({
				meta: expect.objectContaining({ total: 3 }),
			}),
		);

		expect(fetchFn).toHaveBeenNthCalledWith(
			1,
			`https://api.example.test/projects/${projectResponse.id}/tasks`,
			expect.objectContaining({ method: 'GET' }),
		);
		expect(fetchFn).toHaveBeenNthCalledWith(
			2,
			`https://api.example.test/projects/${projectResponse.id}/time-entries?page=1&limit=1`,
			expect.objectContaining({ method: 'GET' }),
		);
	});

	it('posts explicit billable-default backfills', async () => {
		fetchFn.mockResolvedValue(
			jsonResponse({ tasksUpdated: 2, timeEntriesUpdated: 5 }),
		);

		const result = await client.backfillProjectBillableDefault(projectResponse.id, {
			updateTasks: true,
			updateTimeEntries: true,
		});

		expect(fetchFn).toHaveBeenCalledWith(
			`https://api.example.test/projects/${projectResponse.id}/billable-default/backfill`,
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: 'Bearer access-token',
					'Content-Type': 'application/json',
				}),
				method: 'POST',
			}),
		);
		expect(getRequestBody(fetchFn)).toEqual({
			updateTasks: true,
			updateTimeEntries: true,
		});
		expect(result).toEqual({ tasksUpdated: 2, timeEntriesUpdated: 5 });
	});

	it('rejects empty backfill selections before sending requests', async () => {
		expect(() => {
			void client.backfillProjectBillableDefault(projectResponse.id, {});
		}).toThrow('At least one existing record type must be selected');
		expect(fetchFn).not.toHaveBeenCalled();
	});
});
