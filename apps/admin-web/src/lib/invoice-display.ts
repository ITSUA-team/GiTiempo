import type { InvoiceStatus } from '@gitiempo/shared';

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
	draft: 'Draft',
	sent: 'Sent',
	paid: 'Paid',
};

export const INVOICE_STATUS_SEVERITY: Record<
	InvoiceStatus,
	'warn' | 'info' | 'success'
> = {
	draft: 'warn',
	sent: 'info',
	paid: 'success',
};

export function getInvoiceStatusLabel(status: InvoiceStatus): string {
	return INVOICE_STATUS_LABELS[status];
}

export function getInvoiceStatusSeverity(
	status: InvoiceStatus,
): 'warn' | 'info' | 'success' {
	return INVOICE_STATUS_SEVERITY[status];
}

export function formatInvoiceAmount(amount: number, currency: string): string {
	try {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency,
			minimumFractionDigits: 0,
			maximumFractionDigits: 2,
		}).format(amount);
	} catch {
		return `${currency} ${amount.toLocaleString('en-US', {
			minimumFractionDigits: 0,
			maximumFractionDigits: 2,
		})}`;
	}
}

export function formatDateRange(dateFrom: string, dateTo: string): string {
	const from = new Date(dateFrom + 'T00:00:00.000Z');
	const to = new Date(dateTo + 'T00:00:00.000Z');

	const formatOpts: Intl.DateTimeFormatOptions = {
		month: 'short',
		day: 'numeric',
		timeZone: 'UTC',
	};

	const fromStr = from.toLocaleDateString('en-US', formatOpts);
	const toStr = to.toLocaleDateString('en-US', formatOpts);

	if (fromStr === toStr) {
		return fromStr;
	}

	return `${fromStr} - ${toStr}`;
}