import { computed, ref, type Ref } from 'vue';
import type {
	InvoiceResponse,
	InvoiceStatus,
	ProjectListResponse,
	ProjectResponse,
} from '@gitiempo/shared';

export interface InvoiceTableRow {
	id: string;
	title: string;
	projectName: string;
	projectId: string | null;
	totalAmount: number;
	currency: string;
	status: InvoiceStatus;
	dateFrom: string;
	dateTo: string;
	hourlyRate: number;
	discountPercent: number;
	totalHours: number;
	notes: string | null;
	createdAt: string;
	createdByEmail: string;
	createdByDisplayName: string | null;
	createdByAvatarUrl: string | null;
	timeEntryCount: number;
	invoice: InvoiceResponse;
}

export interface InvoiceTableFilters {
	global: string;
	projectId: string | null;
	status: InvoiceStatus | null;
}

export interface InvoiceStatusOption {
	label: string;
	value: InvoiceStatus;
}

export interface InvoiceProjectFilterOption {
	id: string;
	name: string;
}

function createDefaultFilters(): InvoiceTableFilters {
	return {
		global: '',
		projectId: null,
		status: null,
	};
}

function toTableRow(invoice: InvoiceResponse): InvoiceTableRow {
	return {
		id: invoice.id,
		title: invoice.title,
		projectName: invoice.project?.name ?? 'No project',
		projectId: invoice.projectId,
		totalAmount: invoice.totalAmount,
		currency: invoice.currency,
		status: invoice.status,
		dateFrom: invoice.dateFrom,
		dateTo: invoice.dateTo,
		hourlyRate: invoice.hourlyRate,
		discountPercent: invoice.discountPercent,
		totalHours: invoice.totalHours,
		notes: invoice.notes,
		createdAt: invoice.createdAt,
		createdByEmail: invoice.createdByUser.email,
		createdByDisplayName: invoice.createdByUser.displayName,
		createdByAvatarUrl: invoice.createdByUser.avatarUrl,
		timeEntryCount: invoice.timeEntryCount,
		invoice,
	};
}

export interface UseInvoicesTableStateOptions {
	invoices: Ref<InvoiceResponse[]>;
	projects: Ref<ProjectListResponse>;
}

export function useInvoicesTableState({
	invoices,
	projects,
}: UseInvoicesTableStateOptions) {
	const filters = ref<InvoiceTableFilters>(createDefaultFilters());

	const statusFilterOptions: InvoiceStatusOption[] = [
		{ label: 'All statuses', value: null as unknown as InvoiceStatus },
		{ label: 'Draft', value: 'draft' },
		{ label: 'Sent', value: 'sent' },
		{ label: 'Paid', value: 'paid' },
	];

	const projectFilterOptions = computed<InvoiceProjectFilterOption[]>(() => {
		const seen = new Set<string>();
		const options: InvoiceProjectFilterOption[] = [];

		for (const invoice of invoices.value) {
			if (invoice.project && !seen.has(invoice.project.id)) {
				seen.add(invoice.project.id);
				options.push({
					id: invoice.project.id,
					name: invoice.project.name,
				});
			}
		}

		for (const project of projects.value as ProjectResponse[]) {
			if (!seen.has(project.id)) {
				seen.add(project.id);
				options.push({ id: project.id, name: project.name });
			}
		}

		return options.sort((a, b) => a.name.localeCompare(b.name));
	});

	const rows = computed<InvoiceTableRow[]>(() => {
		const global = filters.value.global.trim().toLowerCase();
		const projectId = filters.value.projectId;
		const status = filters.value.status;

		return invoices.value
			.map(toTableRow)
			.filter((row) => {
				if (status !== null && row.status !== status) {
					return false;
				}

				if (projectId !== null) {
					if (row.projectId !== projectId) {
						return false;
					}
				}

				if (global) {
					const haystack = [
						row.title,
						row.projectName,
						row.currency,
						row.status,
						row.createdByEmail,
						row.createdByDisplayName ?? '',
					]
						.join(' ')
						.toLowerCase();

					if (!haystack.includes(global)) {
						return false;
					}
				}

				return true;
			});
	});

	const emptyDescription = computed<string>(() => {
		const hasFilters =
			filters.value.global.trim() !== '' ||
			filters.value.projectId !== null ||
			filters.value.status !== null;

		if (hasFilters) {
			return 'No invoices match the current filters. Try adjusting your search.';
		}

		return 'No invoices have been created yet. Use “Create invoice” to generate one from eligible time entries.';
	});

	function updateFilters(newFilters: Partial<InvoiceTableFilters>): void {
		filters.value = { ...filters.value, ...newFilters };
	}

	function updateGlobalFilter(value: string): void {
		filters.value = { ...filters.value, global: value };
	}

	function updateProjectFilter(projectId: string | null): void {
		filters.value = { ...filters.value, projectId };
	}

	function updateStatusFilter(status: InvoiceStatus | null): void {
		filters.value = { ...filters.value, status };
	}

	function resetFilters(): void {
		filters.value = createDefaultFilters();
	}

	return {
		emptyDescription,
		filters,
		projectFilterOptions,
		rows,
		statusFilterOptions,
		updateFilters,
		updateGlobalFilter,
		updateProjectFilter,
		updateStatusFilter,
		resetFilters,
	};
}