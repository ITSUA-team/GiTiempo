import {
	githubProjectIssueListResponseSchema,
	githubProjectListResponseSchema,
	type GitHubProject,
} from '@gitiempo/shared';

import { getAuthenticatedAppApiClient } from './api-client';

const PROJECT_PAGE_SIZE = 50;
const ISSUE_PROBE_PAGE_SIZE = 100;
const MAX_ISSUE_PROBE_PAGES = 10;
const MAX_BOARDS = 12;

export interface BoardRepositorySummary {
	errorMessage: string | null;
	hasMore: boolean;
	repositories: string[];
	skipped: {
		draftIssues: number;
		pullRequests: number;
		redacted: number;
		unknown: number;
	};
	totalItems: number;
}

const NO_SKIPPED = {
	draftIssues: 0,
	pullRequests: 0,
	redacted: 0,
	unknown: 0,
};

export interface AdminGithubBrowsingClient {
	listBoardRepositories(
		boardIds: string[],
	): Promise<Record<string, BoardRepositorySummary>>;
	listOrganizationProjects(owners: string[]): Promise<GitHubProject[]>;
}

export const adminGithubBrowsingClient: AdminGithubBrowsingClient = {
	async listOrganizationProjects(owners) {
		const apiClient = getAuthenticatedAppApiClient();
		const projects: GitHubProject[] = [];

		for (const owner of owners) {
			const search = new URLSearchParams({
				ownerType: 'organization',
				owner,
				limit: String(PROJECT_PAGE_SIZE),
			});
			const response = await apiClient.requestJson({
				path: `/github/projects?${search.toString()}`,
				responseSchema: githubProjectListResponseSchema,
			});

			for (const project of response.items) {
				if (project.state === 'open') {
					projects.push(project);
				}
			}
		}

		return projects;
	},
	async listBoardRepositories(boardIds) {
		const apiClient = getAuthenticatedAppApiClient();
		const entries = await Promise.all(
			boardIds.slice(0, MAX_BOARDS).map(async (boardId) => {
				const repositories: string[] = [];
				const skipped = { ...NO_SKIPPED };
				let totalItems = 0;
				let pageToken: string | undefined = undefined;
				let pagesLoaded = 0;
				let hasMore = false;

				try {
					do {
						const search = new URLSearchParams({
							limit: String(ISSUE_PROBE_PAGE_SIZE),
							state: 'all',
						});

						if (pageToken !== undefined) {
							search.set('pageToken', pageToken);
						}

						const response = await apiClient.requestJson({
							path: `/github/projects/${encodeURIComponent(boardId)}/issues?${search.toString()}`,
							responseSchema: githubProjectIssueListResponseSchema,
						});

						totalItems += response.items.length;
						skipped.draftIssues += response.skipped.draftIssues;
						skipped.pullRequests += response.skipped.pullRequests;
						skipped.redacted += response.skipped.redacted;
						skipped.unknown += response.skipped.unknown;

						for (const item of response.items) {
							const fullName = item.issue.repository.fullName;

							if (!repositories.includes(fullName)) {
								repositories.push(fullName);
							}
						}

						pagesLoaded += 1;
						const nextPageToken = response.pagination.nextPageToken;

						if (nextPageToken === null) {
							pageToken = undefined;
						} else if (pagesLoaded >= MAX_ISSUE_PROBE_PAGES) {
							hasMore = true;
							pageToken = undefined;
						} else {
							pageToken = nextPageToken;
						}
					} while (pageToken !== undefined);
				} catch (error) {
					return [
						boardId,
						{
							errorMessage:
								error instanceof Error
									? error.message
									: 'Could not read this project.',
							hasMore: false,
							repositories,
							skipped,
							totalItems,
						},
					] as const;
				}

				return [
					boardId,
					{ errorMessage: null, hasMore, repositories, skipped, totalItems },
				] as const;
			}),
		);

		return Object.fromEntries(entries);
	},
};
