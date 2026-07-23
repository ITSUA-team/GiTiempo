import { describe, expect, it } from 'vitest';
import { formatLocalCalendarDate } from '@gitiempo/web-shared/time';

import { buildReportCsv } from './report-csv';
import type { ReportDisplayRow, ReportRowTotals } from './report-view-model';

function displayRow(overrides: Partial<ReportDisplayRow> = {}): ReportDisplayRow {
  return {
    billableSeconds: 3600,
    billableShare: 0.5,
    childCountLabel: null,
    dimension: 'project',
    entryCount: 2,
    hasChildren: false,
    id: 'row',
    isLeaf: true,
    label: 'Project Orion',
    lastStartedAt: null,
    level: 0,
    nonBillableSeconds: 1800,
    totalSeconds: 5400,
    ...overrides,
  };
}

const totals: ReportRowTotals = {
  billableSeconds: 3600,
  billableShare: 0.5,
  entryCount: 2,
  lastStartedAt: null,
  nonBillableSeconds: 1800,
  totalSeconds: 5400,
};

describe('buildReportCsv', () => {
  it('writes a header, an indented tree, and a totals row that mirror the table', () => {
    const csv = buildReportCsv(
      [
        displayRow({
          childCountLabel: '2 members',
          hasChildren: true,
          id: 'p1',
          isLeaf: false,
          label: 'Project Orion',
          level: 0,
        }),
        displayRow({
          dimension: 'member',
          id: 'p1:m1',
          label: 'Alex Admin',
          level: 1,
        }),
      ],
      totals,
    );
    const lines = csv.split('\n');

    expect(lines[0]).toBe('"Name","Hours","Billable","Billable %","Last activity"');
    // Values use the same display formatting the cells do (5400s → 1h 30m).
    expect(lines[1]).toBe('"Project Orion","1h 30m","1h 00m","50%","—"');
    // Hierarchy shows by indenting the name two spaces per level.
    expect(lines[2]).toBe('"  Alex Admin","1h 30m","1h 00m","50%","—"');
    expect(lines[3]).toBe('"Total","1h 30m","1h 00m","50%","—"');
  });

  it('formats the last activity date from the row timestamp', () => {
    const csv = buildReportCsv(
      [displayRow({ lastStartedAt: '2026-05-02T10:00:00.000Z' })],
      totals,
    );

    expect(csv.split('\n')[1]).toContain(
      `"${formatLocalCalendarDate('2026-05-02T10:00:00.000Z')}"`,
    );
  });

  it('defuses spreadsheet formula triggers in workspace-controlled names', () => {
    const csv = buildReportCsv([displayRow({ label: '=SUM(A1)' })], totals);

    expect(csv.split('\n')[1]).toBe(`"'=SUM(A1)","1h 30m","1h 00m","50%","—"`);
  });

  it('escapes embedded quotes so a name never breaks the row', () => {
    const csv = buildReportCsv([displayRow({ label: 'A "B" C' })], totals);

    expect(csv.split('\n')[1]).toContain('"A ""B"" C"');
  });
});
