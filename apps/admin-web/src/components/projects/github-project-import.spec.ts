import { describe, expect, it } from 'vitest';

import type { BoardRepositorySummary } from '@/services/admin-github-browsing-client';

import {
	describeIssuesScanned,
	describeLinkedRepository,
	describeOutcome,
	describeProjectName,
	describeStatus,
	toBoardOption,
	type ImportedBoard,
} from './github-project-import';

const board = {
	id: 'PVT_Krvn',
	number: 9,
	title: 'Krvn',
	owner: 'ITSUA-team',
	state: 'open' as const,
	description: null,
	url: 'https://github.com/orgs/ITSUA-team/projects/9',
	updatedAt: '2026-08-03T10:00:00.000Z',
};

const noSkipped = {
	draftIssues: 0,
	pullRequests: 0,
	redacted: 0,
	unknown: 0,
};

function summary(
	overrides: Partial<BoardRepositorySummary> = {},
): BoardRepositorySummary {
	return {
		errorMessage: null,
		hasMore: false,
		repositories: ['ITSUA-team/GiTiempo'],
		skipped: { ...noSkipped },
		totalItems: 24,
		...overrides,
	};
}

function unscannedOption() {
	return toBoardOption(board, undefined, new Map(), new Map());
}

function option(
	boardSummary: BoardRepositorySummary = summary(),
	imported: ReadonlyMap<string, ImportedBoard> = new Map(),
	repositories: ReadonlyMap<string, string> = new Map(),
) {
	return toBoardOption(board, boardSummary, imported, repositories);
}

const settings = {
	defaultBillableForTasks: true,
	managerName: null,
	visibility: 'private' as const,
};

describe('toBoardOption', () => {
	it('links the single repository the scan found', () => {
		const result = option();

		expect(result.scanState).toBe('ok');
		expect(result.linkedRepository).toBe('ITSUA-team/GiTiempo');
		expect(result.linkedRepositoryTaken).toBe(false);
		expect(result.reason).toBe('1 repository — ITSUA-team/GiTiempo');
	});

	it('links nothing when the project spans several repositories', () => {
		const result = option(
			summary({ repositories: ['a/one', 'a/two'], totalItems: 41 }),
		);

		expect(result.linkedRepository).toBeNull();
		expect(result.reason).toBe('2 repositories');
	});

	it('discards repositories collected before a scan error', () => {
		const result = option(summary({ errorMessage: 'token expired' }));

		expect(result.scanState).toBe('failed');
		expect(result.repositories).toEqual([]);
		expect(result.linkedRepository).toBeNull();
	});

	it('marks a project with no scan result as unscanned', () => {
		const result = unscannedOption();

		expect(result.scanState).toBe('missing');
		expect(result.reason).toBe('Not scanned yet');
	});

	it('flags a repository another project already tracks', () => {
		const result = option(
			summary(),
			new Map(),
			new Map([['itsua-team/gitiempo', 'p1']]),
		);

		expect(result.importedProjectId).toBeNull();
		expect(result.linkedRepositoryTaken).toBe(true);
	});

	it('keeps the repository the server linked for an imported project', () => {
		const result = option(
			summary({ repositories: [], totalItems: 0 }),
			new Map([
				[
					'PVT_Krvn',
					{ linkedRepository: 'ITSUA-team/GiTiempo', projectId: 'p1' },
				],
			]),
		);

		expect(result.importedProjectId).toBe('p1');
		expect(describeLinkedRepository(result)).toBe('ITSUA-team/GiTiempo');
	});
});

describe('describeProjectName', () => {
	it('names the project after its organization', () => {
		expect(describeProjectName(option())).toBe('ITSUA-team/Krvn');
	});
});

describe('describeLinkedRepository', () => {
	it('warns when the repository belongs to another project', () => {
		const result = option(
			summary(),
			new Map(),
			new Map([['itsua-team/gitiempo', 'p1']]),
		);

		expect(describeLinkedRepository(result)).toBe(
			'ITSUA-team/GiTiempo — already tracked by another project',
		);
	});

	it('refuses to guess from an unscanned project', () => {
		expect(describeLinkedRepository(unscannedOption())).toBe(
			'Unknown — this project has not been scanned yet',
		);
	});

	it('refuses to guess from a failed scan', () => {
		expect(
			describeLinkedRepository(option(summary({ errorMessage: 'boom' }))),
		).toBe('Unknown — this project could not be read');
	});

	it('counts the repositories when there is more than one', () => {
		expect(
			describeLinkedRepository(
				option(summary({ repositories: ['a/one', 'a/two', 'a/three'] })),
			),
		).toBe('None — issues come from 3 repositories');
	});
});

describe('describeIssuesScanned', () => {
	it('names the single repository every issue came from', () => {
		expect(describeIssuesScanned(option())).toBe(
			'24 issues, all from ITSUA-team/GiTiempo',
		);
	});

	it('discloses a truncated scan', () => {
		expect(describeIssuesScanned(option(summary({ hasMore: true })))).toBe(
			'24 issues, all from ITSUA-team/GiTiempo (more not scanned)',
		);
	});

	it('reports the error rather than an empty project', () => {
		expect(
			describeIssuesScanned(
				option(summary({ errorMessage: 'token expired', totalItems: 0 })),
			),
		).toBe('Could not read this project: token expired');
	});

	it('lists what was skipped when nothing was scanned', () => {
		expect(
			describeIssuesScanned(
				option(
					summary({
						repositories: [],
						skipped: { ...noSkipped, draftIssues: 6, pullRequests: 2 },
						totalItems: 0,
					}),
				),
			),
		).toBe('None. 6 draft items, 2 pull requests skipped');
	});

	it('says the project is empty when nothing was skipped either', () => {
		expect(
			describeIssuesScanned(
				option(summary({ repositories: [], totalItems: 0 })),
			),
		).toBe('No issues yet');
	});
});

describe('describeStatus', () => {
	it('separates an imported project from one that only shares a repository', () => {
		const shared = option(
			summary(),
			new Map(),
			new Map([['itsua-team/gitiempo', 'p1']]),
		);
		const alreadyImported = option(
			summary(),
			new Map([['PVT_Krvn', { linkedRepository: null, projectId: 'p2' }]]),
		);

		expect(describeStatus(shared)).toBe('Not added yet');
		expect(describeStatus(alreadyImported)).toBe('Already added');
	});
});

describe('describeOutcome', () => {
	it('states the settings the project will carry', () => {
		expect(describeOutcome(option(), settings)).toBe(
			'Adds ITSUA-team/Krvn as a private project, billable by default, and links ' +
				'ITSUA-team/GiTiempo. A timer started from any issue of that repository ' +
				'reuses this project instead of creating a second one.',
		);
	});

	it('names the manager when one is chosen', () => {
		expect(
			describeOutcome(option(), { ...settings, managerName: 'Alexey T.' }),
		).toContain('with Alexey T. as manager');
	});

	it('says when the project will not be billable by default', () => {
		expect(
			describeOutcome(option(), {
				...settings,
				defaultBillableForTasks: false,
				visibility: 'public',
			}),
		).toContain('as a public project, not billable by default');
	});

	it('explains why a shared repository will not be linked', () => {
		const result = option(
			summary(),
			new Map(),
			new Map([['itsua-team/gitiempo', 'p1']]),
		);

		expect(describeOutcome(result, settings)).toContain(
			'already belongs to another project, so it will not be linked here',
		);
	});

	it('explains a board that holds only drafts', () => {
		const result = option(
			summary({
				repositories: [],
				skipped: { ...noSkipped, draftIssues: 6 },
				totalItems: 0,
			}),
		);

		expect(describeOutcome(result, settings)).toContain(
			'Draft items live only on the board',
		);
	});

	it('refuses to promise anything for an already imported project', () => {
		const result = option(
			summary(),
			new Map([['PVT_Krvn', { linkedRepository: null, projectId: 'p1' }]]),
		);

		expect(describeOutcome(result, settings)).toContain(
			'Adding never modifies an existing project',
		);
	});
});
