import {
	createInvoiceSchema,
	invoiceListQuerySchema,
	invoiceListResponseSchema,
	invoiceResponseSchema,
	updateInvoiceSchema,
	type CreateInvoiceInput,
	type InvoiceListQuery,
	type InvoiceListResponse,
	type InvoiceResponse,
	type UpdateInvoiceInput,
} from '@gitiempo/shared';
import type { AuthenticatedApiClient } from '@gitiempo/web-shared/http';

import { getAuthenticatedAppApiClient } from '@/services/api-client';

interface AdminInvoicesClientOptions {
	apiClient: Pick<
		AuthenticatedApiClient,
		'requestJson' | 'requestNoContent'
	>;
}

export interface AdminInvoicesClient {
	createInvoice(input: CreateInvoiceInput): Promise<InvoiceResponse>;
	deleteInvoice(invoiceId: string): Promise<void>;
	getInvoice(invoiceId: string): Promise<InvoiceResponse>;
	listInvoices(query?: Partial<InvoiceListQuery>): Promise<InvoiceListResponse>;
	updateInvoice(
		invoiceId: string,
		input: UpdateInvoiceInput,
	): Promise<InvoiceResponse>;
}

function buildInvoiceListQueryString(query?: Partial<InvoiceListQuery>): string {
	const parsed = invoiceListQuerySchema.parse(query ?? {});
	const searchParams = new URLSearchParams();

	if (parsed.page !== 1) {
		searchParams.set('page', String(parsed.page));
	}
	if (parsed.limit !== 20) {
		searchParams.set('limit', String(parsed.limit));
	}
	if (parsed.projectId !== undefined) {
		searchParams.set('projectId', parsed.projectId);
	}
	if (parsed.status !== undefined) {
		searchParams.set('status', parsed.status);
	}

	const search = searchParams.toString();
	return search ? `?${search}` : '';
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

		listInvoices(query) {
			return apiClient.requestJson({
				path: `/invoices${buildInvoiceListQueryString(query)}`,
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