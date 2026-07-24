import { formatPaddedHoursMinutesDuration } from '@gitiempo/web-shared/time';
import type { ReportDocument, ReportDocumentRow } from '@gitiempo/shared';

import {
  formatReportPercent,
  reportGroupingDimensionLabels,
  type ReportDateRange,
  type ReportDisplayRow,
  type ReportGrouping,
  type ReportRowTotals,
} from '@/lib/report-view-model';

function formatDocumentDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export interface ReportPdfDocumentParams {
  rows: ReportDisplayRow[];
  totals: ReportRowTotals;
  dateRange: ReportDateRange;
  grouping: ReportGrouping;
  projectLabel: string | null;
  memberLabel: string | null;
  workspaceName: string;
  now: Date;
}

/**
 * Builds the renderer-agnostic report document from the on-screen tree, so the
 * server-side pdfmake renderer styles exactly what the user sees (same rows,
 * subtotals, and display formatting as the table). The chrome — period, filters
 * line, and summary stats — is derived from the same filtered totals shown on
 * screen, not a re-queried summary.
 */
export function buildReportPdfDocument(
  params: ReportPdfDocumentParams,
): ReportDocument {
  const [start, end] = params.dateRange ?? [];
  const period =
    start && end
      ? `${formatDocumentDate(start)} – ${formatDocumentDate(end)} · ${params.workspaceName}`
      : params.workspaceName;

  const filters = [
    `Projects: ${params.projectLabel ?? 'All'}`,
    `Members: ${params.memberLabel ?? 'All'}`,
    `Grouping: ${params.grouping
      .map((dimension) => reportGroupingDimensionLabels[dimension])
      .join(' › ')}`,
  ].join(' · ');

  const rows: ReportDocumentRow[] = params.rows.map((row) => ({
    billable: formatPaddedHoursMinutesDuration(row.billableSeconds),
    detail: row.childCountLabel,
    hours: formatPaddedHoursMinutesDuration(row.totalSeconds),
    isLeaf: row.isLeaf,
    label: row.label,
    level: row.level,
    share: formatReportPercent(row.billableShare),
  }));

  return {
    columns: ['NAME', 'HOURS', 'BILLABLE', 'BILL %'],
    filters,
    footerNote: `Generated with GiTiempo · ${formatDocumentDate(params.now)}`,
    masthead: { tag: 'TIME REPORT', wordmark: 'GiTiempo' },
    period,
    rows,
    stats: [
      {
        label: 'TRACKED HOURS',
        value: formatPaddedHoursMinutesDuration(params.totals.totalSeconds),
      },
      {
        label: 'BILLABLE',
        value: `${formatPaddedHoursMinutesDuration(params.totals.billableSeconds)} · ${formatReportPercent(params.totals.billableShare)}`,
      },
    ],
    title: 'Time report',
    total: {
      billable: formatPaddedHoursMinutesDuration(params.totals.billableSeconds),
      hours: formatPaddedHoursMinutesDuration(params.totals.totalSeconds),
      label: 'Total',
      share: formatReportPercent(params.totals.billableShare),
    },
  };
}
