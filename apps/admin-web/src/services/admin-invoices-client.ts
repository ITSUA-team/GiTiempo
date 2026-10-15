import {
	createInvoiceSchema,
	eligibleEntriesQuerySchema,
	eligibleEntriesResponseSchema,
	invoiceListQuerySchema,
	invoiceListResponseSchema,
	invoiceResponseSchema,
	invoiceStatsResponseSchema,
	updateInvoiceSchema,
	type CreateInvoiceInput,
	type EligibleEntriesQuery,
	type EligibleEntriesResponse,
	type InvoiceListQuery,
	type InvoiceListResponse,
	type InvoiceResponse,
	type InvoiceStatsResponse,
	type UpdateInvoiceInput,
} from '@gitiempo/shared';
import type { AuthenticatedApiClient } from '@gitiempo/web-shared/http';

import { getAuthenticatedAppApiClient } from '@/services/api-client';


interface AdminInvoicesClientOptions {
	apiClient: Pick<AuthenticatedApiClient, 'requestJson' | 'requestNoContent'>;
}

export interface AdminInvoicesClient {
	createInvoice(
		input: CreateInvoiceInput,
	): Promise<InvoiceResponse>;
	deleteInvoice(invoiceId: string): Promise<void>;
	getInvoice(invoiceId: string): Promise<InvoiceResponse>;
	getInvoiceStats(): Promise<InvoiceStatsResponse>;
	listEligibleEntries(
		query: EligibleEntriesQuery,
	): Promise<EligibleEntriesResponse>;
	listInvoices(
		query?: Partial<InvoiceListQuery>,
	): Promise<InvoiceListResponse>;
	updateInvoice(
		invoiceId: string,
		input: UpdateInvoiceInput,
	): Promise<InvoiceResponse>;
}

export function createAdminInvoicesClient({
	apiClient,
}: AdminInvoicesClientOptions): AdminInvoicesClient {
	return {
		createInvoice(input) {
			return apiClient.requestJson({
				body: createInvoiceSchema.parse(input),
				method: 'POST',
				path: '/invoices',
				responseSchema: invoiceResponseSchema,
			});
		},

		async deleteInvoice(invoiceId) {
			await apiClient.requestNoContent({
				method: 'DELETE',
				path: `/invoices/${invoiceId}`,
			});
		},

		getInvoice(invoiceId) {
			return apiClient.requestJson({
				path: `/invoices/${invoiceId}`,
				responseSchema: invoiceResponseSchema,
			});
		},

		getInvoiceStats() {
			return apiClient.requestJson({
				path: '/invoices/stats',
				responseSchema: invoiceStatsResponseSchema,
			});
		},

		listEligibleEntries(query) {
			const parsed = eligibleEntriesQuerySchema.parse(query);
			const searchParams = new URLSearchParams();
			if (parsed.projectId) {
				searchParams.set('projectId', parsed.projectId);
			}
			searchParams.set('dateFrom', parsed.dateFrom);
			searchParams.set('dateTo', parsed.dateTo);
			const search = searchParams.toString();

			return apiClient.requestJson({
				path: `/invoices/eligible-entries?${search}`,
				responseSchema: eligibleEntriesResponseSchema,
			});
		},

		listInvoices(query) {
			const parsed = invoiceListQuerySchema.parse(query ?? {});
			const searchParams = new URLSearchParams();
			searchParams.set('page', String(parsed.page));
			searchParams.set('limit', String(parsed.limit));
			if (parsed.dateFrom) {
				searchParams.set('dateFrom', parsed.dateFrom);
			}
			if (parsed.dateTo) {
				searchParams.set('dateTo', parsed.dateTo);
			}
			if (parsed.projectId) {
				searchParams.set('projectId', parsed.projectId);
			}
			if (parsed.status) {
				searchParams.set('status', parsed.status);
			}
			if (parsed.search) {
				searchParams.set('search', parsed.search);
			}
			const search = searchParams.toString();
			const queryString = search ? `?${search}` : '';

			return apiClient.requestJson({
				path: `/invoices${queryString}`,
				responseSchema: invoiceListResponseSchema,
			});
		},

		updateInvoice(invoiceId, input) {
			return apiClient.requestJson({
				body: updateInvoiceSchema.parse(input),
				method: 'PATCH',
				path: `/invoices/${invoiceId}`,
				responseSchema: invoiceResponseSchema,
			});
		},
	};
}

function createDefaultAdminInvoicesClient(): AdminInvoicesClient {
	return createAdminInvoicesClient({
		apiClient: getAuthenticatedAppApiClient(),
	});
}

export const adminInvoicesClient: AdminInvoicesClient = {
	createInvoice(input) {
		return createDefaultAdminInvoicesClient().createInvoice(input);
	},
	deleteInvoice(invoiceId) {
		return createDefaultAdminInvoicesClient().deleteInvoice(invoiceId);
	},
	getInvoice(invoiceId) {
		return createDefaultAdminInvoicesClient().getInvoice(invoiceId);
	},
	getInvoiceStats() {
		return createDefaultAdminInvoicesClient().getInvoiceStats();
	},
	listEligibleEntries(query) {
		return createDefaultAdminInvoicesClient().listEligibleEntries(query);
	},
	listInvoices(query) {
		return createDefaultAdminInvoicesClient().listInvoices(query);
	},
	updateInvoice(invoiceId, input) {
		return createDefaultAdminInvoicesClient().updateInvoice(
			invoiceId,
			input,
		);
	},
};