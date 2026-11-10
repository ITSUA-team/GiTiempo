import { beforeEach, describe, expect, it, vi } from 'vitest';

import { adminGithubBrowsingClient } from './admin-github-browsing-client';

const { requestJson } = vi.hoisted(() => ({ requestJson: vi.fn() }));
vi.mock('./api-client', () => ({
	getAuthenticatedAppApiClient: () => ({ requestJson }),
}));

function deferredPage() {
	let resolve!: (value: unknown) => void;
	const promise = new Promise((complete) => { resolve = complete; });
	return { promise, resolve };
}

beforeEach(() => { vi.resetAllMocks(); });

describe('retired GitHub browsing requests', () => {
	it.each([null, 'source-cursor'])('stops before the next organization or page after retirement (%s)', async (nextPageToken) => {
		const page = deferredPage();
		requestJson.mockReturnValueOnce(page.promise);
		const controller = new AbortController();
		const result = adminGithubBrowsingClient.listOrganizationProjects(['source', 'other-source'], controller.signal);
		const rejected = expect(result).rejects.toMatchObject({ name: 'AbortError' });
		controller.abort();
		page.resolve({ items: [], pagination: { nextPageToken } });
		await rejected;
		expect(requestJson).toHaveBeenCalledTimes(1);
		expect(requestJson).toHaveBeenCalledWith(expect.objectContaining({ signal: controller.signal }));
	});

	it('stops a board scan before fetching its next page after retirement', async () => {
		const page = deferredPage();
		requestJson.mockReturnValueOnce(page.promise);
		const controller = new AbortController();
		const result = adminGithubBrowsingClient.listBoardRepositories(['source-board'], controller.signal);
		const rejected = expect(result).rejects.toMatchObject({ name: 'AbortError' });
		controller.abort();
		page.resolve({ items: [], pagination: { nextPageToken: 'source-cursor' }, skipped: { draftIssues: 0, pullRequests: 0, redacted: 0, unknown: 0 } });
		await rejected;
		expect(requestJson).toHaveBeenCalledTimes(1);
		expect(requestJson).toHaveBeenCalledWith(expect.objectContaining({ signal: controller.signal }));
	});

	it('never dispatches a request for an already retired visit', async () => {
		const controller = new AbortController();
		controller.abort();
		await expect(adminGithubBrowsingClient.listOrganizationProjects(['source'], controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
		await expect(adminGithubBrowsingClient.listBoardRepositories(['source-board'], controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
		expect(requestJson).not.toHaveBeenCalled();
	});
});
