import { ref, type ComputedRef, type Ref } from 'vue';
import type {
	InvoiceListResponse,
	InvoiceResponse,
	ProjectListResponse,
} from '@gitiempo/shared';

import {
	adminInvoicesClient,
	type AdminInvoicesClient,
} from '@/services/admin-invoices-client';
import {
	adminProjectsClient,
	type AdminProjectsClient,
} from '@/services/admin-projects-client';

interface LoadInvoicesDataOptions {
	errorAction: string;
	setError?: boolean;
	setInitialLoaded?: boolean;
}

interface UseInvoicesDataOptions {
	accessToken: Ref<string | null> | ComputedRef<string | null>;
	invoicesClient?: Pick<AdminInvoicesClient, 'listInvoices'>;
	onError?: (message: string, error: unknown, action: string) => void;
	projectsClient?: Pick<AdminProjectsClient, 'listProjects'>;
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'An unexpected error occurred';
}

/**
 * Loads all invoices by paginating through every page (up to the backend max
 * limit of 100 per page). This satisfies the full-scope summary requirement:
 * stats and table filtering are derived from the complete dataset.
 */
async function loadAllInvoices(
	client: Pick<AdminInvoicesClient, 'listInvoices'>,
): Promise<InvoiceListResponse> {
	const limit = 100;
	let page = 1;
	let allItems: InvoiceResponse[] = [];
	let total = 0;
	let totalPages = 0;

	do {
		const response = await client.listInvoices({ page, limit });
		allItems = allItems.concat(response.items);
		total = response.meta.total;
		totalPages = response.meta.totalPages;
		page += 1;
	} while (page <= totalPages && totalPages > 0);

	return {
		items: allItems,
		meta: {
			page: 1,
			limit,
			total,
			totalPages,
		},
	};
}

export function useInvoicesData({
	accessToken,
	invoicesClient = adminInvoicesClient,
	onError,
	projectsClient = adminProjectsClient,
}: UseInvoicesDataOptions) {
	const invoices = ref<InvoiceResponse[]>([]);
	const projects = ref<ProjectListResponse>([]);
	const loading = ref(true);
	const loadError = ref<string | null>(null);
	const initialLoaded = ref(false);

	async function loadInvoicesData({
		errorAction,
		setError = false,
		setInitialLoaded = false,
	}: LoadInvoicesDataOptions): Promise<void> {
		if (!accessToken.value) {
			return;
		}

		loading.value = true;
		if (setError) {
			loadError.value = null;
		}

		try {
			const [invoicesData, projectsData] = await Promise.all([
				loadAllInvoices(invoicesClient),
				projectsClient.listProjects(),
			]);

			invoices.value = invoicesData.items;
			projects.value = projectsData;
			if (setInitialLoaded) {
				initialLoaded.value = true;
			}
		} catch (error) {
			const message = getErrorMessage(error);
			if (setError) {
				loadError.value = message;
			}
			onError?.(message, error, errorAction);
		} finally {
			loading.value = false;
		}
	}

	async function refreshInvoices(): Promise<void> {
		await loadInvoicesData({ errorAction: 'refresh-invoices' });
	}

	return {
		initialLoaded,
		invoices,
		loadError,
		loading,
		loadInvoicesData,
		projects,
		refreshInvoices,
	};
}