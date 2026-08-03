import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const listOrganizationProjects = vi.fn();
const listBoardRepositories = vi.fn();
const listImportedGitHubRepositories = vi.fn();
const listImportedGitHubProjects = vi.fn();
const importGitHubProjects = vi.fn();
const getGitHubConnectionStatus = vi.fn();
const listWorkspaceGitHubOrganizations = vi.fn();

vi.mock('@/services/admin-github-browsing-client', () => ({
	adminGithubBrowsingClient: {
		listBoardRepositories: (...args: unknown[]) =>
			listBoardRepositories(...args),
		listOrganizationProjects: (...args: unknown[]) =>
			listOrganizationProjects(...args),
	},
}));

vi.mock('@/services/admin-projects-client', () => ({
	adminProjectsClient: {
		importGitHubProjects: (...args: unknown[]) =>
			importGitHubProjects(...args),
		listImportedGitHubProjects: () => listImportedGitHubProjects(),
		listImportedGitHubRepositories: () => listImportedGitHubRepositories(),
	},
}));

vi.mock('@/services/admin-settings-client', () => ({
	getAdminSettingsClient: () => ({
		getGitHubConnectionStatus: () => getGitHubConnectionStatus(),
		listWorkspaceGitHubOrganizations: () =>
			listWorkspaceGitHubOrganizations(),
	}),
}));

import GitHubProjectImportPanel from './GitHubProjectImportPanel.vue';

const board = {
	id: 'PVT_GiTimpo',
	number: 7,
	title: 'GiTimpo',
	owner: 'ITSUA-team',
	state: 'open' as const,
	description: null,
	url: 'https://github.com/orgs/ITSUA-team/projects/7',
	updatedAt: '2026-08-03T10:00:00.000Z',
};

function mountPanel() {
	return mount(GitHubProjectImportPanel, {
		global: {
			stubs: {
				Message: { template: '<div><slot /></div>' },
				ProgressSpinner: { template: '<div />' },
			},
		},
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	getGitHubConnectionStatus.mockResolvedValue({ status: 'connected' });
	listWorkspaceGitHubOrganizations.mockResolvedValue({
		items: [{ organizationLogin: 'ITSUA-team' }],
	});
	listOrganizationProjects.mockResolvedValue([board]);
	listImportedGitHubRepositories.mockResolvedValue({
		items: [
			{
				githubRepo: 'ITSUA-team/GiTiempo',
				projectId: 'p1',
				projectIsActive: true,
			},
		],
	});
	listImportedGitHubProjects.mockResolvedValue({ items: [] });
	importGitHubProjects.mockResolvedValue({
		results: [
			{
				githubProjectId: 'PVT_GiTimpo',
				linkedRepository: 'ITSUA-team/.github',
				message: null,
				projectId: 'p9',
				status: 'imported',
			},
		],
	});
	listBoardRepositories.mockResolvedValue({
		PVT_GiTimpo: {
			errorMessage: null,
			hasMore: false,
			repositories: ['ITSUA-team/GiTiempo', 'ITSUA-team/.github'],
			skipped: {
				draftIssues: 0,
				pullRequests: 0,
				redacted: 0,
				unknown: 0,
			},
			totalItems: 2,
		},
	});
});

describe('GitHubProjectImportPanel', () => {
	it('marks a board whose repository already has a project as added', async () => {
		const wrapper = mountPanel();
		await flushPromises();

		const board = wrapper.find('[data-testid="github-import-board"]');

		expect(board.attributes('data-imported')).toBe('true');
		expect(board.attributes('disabled')).toBeDefined();
		expect(wrapper.text()).toContain('Already added');
	});

	it('offers a board whose repositories are not imported', async () => {
		listImportedGitHubRepositories.mockResolvedValue({ items: [] });
		const wrapper = mountPanel();
		await flushPromises();

		const board = wrapper.find('[data-testid="github-import-board"]');

		expect(board.attributes('data-imported')).toBe('false');
		expect(board.attributes('disabled')).toBeUndefined();
		expect(wrapper.text()).toContain('1 of 1 available');
	});

	it('imports the board on a single click', async () => {
		listImportedGitHubRepositories.mockResolvedValue({ items: [] });
		const wrapper = mountPanel();
		await flushPromises();

		await wrapper.find('[data-testid="github-import-board"]').trigger('click');
		await flushPromises();

		expect(importGitHubProjects).toHaveBeenCalledWith({
			githubProjects: [
				{
					githubProjectId: 'PVT_GiTimpo',
					githubRepos: ['ITSUA-team/GiTiempo', 'ITSUA-team/.github'],
					number: 7,
					owner: 'ITSUA-team',
					title: 'GiTimpo',
					url: 'https://github.com/orgs/ITSUA-team/projects/7',
				},
			],
		});
		expect(wrapper.emitted('imported')).toBeTruthy();
	});

	it('does not import a board that is already added', async () => {
		const wrapper = mountPanel();
		await flushPromises();

		await wrapper.find('[data-testid="github-import-board"]').trigger('click');
		await flushPromises();

		expect(importGitHubProjects).not.toHaveBeenCalled();
	});

	it('marks a board already imported as a GitHub project', async () => {
		listImportedGitHubRepositories.mockResolvedValue({ items: [] });
		listImportedGitHubProjects.mockResolvedValue({
			items: [
				{
					githubProjectId: 'PVT_GiTimpo',
					linkedRepository: 'ITSUA-team/GiTiempo',
					projectId: 'p1',
					projectIsActive: true,
				},
			],
		});
		const wrapper = mountPanel();
		await flushPromises();

		expect(
			wrapper
				.find('[data-testid="github-import-board"]')
				.attributes('data-imported'),
		).toBe('true');
	});

	it('surfaces a failed import instead of reporting success', async () => {
		listImportedGitHubRepositories.mockResolvedValue({ items: [] });
		importGitHubProjects.mockResolvedValue({
			results: [
				{
					githubProjectId: 'PVT_GiTimpo',
					linkedRepository: null,
					message: 'This organization is not approved for the workspace.',
					projectId: null,
					status: 'failed',
				},
			],
		});
		const wrapper = mountPanel();
		await flushPromises();

		await wrapper.find('[data-testid="github-import-board"]').trigger('click');
		await flushPromises();

		expect(wrapper.text()).toContain('not approved');
		expect(wrapper.emitted('imported')).toBeFalsy();
	});

	it('announces the repository a single-repository project will be linked to', async () => {
		listImportedGitHubRepositories.mockResolvedValue({ items: [] });
		listBoardRepositories.mockResolvedValue({
			PVT_GiTimpo: {
				errorMessage: null,
				hasMore: false,
				repositories: ['ITSUA-team/GiTiempo'],
				skipped: {
					draftIssues: 0,
					pullRequests: 0,
					redacted: 0,
					unknown: 0,
				},
				totalItems: 1,
			},
		});
		const wrapper = mountPanel();
		await flushPromises();

		expect(
			wrapper.find('[data-testid="github-import-linked-repository"]').text(),
		).toContain('ITSUA-team/GiTiempo');
	});

	it('says no repository is linked when a project spans several', async () => {
		listImportedGitHubRepositories.mockResolvedValue({ items: [] });
		const wrapper = mountPanel();
		await flushPromises();

		expect(
			wrapper.find('[data-testid="github-import-linked-repository"]').exists(),
		).toBe(false);
		expect(wrapper.text()).toContain('Spans 2 repositories');
	});
});
