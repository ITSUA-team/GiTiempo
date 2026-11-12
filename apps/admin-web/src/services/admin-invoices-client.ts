import {
	createInvoiceSchema,
	createInvoiceGroupSchema,
	invoiceGroupSchema,
	invoiceGroupsResponseSchema,
	moveInvoicesSchema,
	previewInvoiceSchema,
	previewInvoiceResponseSchema,
	eligibleEntriesQuerySchema,
	eligibleEntriesResponseSchema,
	invoiceDefaultsResponseSchema,
	invoiceListQuerySchema,
	invoiceListResponseSchema,
	invoiceResponseSchema,
	invoiceStatsResponseSchema,
	updateInvoiceSchema,
	type CreateInvoiceInput,
	type CreateInvoiceGroupInput,
	type InvoiceGroup,
	type InvoiceGroupsResponse,
	type MoveInvoicesInput,
	type PreviewInvoiceInput,
	type PreviewInvoiceResponse,
	type EligibleEntriesQuery,
	type EligibleEntriesResponse,
	type InvoiceDefaultsResponse,
	type InvoiceListQuery,
	type InvoiceListResponse,
	type InvoiceResponse,
	type InvoiceStatsResponse,
	type UpdateInvoiceInput,
} from '@gitiempo/shared';
import type { AuthenticatedApiClient } from '@gitiempo/web-shared/http';

import { getAuthenticatedAppApiClient } from '@/services/api-client';

function parseWithFriendlyError<T>(parse: () => T, context: string): T {
	try {
		return parse();
	} catch (error) {
		if (error instanceof Error && error.name === 'ZodError') {
			throw new Error(
				`Invalid ${context}. Please check your input and try again.`,
			);
		}
		throw error;
	}
}

interface AdminInvoicesClientOptions {
	apiClient: Pick<AuthenticatedApiClient, 'request' | 'requestJson' | 'requestNoContent'>;
}

export interface AdminInvoicesClient {
	previewInvoice(input: PreviewInvoiceInput): Promise<PreviewInvoiceResponse>;
	listGroups(): Promise<InvoiceGroupsResponse>;
	createGroup(input: CreateInvoiceGroupInput): Promise<InvoiceGroup>;
	updateGroup(groupId: string, input: CreateInvoiceGroupInput): Promise<InvoiceGroup>;
	deleteGroup(groupId: string): Promise<void>;
	moveInvoices(input: MoveInvoicesInput): Promise<void>;
	downloadInvoicePdf(invoiceId: string): Promise<Blob>;
	createInvoice(
		input: CreateInvoiceInput,
	): Promise<InvoiceResponse>;
	deleteInvoice(invoiceId: string): Promise<void>;
	getInvoice(invoiceId: string): Promise<InvoiceResponse>;
	getInvoiceDefaults(): Promise<InvoiceDefaultsResponse>;
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
		previewInvoice(input) {
			return apiClient.requestJson({
				body: parseWithFriendlyError(() => previewInvoiceSchema.parse(input), 'invoice preview'),
				method: 'POST', path: '/invoices/preview', responseSchema: previewInvoiceResponseSchema,
			});
		},
		listGroups() {
			return apiClient.requestJson({ path: '/invoices/groups', responseSchema: invoiceGroupsResponseSchema });
		},
		createGroup(input) {
			return apiClient.requestJson({
				body: parseWithFriendlyError(() => createInvoiceGroupSchema.parse(input), 'invoice group'),
				method: 'POST', path: '/invoices/groups', responseSchema: invoiceGroupSchema,
			});
		},
		updateGroup(groupId, input) {
			return apiClient.requestJson({
				body: parseWithFriendlyError(() => createInvoiceGroupSchema.parse(input), 'invoice group'),
				method: 'PATCH', path: `/invoices/groups/${groupId}`, responseSchema: invoiceGroupSchema,
			});
		},
		async deleteGroup(groupId) {
			await apiClient.requestNoContent({ method: 'DELETE', path: `/invoices/groups/${groupId}` });
		},
		async moveInvoices(input) {
			await apiClient.requestNoContent({
				body: parseWithFriendlyError(() => moveInvoicesSchema.parse(input), 'invoice move'),
				method: 'POST', path: '/invoices/groups/move',
			});
		},
		async downloadInvoicePdf(invoiceId) {
			const response = await apiClient.request({ path: `/invoices/${invoiceId}/pdf` });
			return response.blob();
		},
		createInvoice(input) {
			return apiClient.requestJson({
				body: parseWithFriendlyError(
					() => createInvoiceSchema.parse(input),
					'invoice data',
				),
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

		getInvoiceDefaults() {
			return apiClient.requestJson({
				path: '/invoices/defaults',
				responseSchema: invoiceDefaultsResponseSchema,
			});
		},

		getInvoiceStats() {
			return apiClient.requestJson({
				path: '/invoices/stats',
				responseSchema: invoiceStatsResponseSchema,
			});
		},

		listEligibleEntries(query) {
			const parsed = parseWithFriendlyError(
				() => eligibleEntriesQuerySchema.parse(query),
				'preview parameters',
			);
			const searchParams = new URLSearchParams();
			if (parsed.projectId) {
				searchParams.set('projectId', parsed.projectId);
			}
			searchParams.set('dateFrom', parsed.dateFrom);
			searchParams.set('dateTo', parsed.dateTo);
			if (parsed.roundingStepMinutes) {
				searchParams.set(
					'roundingStepMinutes',
					String(parsed.roundingStepMinutes),
				);
			}
			if (parsed.invoiceId) searchParams.set('invoiceId', parsed.invoiceId);
			const search = searchParams.toString();

			return apiClient.requestJson({
				path: `/invoices/eligible-entries?${search}`,
				responseSchema: eligibleEntriesResponseSchema,
			});
		},

		listInvoices(query) {
			const parsed = parseWithFriendlyError(
				() => invoiceListQuerySchema.parse(query ?? {}),
				'filter parameters',
			);
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
			if (parsed.groupId) searchParams.set('groupId', parsed.groupId);
			const search = searchParams.toString();

			return apiClient.requestJson({
				path: `/invoices?${search}`,
				responseSchema: invoiceListResponseSchema,
			});
		},

		updateInvoice(invoiceId, input) {
			return apiClient.requestJson({
				body: parseWithFriendlyError(
					() => updateInvoiceSchema.parse(input),
					'invoice update',
				),
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
	previewInvoice(input) { return createDefaultAdminInvoicesClient().previewInvoice(input); },
	listGroups() { return createDefaultAdminInvoicesClient().listGroups(); },
	createGroup(input) { return createDefaultAdminInvoicesClient().createGroup(input); },
	updateGroup(id, input) { return createDefaultAdminInvoicesClient().updateGroup(id, input); },
	deleteGroup(id) { return createDefaultAdminInvoicesClient().deleteGroup(id); },
	moveInvoices(input) { return createDefaultAdminInvoicesClient().moveInvoices(input); },
	downloadInvoicePdf(id) { return createDefaultAdminInvoicesClient().downloadInvoicePdf(id); },
	createInvoice(input) {
		return createDefaultAdminInvoicesClient().createInvoice(input);
	},
	deleteInvoice(invoiceId) {
		return createDefaultAdminInvoicesClient().deleteInvoice(invoiceId);
	},
	getInvoice(invoiceId) {
		return createDefaultAdminInvoicesClient().getInvoice(invoiceId);
	},
	getInvoiceDefaults() {
		return createDefaultAdminInvoicesClient().getInvoiceDefaults();
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