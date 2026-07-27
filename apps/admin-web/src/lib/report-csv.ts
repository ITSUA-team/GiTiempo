import {
  formatLocalCalendarDate,
  formatPaddedHoursMinutesDuration,
} from '@gitiempo/web-shared/time';

import {
  formatReportPercent,
  type ReportDisplayRow,
  type ReportRowTotals,
} from '@/lib/report-view-model';

// Characters that make a spreadsheet treat a cell as a formula (CWE-1236).
// Workspace-controlled names (project / task / member) land in the file, so
// defuse before quoting. Mirrors the backend `csvCell` guard.
const csvFormulaTrigger = /^[=+\-@\t\r\n＝＋－＠]/;

function csvCell(value: string): string {
  const guarded = csvFormulaTrigger.test(value) ? `'${value}` : value;

  return `"${guarded.replace(/"/g, '""')}"`;
}

function formatRowActivity(lastStartedAt: string | null): string {
  return lastStartedAt ? formatLocalCalendarDate(lastStartedAt) : '—';
}

/**
 * Serialises the on-screen report tree — already filtered, grouped, and sorted,
 * flattened fully expanded — into CSV. This is a true WYSIWYG export the
 * backend's detailed project-task-user query cannot produce; hierarchy shows by
 * indenting the name, matching the table, and values use the same display
 * formatting the cells do.
 */
export function buildReportCsv(
  rows: ReportDisplayRow[],
  totals: ReportRowTotals,
): string {
  const header = ['Name', 'Hours', 'Billable', 'Billable %', 'Last activity'];
  const body = rows.map((row) => [
    `${'  '.repeat(row.level)}${row.label}`,
    formatPaddedHoursMinutesDuration(row.totalSeconds),
    formatPaddedHoursMinutesDuration(row.billableSeconds),
    formatReportPercent(row.billableShare),
    formatRowActivity(row.lastStartedAt),
  ]);
  const total = [
    'Total',
    formatPaddedHoursMinutesDuration(totals.totalSeconds),
    formatPaddedHoursMinutesDuration(totals.billableSeconds),
    formatReportPercent(totals.billableShare),
    '—',
  ];

  return [header, ...body, total]
    .map((line) => line.map(csvCell).join(','))
    .join('\n');
}
