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

const AutoCompleteStub = {
	name: 'AutoCompleteStub',
	emits: ['complete', 'update:modelValue'],
	props: [
		'disabled',
		'forceSelection',
		'inputId',
		'modelValue',
		'optionLabel',
		'placeholder',
		'pt',
		'suggestions',
	],
	template: `
		<div>
			<input
				:id="inputId"
				:data-testid="inputId"
				:disabled="disabled"
				:placeholder="placeholder"
				:value="typeof modelValue === 'string' ? modelValue : (modelValue?.[optionLabel] ?? '')"
				@focus="$emit('complete', { query: '' })"
			/>
			<button
				v-for="option in suggestions"
				:key="option.board.id"
				:data-testid="'suggestion-' + option.board.id"
				:data-imported="option.importedProjectId !== null ? 'true' : 'false'"
				type="button"
				@click="$emit('update:modelValue', option)"
			>
				{{ option[optionLabel] }} — {{ option.reason }}
			</button>
			<slot name="footer" />
		</div>
	`,
};

const SelectStub = {
	emits: ['update:modelValue'],
	props: ['disabled', 'inputId', 'modelValue', 'options'],
	template: `
		<select
			:id="inputId"
			:data-testid="inputId"
			:disabled="disabled"
			:value="modelValue"
			@change="$emit('update:modelValue', $event.target.value)"
		>
			<option
				v-for="option in options"
				:key="option.value"
				:value="option.value"
			>
				{{ option.label }}
			</option>
		</select>
	`,
};

const ButtonStub = {
	props: ['disabled', 'label', 'loading'],
	template: `
		<button
			type="button"
			:disabled="disabled"
			@click="$emit('click')"
		>
			{{ label }}
		</button>
	`,
};

const gitimpo = {
	id: 'PVT_GiTimpo',
	number: 7,
	title: 'GiTimpo',
	owner: 'ITSUA-team',
	state: 'open' as const,
	description: null,
	url: 'https://github.com/orgs/ITSUA-team/projects/7',
	updatedAt: '2026-08-03T10:00:00.000Z',
};

const krvn = {
	...gitimpo,
	id: 'PVT_Krvn',
	number: 9,
	title: 'Krvn',
};

const noSkipped = {
	draftIssues: 0,
	pullRequests: 0,
	redacted: 0,
	unknown: 0,
};

function summary(overrides: Record<string, unknown> = {}) {
	return {
		errorMessage: null,
		hasMore: false,
		repositories: ['ITSUA-team/GiTiempo'],
		skipped: { ...noSkipped },
		totalItems: 24,
		...overrides,
	};
}

function mountPanel() {
	return mount(GitHubProjectImportPanel, {
		global: {
			stubs: {
				AutoComplete: AutoCompleteStub,
				Button: ButtonStub,
				Message: { template: '<div><slot /></div>' },
				ProgressSpinner: { template: '<div />' },
				Select: SelectStub,
			},
		},
	});
}

async function mountAndSelect(boardId: string) {
	const wrapper = mountPanel();
	await flushPromises();

	await wrapper.find('[data-testid="github-import-project"]').trigger('focus');
	await wrapper.find(`[data-testid="suggestion-${boardId}"]`).trigger('click');

	return wrapper;
}

function rowText(wrapper: ReturnType<typeof mountPanel>, testid: string) {
	return wrapper.find(`[data-testid="${testid}"]`).text();
}

async function chooseOrganization(
	wrapper: ReturnType<typeof mountPanel>,
	login: string,
) {
	const select = wrapper.find('[data-testid="github-import-organization"]');
	(select.element as HTMLSelectElement).value = login;
	await select.trigger('change');
}

beforeEach(() => {
	vi.clearAllMocks();
	getGitHubConnectionStatus.mockResolvedValue({ status: 'connected' });
	listWorkspaceGitHubOrganizations.mockResolvedValue({
		items: [{ organizationLogin: 'ITSUA-team' }],
	});
	listOrganizationProjects.mockResolvedValue([gitimpo]);
	listImportedGitHubRepositories.mockResolvedValue({ items: [] });
	listImportedGitHubProjects.mockResolvedValue({ items: [] });
	importGitHubProjects.mockResolvedValue({
		results: [
			{
				githubProjectId: 'PVT_GiTimpo',
				linkedRepository: 'ITSUA-team/GiTiempo',
				message: null,
				projectId: 'p9',
				status: 'imported',
			},
		],
	});
	listBoardRepositories.mockResolvedValue({ PVT_GiTimpo: summary() });
});

describe('GitHubProjectImportPanel', () => {
	it('preselects the only approved organization and offers its projects', async () => {
		const wrapper = mountPanel();
		await flushPromises();

		expect(
			(
				wrapper.find('[data-testid="github-import-organization"]')
					.element as HTMLSelectElement
			).value,
		).toBe('ITSUA-team');
		expect(wrapper.text()).toContain('Open projects of ITSUA-team');
	});

	it('disables the project field until one of several organizations is chosen', async () => {
		listWorkspaceGitHubOrganizations.mockResolvedValue({
			items: [
				{ organizationLogin: 'ITSUA-team' },
				{ organizationLogin: 'other-org' },
			],
		});
		const wrapper = mountPanel();
		await flushPromises();

		const project = wrapper.find('[data-testid="github-import-project"]');

		expect(project.attributes('disabled')).toBeDefined();
		expect(project.attributes('placeholder')).toBe(
			'Select an organization first',
		);
		expect(wrapper.text()).toContain('Pick an organization to list its open');
	});

	it('refuses to import without a connected GitHub account', async () => {
		getGitHubConnectionStatus.mockResolvedValue({ status: 'disconnected' });
		const wrapper = mountPanel();
		await flushPromises();

		expect(wrapper.text()).toContain('Connect a GitHub account in Settings');
		expect(
			wrapper.find('[data-testid="github-import-project"]').exists(),
		).toBe(false);
	});

	it('lists only the projects of the selected organization', async () => {
		listOrganizationProjects.mockResolvedValue([
			gitimpo,
			{ ...krvn, owner: 'other-org' },
		]);
		listWorkspaceGitHubOrganizations.mockResolvedValue({
			items: [
				{ organizationLogin: 'ITSUA-team' },
				{ organizationLogin: 'other-org' },
			],
		});
		listBoardRepositories.mockResolvedValue({
			PVT_GiTimpo: summary(),
			PVT_Krvn: summary(),
		});
		const wrapper = mountPanel();
		await flushPromises();

		await chooseOrganization(wrapper, 'ITSUA-team');
		await wrapper
			.find('[data-testid="github-import-project"]')
			.trigger('focus');

		expect(wrapper.find('[data-testid="suggestion-PVT_GiTimpo"]').exists()).toBe(
			true,
		);
		expect(wrapper.find('[data-testid="suggestion-PVT_Krvn"]').exists()).toBe(
			false,
		);
	});

	it('derives the project name, source and repository from the selection', async () => {
		const wrapper = await mountAndSelect('PVT_GiTimpo');

		expect(rowText(wrapper, 'github-import-derived-name')).toBe(
			'ITSUA-team/GiTimpo',
		);
		expect(rowText(wrapper, 'github-import-source')).toBe('GitHub');
		expect(rowText(wrapper, 'github-import-linked-repository')).toBe(
			'ITSUA-team/GiTiempo',
		);
		expect(rowText(wrapper, 'github-import-issues-scanned')).toBe(
			'24 issues, all from ITSUA-team/GiTiempo',
		);
		expect(rowText(wrapper, 'github-import-status')).toBe('Not added yet');
		expect(wrapper.find('[data-testid="github-import-details"]').text()).toContain(
			'reuses this project instead of creating a second one',
		);
	});

	it('links no repository when the project spans several', async () => {
		listBoardRepositories.mockResolvedValue({
			PVT_GiTimpo: summary({
				repositories: ['ITSUA-team/GiTiempo', 'ITSUA-team/.github'],
				totalItems: 41,
			}),
		});
		const wrapper = await mountAndSelect('PVT_GiTimpo');

		expect(rowText(wrapper, 'github-import-linked-repository')).toBe(
			'None — issues come from 2 repositories',
		);
		expect(wrapper.find('[data-testid="github-import-details"]').text()).toContain(
			'would misrepresent the others',
		);
	});

	it('explains a project whose items are all drafts', async () => {
		listBoardRepositories.mockResolvedValue({
			PVT_GiTimpo: summary({
				repositories: [],
				skipped: { ...noSkipped, draftIssues: 6 },
				totalItems: 0,
			}),
		});
		const wrapper = await mountAndSelect('PVT_GiTimpo');

		expect(rowText(wrapper, 'github-import-issues-scanned')).toBe(
			'None. 6 draft items skipped',
		);
		expect(rowText(wrapper, 'github-import-linked-repository')).toBe(
			'None — no issue to read a repository from',
		);
		expect(wrapper.find('[data-testid="github-import-details"]').text()).toContain(
			'Draft items live only on the board',
		);
	});

	it('reports a probe failure instead of inventing an empty project', async () => {
		listBoardRepositories.mockResolvedValue({
			PVT_GiTimpo: summary({
				errorMessage: 'GitHub token expired',
				repositories: [],
				totalItems: 0,
			}),
		});
		const wrapper = await mountAndSelect('PVT_GiTimpo');

		expect(rowText(wrapper, 'github-import-issues-scanned')).toContain(
			'GitHub token expired',
		);
	});

	it('refuses to add a project that is already imported', async () => {
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
		const wrapper = await mountAndSelect('PVT_GiTimpo');

		expect(rowText(wrapper, 'github-import-status')).toBe('Already added');
		expect(
			wrapper
				.find('[data-testid="github-import-submit"]')
				.attributes('disabled'),
		).toBeDefined();
		expect(wrapper.find('[data-testid="github-import-details"]').text()).toContain(
			'Adding never modifies an existing project',
		);
	});

	it('counts the projects already added in the list footer', async () => {
		listOrganizationProjects.mockResolvedValue([gitimpo, krvn]);
		listBoardRepositories.mockResolvedValue({
			PVT_GiTimpo: summary(),
			PVT_Krvn: summary({ repositories: ['ITSUA-team/Krvn'] }),
		});
		listImportedGitHubProjects.mockResolvedValue({
			items: [
				{
					githubProjectId: 'PVT_Krvn',
					linkedRepository: 'ITSUA-team/Krvn',
					projectId: 'p1',
					projectIsActive: true,
				},
			],
		});
		const wrapper = mountPanel();
		await flushPromises();

		await wrapper
			.find('[data-testid="github-import-project"]')
			.trigger('focus');

		expect(rowText(wrapper, 'github-import-added-count')).toBe(
			'1 of 2 already added',
		);
	});

	it('warns instead of blocking when the repository belongs to another project', async () => {
		listImportedGitHubRepositories.mockResolvedValue({
			items: [
				{
					githubRepo: 'ITSUA-team/GiTiempo',
					projectId: 'p1',
					projectIsActive: true,
				},
			],
		});
		const wrapper = await mountAndSelect('PVT_GiTimpo');

		expect(
			wrapper
				.find('[data-testid="suggestion-PVT_GiTimpo"]')
				.attributes('data-imported'),
		).toBe('false');
		expect(rowText(wrapper, 'github-import-status')).toBe('Not added yet');
		expect(rowText(wrapper, 'github-import-linked-repository')).toBe(
			'ITSUA-team/GiTiempo — already tracked by another project',
		);
		expect(
			wrapper.find('[data-testid="github-import-details"]').text(),
		).toContain('already belongs to another project');
		expect(
			wrapper
				.find('[data-testid="github-import-submit"]')
				.attributes('disabled'),
		).toBeUndefined();
	});

	it('keeps the repository the server linked for an imported project', async () => {
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
		listBoardRepositories.mockResolvedValue({
			PVT_GiTimpo: summary({ repositories: [], totalItems: 0 }),
		});
		const wrapper = await mountAndSelect('PVT_GiTimpo');

		expect(rowText(wrapper, 'github-import-linked-repository')).toBe(
			'ITSUA-team/GiTiempo',
		);
	});

	it('scans a project the initial probe skipped instead of calling it empty', async () => {
		listBoardRepositories.mockResolvedValueOnce({});
		const wrapper = mountPanel();
		await flushPromises();

		await wrapper
			.find('[data-testid="github-import-project"]')
			.trigger('focus');

		expect(
			wrapper.find('[data-testid="suggestion-PVT_GiTimpo"]').text(),
		).toContain('Not scanned yet');

		listBoardRepositories.mockResolvedValueOnce({ PVT_GiTimpo: summary() });
		await wrapper
			.find('[data-testid="suggestion-PVT_GiTimpo"]')
			.trigger('click');
		await flushPromises();

		expect(listBoardRepositories).toHaveBeenLastCalledWith(['PVT_GiTimpo']);
		expect(rowText(wrapper, 'github-import-linked-repository')).toBe(
			'ITSUA-team/GiTiempo',
		);
	});

	it('refuses to conclude a repository from a scan that failed', async () => {
		listBoardRepositories.mockResolvedValue({
			PVT_GiTimpo: summary({
				errorMessage: 'GitHub token expired',
				repositories: ['ITSUA-team/GiTiempo'],
			}),
		});
		const wrapper = await mountAndSelect('PVT_GiTimpo');

		expect(rowText(wrapper, 'github-import-linked-repository')).toBe(
			'Unknown — this project could not be read',
		);
		expect(
			wrapper.find('[data-testid="github-import-details"]').text(),
		).toContain('could not be read');
	});

	it('keeps the typed query instead of blanking the field', async () => {
		const wrapper = await mountAndSelect('PVT_GiTimpo');

		expect(wrapper.find('[data-testid="github-import-details"]').exists()).toBe(
			true,
		);

		await wrapper
			.findComponent({ name: 'AutoCompleteStub' })
			.vm.$emit('update:modelValue', 'GiTi');

		expect(
			(
				wrapper.find('[data-testid="github-import-project"]')
					.element as HTMLInputElement
			).value,
		).toBe('GiTi');
	});

	it('imports the selected project', async () => {
		const wrapper = await mountAndSelect('PVT_GiTimpo');

		await wrapper.find('[data-testid="github-import-submit"]').trigger('click');
		await flushPromises();

		expect(importGitHubProjects).toHaveBeenCalledWith({
			githubProjects: [
				{
					githubProjectId: 'PVT_GiTimpo',
					githubRepos: ['ITSUA-team/GiTiempo'],
					number: 7,
					owner: 'ITSUA-team',
					title: 'GiTimpo',
					url: 'https://github.com/orgs/ITSUA-team/projects/7',
				},
			],
		});
		expect(wrapper.emitted('imported')).toBeTruthy();
	});

	it('surfaces a failed import instead of reporting success', async () => {
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
		const wrapper = await mountAndSelect('PVT_GiTimpo');

		await wrapper.find('[data-testid="github-import-submit"]').trigger('click');
		await flushPromises();

		expect(wrapper.text()).toContain('not approved');
		expect(wrapper.emitted('imported')).toBeFalsy();
	});

	it('clears the selection when the organization changes', async () => {
		listWorkspaceGitHubOrganizations.mockResolvedValue({
			items: [
				{ organizationLogin: 'ITSUA-team' },
				{ organizationLogin: 'other-org' },
			],
		});
		const wrapper = mountPanel();
		await flushPromises();

		await chooseOrganization(wrapper, 'ITSUA-team');
		await wrapper
			.find('[data-testid="github-import-project"]')
			.trigger('focus');
		await wrapper
			.find('[data-testid="suggestion-PVT_GiTimpo"]')
			.trigger('click');

		expect(wrapper.find('[data-testid="github-import-details"]').exists()).toBe(
			true,
		);

		await chooseOrganization(wrapper, 'other-org');

		expect(wrapper.find('[data-testid="github-import-details"]').exists()).toBe(
			false,
		);
	});

	it('emits back without importing anything', async () => {
		const wrapper = mountPanel();
		await flushPromises();

		await wrapper.findAll('button').find((button) => button.text() === 'Back')!
			.trigger('click');

		expect(wrapper.emitted('back')).toBeTruthy();
		expect(importGitHubProjects).not.toHaveBeenCalled();
	});
});
