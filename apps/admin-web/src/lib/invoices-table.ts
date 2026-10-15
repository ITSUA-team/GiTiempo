import type { InvoiceListItem, InvoiceStatus } from '@gitiempo/shared';
import { getLocalDateKey } from '@gitiempo/web-shared/time';

export interface InvoicesTableFilters {
  search: string;
  projectId: string | null;
  status: InvoiceStatus | null;
  dateFrom: string | null;
  dateTo: string | null;
}

export interface InvoicesTableFilterUpdate {
  search?: string;
  projectId?: string | null;
  status?: InvoiceStatus | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}

export interface InvoicesTableFilterOptions {
  projects: Array<{ id: string; name: string }>;
  statuses: Array<{ value: InvoiceStatus; label: string }>;
}

export type InvoicesTableRow = InvoiceListItem;

export const INVOICE_STATUS_OPTIONS: Array<{
  value: InvoiceStatus;
  label: string;
}> = [
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Paid', value: 'paid' },
];

/** PrimeVue DatePicker range model for the Period filter (complete ranges only). */
export type InvoicesDatePickerRangeValue = Array<Date | null> | null;

// A partial range counts as no range: the picker only shows complete
// selections, so the list endpoint never receives dateFrom/dateTo alone.
// Date-only API bounds are parsed as local calendar days so the picker shows
// the same days the filter keys encode.
export function toInvoicesDatePickerRange(
  dateFrom: string | null,
  dateTo: string | null,
): InvoicesDatePickerRangeValue {
  if (!dateFrom || !dateTo) {
    return null;
  }

  return [
    new Date(`${dateFrom}T00:00:00`),
    new Date(`${dateTo}T00:00:00`),
  ];
}

// selectionMode="range" also emits bare dates and partial pairs mid-picker;
// those all count as no filter update instead of half-completed bounds.
export function fromInvoicesDatePickerRange(
  value: Date | InvoicesDatePickerRangeValue | undefined,
): Pick<InvoicesTableFilterUpdate, 'dateFrom' | 'dateTo'> {
  if (value === null || value === undefined || value instanceof Date) {
    return { dateFrom: null, dateTo: null };
  }

  const [dateFrom, dateTo] = value;

  if (!dateFrom || !dateTo) {
    return { dateFrom: null, dateTo: null };
  }

  return {
    dateFrom: getLocalDateKey(dateFrom),
    dateTo: getLocalDateKey(dateTo),
  };
}

const invoicePeriodFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

// Date-only bounds are UTC midnight instants by definition, so rendering with
// timeZone: 'UTC' keeps the calendar day stable on every client timezone.
function formatInvoiceMonthDay(dateKey: string): string {
  return invoicePeriodFormatter.format(new Date(`${dateKey}T00:00:00Z`));
}

/** 'Apr 1 – Apr 21' style period labels for invoice date bounds. */
export function formatInvoicePeriod(
  dateFrom: string,
  dateTo: string,
): string {
  return `${formatInvoiceMonthDay(dateFrom)} – ${formatInvoiceMonthDay(dateTo)}`;
}