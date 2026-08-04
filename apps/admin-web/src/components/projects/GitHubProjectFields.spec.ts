import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const listOrganizationProjects = vi.fn();
const listBoardRepositories = vi.fn();
const listImportedGitHubRepositories = vi.fn();
const listImportedGitHubProjects = vi.fn();
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

import GitHubProjectFields from './GitHubProjectFields.vue';

const AutoCompleteStub = {
	name: 'AutoCompleteStub',
	emits: ['complete', 'update:modelValue'],
	props: [
		'disabled',
		'inputId',
		'modelValue',
		'optionLabel',
		'placeholder',
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
				:key="option.id"
				:data-testid="'suggestion-' + option.id"
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
	props: ['disabled', 'inputId', 'modelValue', 'options', 'placeholder'],
	template: `
		<select
			:id="inputId"
			:data-testid="inputId"
			:disabled="disabled"
			:data-placeholder="placeholder"
			:value="modelValue"
			@change="$emit('update:modelValue', $event.target.value)"
		>
			<option v-for="option in options" :key="option.value" :value="option.value">
				{{ option.label }}
			</option>
		</select>
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

const krvn = { ...gitimpo, id: 'PVT_Krvn', number: 9, title: 'Krvn' };

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

function mountFields() {
	return mount(GitHubProjectFields, {
		props: {
			availability: 'loading' as const,
			disabled: false,
			modelValue: null,
			scanning: false,
		},
		global: {
			stubs: {
				AutoComplete: AutoCompleteStub,
				Message: { template: '<div><slot /></div>' },
				ProgressSpinner: { template: '<div />' },
				Select: SelectStub,
			},
		},
	});
}

function lastAvailability(wrapper: ReturnType<typeof mountFields>) {
	const events = wrapper.emitted('update:availability');

	return events?.[events.length - 1]?.[0];
}

function lastSelection(wrapper: ReturnType<typeof mountFields>) {
	const events = wrapper.emitted('update:modelValue');

	return events?.[events.length - 1]?.[0] as
		| { id: string; linkedRepository: string | null }
		| null
		| undefined;
}

async function chooseOrganization(
	wrapper: ReturnType<typeof mountFields>,
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
	listBoardRepositories.mockResolvedValue({ PVT_GiTimpo: summary() });
});

describe('GitHubProjectFields', () => {
	it('preselects the only approved organization and lists its projects', async () => {
		const wrapper = mountFields();
		await flushPromises();

		expect(lastAvailability(wrapper)).toBe('available');
		expect(
			(
				wrapper.find('[data-testid="github-import-organization"]')
					.element as HTMLSelectElement
			).value,
		).toBe('ITSUA-team');
		expect(wrapper.text()).toContain('Open projects of ITSUA-team');
	});

	it('waits for a choice when several organizations are approved', async () => {
		listWorkspaceGitHubOrganizations.mockResolvedValue({
			items: [
				{ organizationLogin: 'ITSUA-team' },
				{ organizationLogin: 'other-org' },
			],
		});
		const wrapper = mountFields();
		await flushPromises();

		const project = wrapper.find('[data-testid="github-import-project"]');

		expect(project.attributes('disabled')).toBeDefined();
		expect(project.attributes('placeholder')).toBe(
			'Select an organization first',
		);
		expect(
			wrapper
				.find('[data-testid="github-import-organization"]')
				.attributes('data-placeholder'),
		).toBe('Select an organization');
	});

	it('offers only the projects of the selected organization', async () => {
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
		const wrapper = mountFields();
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

	it('emits the chosen project', async () => {
		const wrapper = mountFields();
		await flushPromises();

		await wrapper
			.find('[data-testid="github-import-project"]')
			.trigger('focus');
		await wrapper
			.find('[data-testid="suggestion-PVT_GiTimpo"]')
			.trigger('click');

		expect(lastSelection(wrapper)?.id).toBe('PVT_GiTimpo');
		expect(lastSelection(wrapper)?.linkedRepository).toBe(
			'ITSUA-team/GiTiempo',
		);
	});

	it('shows the reason to pick beside each project', async () => {
		listBoardRepositories.mockResolvedValue({
			PVT_GiTimpo: summary({
				repositories: [],
				skipped: { ...noSkipped, draftIssues: 6 },
				totalItems: 0,
			}),
		});
		const wrapper = mountFields();
		await flushPromises();

		await wrapper
			.find('[data-testid="github-import-project"]')
			.trigger('focus');

		expect(
			wrapper.find('[data-testid="suggestion-PVT_GiTimpo"]').text(),
		).toContain('6 draft items');
	});

	it('marks and counts the projects already imported', async () => {
		listOrganizationProjects.mockResolvedValue([gitimpo, krvn]);
		listBoardRepositories.mockResolvedValue({
			PVT_GiTimpo: summary(),
			PVT_Krvn: summary(),
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
		const wrapper = mountFields();
		await flushPromises();

		await wrapper
			.find('[data-testid="github-import-project"]')
			.trigger('focus');

		expect(
			wrapper
				.find('[data-testid="suggestion-PVT_Krvn"]')
				.attributes('data-imported'),
		).toBe('true');
		expect(
			wrapper
				.find('[data-testid="suggestion-PVT_GiTimpo"]')
				.attributes('data-imported'),
		).toBe('false');
		expect(
			wrapper.find('[data-testid="github-import-added-count"]').text(),
		).toBe('1 of 2 already added');
	});

	it('scans a project the initial probe skipped', async () => {
		listBoardRepositories.mockResolvedValueOnce({});
		const wrapper = mountFields();
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
		expect(lastSelection(wrapper)?.linkedRepository).toBe(
			'ITSUA-team/GiTiempo',
		);
		const scanning = wrapper.emitted('update:scanning');
		expect(scanning?.map((event) => event[0])).toEqual([true, false]);
	});

	it('keeps the typed query instead of blanking the field', async () => {
		const wrapper = mountFields();
		await flushPromises();

		await wrapper
			.find('[data-testid="github-import-project"]')
			.trigger('focus');
		await wrapper
			.find('[data-testid="suggestion-PVT_GiTimpo"]')
			.trigger('click');

		expect(lastSelection(wrapper)?.id).toBe('PVT_GiTimpo');

		await wrapper
			.findComponent({ name: 'AutoCompleteStub' })
			.vm.$emit('update:modelValue', 'GiTi');
		await flushPromises();

		expect(lastSelection(wrapper)).toBeNull();
		expect(
			(
				wrapper.find('[data-testid="github-import-project"]')
					.element as HTMLInputElement
			).value,
		).toBe('GiTi');
	});

	it('clears the selection when the organization changes', async () => {
		listWorkspaceGitHubOrganizations.mockResolvedValue({
			items: [
				{ organizationLogin: 'ITSUA-team' },
				{ organizationLogin: 'other-org' },
			],
		});
		const wrapper = mountFields();
		await flushPromises();

		await chooseOrganization(wrapper, 'ITSUA-team');
		await wrapper
			.find('[data-testid="github-import-project"]')
			.trigger('focus');
		await wrapper
			.find('[data-testid="suggestion-PVT_GiTimpo"]')
			.trigger('click');

		expect(lastSelection(wrapper)?.id).toBe('PVT_GiTimpo');

		await chooseOrganization(wrapper, 'other-org');

		expect(lastSelection(wrapper)).toBeNull();
	});

	it('refuses to offer projects without a connected GitHub account', async () => {
		getGitHubConnectionStatus.mockResolvedValue({ status: 'disconnected' });
		const wrapper = mountFields();
		await flushPromises();

		expect(lastAvailability(wrapper)).toBe('no-connection');
		expect(wrapper.text()).toContain('Connect a GitHub account in Settings');
		expect(wrapper.find('[data-testid="github-import-project"]').exists()).toBe(
			false,
		);
	});

	it('refuses to offer projects without an approved organization', async () => {
		listWorkspaceGitHubOrganizations.mockResolvedValue({ items: [] });
		const wrapper = mountFields();
		await flushPromises();

		expect(lastAvailability(wrapper)).toBe('no-organization');
		expect(wrapper.text()).toContain('No GitHub organization is approved');
	});

	it('says when the approved organizations hold no open project', async () => {
		listOrganizationProjects.mockResolvedValue([]);
		const wrapper = mountFields();
		await flushPromises();

		expect(lastAvailability(wrapper)).toBe('no-projects');
		expect(wrapper.text()).toContain('No open GitHub projects were found');
		expect(listBoardRepositories).not.toHaveBeenCalled();
	});

	it('surfaces a load failure', async () => {
		listOrganizationProjects.mockRejectedValue(new Error('GitHub is down'));
		const wrapper = mountFields();
		await flushPromises();

		expect(lastAvailability(wrapper)).toBe('error');
		expect(wrapper.text()).toContain('GitHub is down');
	});
});
