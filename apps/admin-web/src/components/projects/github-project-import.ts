import type { GitHubProject } from '@gitiempo/shared';

import type { BoardRepositorySummary } from '@/services/admin-github-browsing-client';

export type ScanState = 'failed' | 'missing' | 'ok';

export interface ImportedBoard {
	linkedRepository: string | null;
	projectId: string;
}

export interface RepositoryOwner {
	projectId: string;
	projectIsActive: boolean;
	projectName: string;
}

export interface BoardOption {
	board: GitHubProject;
	id: string;
	importedProjectId: string | null;
	importedRepository: string | null;
	label: string;
	linkedRepository: string | null;
	linkedRepositoryOwner: RepositoryOwner | null;
	linkedRepositoryTaken: boolean;
	reason: string;
	repositories: string[];
	scanState: ScanState;
	summary: BoardRepositorySummary | undefined;
}

export interface ProjectSettings {
	defaultBillableForTasks: boolean;
	managerName: string | null;
	visibility: 'private' | 'public';
}

function skippedParts(skipped: BoardRepositorySummary['skipped']): string[] {
	const parts: string[] = [];

	if (skipped.draftIssues > 0) parts.push(`${skipped.draftIssues} draft items`);
	if (skipped.pullRequests > 0)
		parts.push(`${skipped.pullRequests} pull requests`);
	if (skipped.redacted > 0)
		parts.push(`${skipped.redacted} items you cannot read`);
	if (skipped.unknown > 0) parts.push(`${skipped.unknown} unrecognised items`);

	return parts;
}

function describeReason(
	summary: BoardRepositorySummary | undefined,
	repositories: string[],
	scanState: ScanState,
): string {
	if (scanState === 'missing') {
		return 'Not scanned yet';
	}

	if (scanState === 'failed') {
		return `Could not read: ${summary!.errorMessage}`;
	}

	if (repositories.length === 1) {
		return `1 repository — ${repositories[0]}`;
	}

	if (repositories.length > 1) {
		return `${repositories.length} repositories`;
	}

	const parts = skippedParts(summary!.skipped);

	return parts.length > 0 ? parts.join(', ') : 'No issues yet';
}

export function toBoardOption(
	board: GitHubProject,
	summary: BoardRepositorySummary | undefined,
	importedByBoardId: ReadonlyMap<string, ImportedBoard>,
	importedRepositoryKeys: ReadonlyMap<string, RepositoryOwner>,
): BoardOption {
	const scanState: ScanState =
		summary === undefined
			? 'missing'
			: summary.errorMessage !== null
				? 'failed'
				: 'ok';
	const repositories = scanState === 'ok' ? summary!.repositories : [];
	const linkedRepository = repositories.length === 1 ? repositories[0]! : null;
	const imported = importedByBoardId.get(board.id);
	const linkedRepositoryOwner =
		linkedRepository === null
			? null
			: (importedRepositoryKeys.get(linkedRepository.toLowerCase()) ?? null);

	return {
		board,
		id: board.id,
		importedProjectId: imported?.projectId ?? null,
		importedRepository: imported?.linkedRepository ?? null,
		label: board.title,
		linkedRepository,
		linkedRepositoryOwner,
		linkedRepositoryTaken: linkedRepositoryOwner !== null,
		reason: describeReason(summary, repositories, scanState),
		repositories,
		scanState,
		summary,
	};
}

export function isBoardAddable(option: BoardOption): boolean {
	return option.importedProjectId === null && !option.linkedRepositoryTaken;
}

export function describeBlockedReason(option: BoardOption): string | null {
	if (option.importedProjectId !== null) {
		return 'Already added';
	}

	if (option.linkedRepositoryOwner) {
		return `Repository tracked by ${option.linkedRepositoryOwner.projectName}`;
	}

	return null;
}

export function describeProjectName(option: BoardOption): string {
	return `${option.board.owner}/${option.board.title}`;
}

export function describeLinkedRepository(option: BoardOption): string {
	if (option.importedProjectId !== null) {
		return option.importedRepository ?? 'None';
	}

	if (option.scanState === 'missing') {
		return 'Unknown — this project has not been scanned yet';
	}

	if (option.scanState === 'failed') {
		return 'Unknown — this project could not be read';
	}

	if (option.linkedRepository) {
		return option.linkedRepositoryOwner
			? `${option.linkedRepository} — already tracked by ${option.linkedRepositoryOwner.projectName}`
			: option.linkedRepository;
	}

	if (option.repositories.length > 1) {
		return `None — issues come from ${option.repositories.length} repositories`;
	}

	return 'None — no issue to read a repository from';
}

export function describeIssuesScanned(option: BoardOption): string {
	const summary = option.summary;

	if (!summary) {
		return 'Not scanned yet';
	}

	if (summary.errorMessage) {
		return `Could not read this project: ${summary.errorMessage}`;
	}

	if (summary.totalItems === 0) {
		const parts = skippedParts(summary.skipped);

		return parts.length > 0
			? `None. ${parts.join(', ')} skipped`
			: 'No issues yet';
	}

	const issues = `${summary.totalItems} ${summary.totalItems === 1 ? 'issue' : 'issues'}`;
	const scope =
		option.repositories.length === 1
			? `, all from ${option.repositories[0]}`
			: `, from ${option.repositories.join(', ')}`;

	return `${issues}${scope}${summary.hasMore ? ' (more not scanned)' : ''}`;
}

export function describeStatus(option: BoardOption): string {
	return option.importedProjectId === null ? 'Not added yet' : 'Already added';
}

function describeSettings(settings: ProjectSettings): string {
	const billable = settings.defaultBillableForTasks
		? 'billable by default'
		: 'not billable by default';
	const manager =
		settings.managerName === null
			? ''
			: `, with ${settings.managerName} as manager`;

	return `as a ${settings.visibility} project, ${billable}${manager}`;
}

export function describeOutcome(
	option: BoardOption,
	settings: ProjectSettings,
): string {
	const name = describeProjectName(option);

	if (option.importedProjectId !== null) {
		return `This project is already in GiTiempo as ${name}. Adding never modifies an existing project, so Add project stays disabled.`;
	}

	const opening = `Adds ${name} ${describeSettings(settings)}`;

	if (option.scanState === 'missing') {
		return `${opening}. Its issues have not been scanned yet, so no repository can be linked.`;
	}

	if (option.scanState === 'failed') {
		return `${opening}, without a repository, because its issues could not be read. Nothing will be linked.`;
	}

	if (option.linkedRepository && option.linkedRepositoryOwner) {
		const owner = option.linkedRepositoryOwner;
		const archived = owner.projectIsActive
			? ''
			: ', which is archived — reactivate or resolve it first';

		return `${option.linkedRepository} is already tracked by ${owner.projectName}${archived}. Adding this project would split time for one repository across two, so Add project stays disabled.`;
	}

	if (option.linkedRepository) {
		return `${opening}, and links ${option.linkedRepository}. A timer started from any issue of that repository reuses this project instead of creating a second one.`;
	}

	if (option.repositories.length > 1) {
		return `${opening}, without a repository. Linking one of the ${option.repositories.length} would misrepresent the others, so timers started from those issues keep creating their own projects.`;
	}

	if ((option.summary?.skipped.draftIssues ?? 0) > 0) {
		return `${opening}, without a repository. Draft items live only on the board and belong to no repository, so nothing can be linked until real issues are added.`;
	}

	return `${opening}, without a repository. Nothing on this project points at one yet, so nothing can be linked until it has issues.`;
}

export type GitHubFieldsAvailability =
	| 'available'
	| 'error'
	| 'loading'
	| 'no-connection'
	| 'no-organization'
	| 'no-projects';
