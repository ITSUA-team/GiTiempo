import { computed, ref, type ComputedRef, type Ref } from 'vue';
import {
	WorkspaceRoles,
	type InvoiceResponse,
	type InvoiceStatus,
	type UserResponse,
} from '@gitiempo/shared';


import {
	adminInvoicesClient,
	type AdminInvoicesClient,
} from '@/services/admin-invoices-client';

interface UseInvoiceActionsOptions {
	accessToken: Ref<string | null> | ComputedRef<string | null>;
	invoicesClient?: Pick<
		AdminInvoicesClient,
		'createInvoice' | 'updateInvoice' | 'deleteInvoice'
	>;
	onError?: (message: string, error: unknown, action: string) => void;
	onSuccess?: (message: string) => void;
	refreshInvoices: () => Promise<void>;
	requireConfirmation: (
		message: string,
		header: string,
		acceptLabel: string,
		accept: () => void,
	) => void;
	profile: Ref<UserResponse | null> | ComputedRef<UserResponse | null>;
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'An unexpected error occurred';
}

export interface CreateInvoicePayload {
	title: string;
	projectId?: string;
	dateFrom: string;
	dateTo: string;
	hourlyRate?: number;
	discountPercent?: number;
	notes?: string | null;
}

export interface UpdateInvoicePayload {
	title?: string;
	status?: InvoiceStatus;
	hourlyRate?: number;
	discountPercent?: number;
	currency?: string;
	notes?: string | null;
}

export function useInvoiceActions({
	accessToken: _accessToken,
	invoicesClient = adminInvoicesClient,
	onError,
	onSuccess,
	refreshInvoices,
	requireConfirmation,
	profile,
}: UseInvoiceActionsOptions) {
	const creating = ref(false);
	const savingInvoiceId = ref<string | null>(null);
	const deletingInvoiceId = ref<string | null>(null);

	const isAdmin = computed(() => profile.value?.role === WorkspaceRoles.Admin);

	function notifyError(message: string, error: unknown, action: string): void {
		onError?.(message, error, action);
	}

	async function handleCreateInvoice(
		payload: CreateInvoicePayload,
	): Promise<InvoiceResponse | null> {
		creating.value = true;
		try {
			const invoice = await invoicesClient.createInvoice(payload);
			onSuccess?.('Invoice created.');
			await refreshInvoices();
			return invoice;
		} catch (error) {
			const message = getErrorMessage(error);
			notifyError(message, error, 'create-invoice');
			return null;
		} finally {
			creating.value = false;
		}
	}

	async function handleUpdateInvoice(
		invoice: InvoiceResponse,
		payload: UpdateInvoicePayload,
	): Promise<InvoiceResponse | null> {
		savingInvoiceId.value = invoice.id;
		try {
			const updated = await invoicesClient.updateInvoice(
				invoice.id,
				payload,
			);
			onSuccess?.('Invoice updated.');
			await refreshInvoices();
			return updated;
		} catch (error) {
			const message = getErrorMessage(error);
			notifyError(message, error, 'update-invoice');
			return null;
		} finally {
			savingInvoiceId.value = null;
		}
	}

	async function performStatusTransition(
		invoice: InvoiceResponse,
		targetStatus: InvoiceStatus,
		successMessage: string,
	): Promise<InvoiceResponse | null> {
		savingInvoiceId.value = invoice.id;
		try {
			const updated = await invoicesClient.updateInvoice(invoice.id, {
				status: targetStatus,
			});
			onSuccess?.(successMessage);
			await refreshInvoices();
			return updated;
		} catch (error) {
			const message = getErrorMessage(error);
			notifyError(message, error, `transition-invoice-${targetStatus}`);
			return null;
		} finally {
			savingInvoiceId.value = null;
		}
	}

	async function handleSendInvoice(
		invoice: InvoiceResponse,
	): Promise<InvoiceResponse | null> {
		return performStatusTransition(
			invoice,
			'sent',
			'Invoice marked as sent.',
		);
	}

	async function handleMarkPaid(
		invoice: InvoiceResponse,
	): Promise<InvoiceResponse | null> {
		return performStatusTransition(
			invoice,
			'paid',
			'Invoice marked as paid.',
		);
	}

	function handleDeleteInvoice(invoice: InvoiceResponse): void {
		if (!isAdmin.value) {
			return;
		}

		requireConfirmation(
			'This invoice will be permanently deleted. Linked time entries will be unlinked and become available for future invoices.',
			'Delete invoice?',
			'Delete',
			() => void executeDelete(invoice),
		);
	}

	async function executeDelete(
		invoice: InvoiceResponse,
	): Promise<void> {
		deletingInvoiceId.value = invoice.id;
		try {
			await invoicesClient.deleteInvoice(invoice.id);
			onSuccess?.('Invoice deleted.');
			await refreshInvoices();
		} catch (error) {
			const message = getErrorMessage(error);
			notifyError(message, error, 'delete-invoice');
		} finally {
			deletingInvoiceId.value = null;
		}
	}

	return {
		creating,
		deletingInvoiceId,
		handleCreateInvoice,
		handleDeleteInvoice,
		handleMarkPaid,
		handleSendInvoice,
		handleUpdateInvoice,
		isAdmin,
		savingInvoiceId,
	};
}
