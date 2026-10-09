import { computed, type Ref } from 'vue';
import type { InvoiceResponse } from '@gitiempo/shared';

export interface InvoiceStats {
	openInvoices: number;
	openInvoicesDescription: string;
	billedThisMonth: string;
	billedThisMonthDescription: string;
	drafts: number;
	draftsDescription: string;
}

function formatCurrency(amount: number, currency: string): string {
	try {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency,
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(amount);
	} catch {
		return `${currency} ${amount.toLocaleString('en-US', {
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		})}`;
	}
}

function isCurrentMonth(isoDate: string): boolean {
	const date = new Date(isoDate);
	const now = new Date();
	return (
		date.getUTCFullYear() === now.getUTCFullYear() &&
		date.getUTCMonth() === now.getUTCMonth()
	);
}

export function deriveInvoiceStats(
	invoices: InvoiceResponse[],
): InvoiceStats {
	const openInvoices = invoices.filter((inv) => inv.status !== 'paid');
	const drafts = invoices.filter((inv) => inv.status === 'draft');
	const sentCount = invoices.filter((inv) => inv.status === 'sent').length;
	const paidThisMonth = invoices.filter(
		(inv) => inv.status === 'paid' && isCurrentMonth(inv.createdAt),
	);
	const billedThisMonthTotal = paidThisMonth.reduce(
		(sum, inv) => sum + inv.totalAmount,
		0,
	);
	const billedThisMonthCurrency = paidThisMonth[0]?.currency ?? 'USD';
	const billedThisMonthProjectIds = new Set(
		paidThisMonth
			.map((inv) => inv.projectId)
			.filter((id): id is string => id !== null),
	);

	return {
		openInvoices: openInvoices.length,
		openInvoicesDescription:
			sentCount > 0 ? `${sentCount} awaiting payment` : 'No sent invoices',
		billedThisMonth: formatCurrency(
			billedThisMonthTotal,
			billedThisMonthCurrency,
		),
		billedThisMonthDescription:
			billedThisMonthProjectIds.size > 0
				? `Across ${billedThisMonthProjectIds.size} ${
						billedThisMonthProjectIds.size === 1 ? 'project' : 'projects'
					}`
				: 'No paid invoices this month',
		drafts: drafts.length,
		draftsDescription:
			drafts.length > 0 ? 'Ready for review' : 'No draft invoices',
	};
}

export function useInvoiceStats(invoices: Ref<InvoiceResponse[]>) {
	return computed(() => deriveInvoiceStats(invoices.value));
}