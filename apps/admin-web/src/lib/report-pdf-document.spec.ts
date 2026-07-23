import { describe, expect, it } from 'vitest';
import { reportDocumentSchema } from '@gitiempo/shared';

import {
  buildReportPdfDocument,
  type ReportPdfDocumentParams,
} from './report-pdf-document';
import {
  reportGroupingDimensionLabels,
  type ReportDisplayRow,
  type ReportGrouping,
  type ReportRowTotals,
} from './report-view-model';

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

function buildParams(
  overrides: Partial<ReportPdfDocumentParams> = {},
): ReportPdfDocumentParams {
  return {
    dateRange: [
      new Date('2026-05-01T00:00:00.000Z'),
      new Date('2026-05-31T00:00:00.000Z'),
    ],
    grouping: ['project', 'member'],
    memberLabel: null,
    now: new Date('2026-06-01T00:00:00.000Z'),
    projectLabel: 'Project Orion',
    rows: [displayRow()],
    totals,
    workspaceName: 'Acme',
    ...overrides,
  };
}

describe('buildReportPdfDocument', () => {
  it('builds a schema-valid document with masthead, columns, and totals', () => {
    const doc = buildReportPdfDocument(buildParams());

    expect(doc.masthead).toEqual({ tag: 'TIME REPORT', wordmark: 'GiTiempo' });
    expect(doc.columns).toEqual(['NAME', 'HOURS', 'BILLABLE', 'BILL %']);
    expect(doc.title).toBe('Time report');
    // Totals reuse the on-screen formatting (5400s → 1h 30m, 3600s → 1h 00m).
    expect(doc.total).toEqual({
      billable: '1h 00m',
      hours: '1h 30m',
      label: 'Total',
      share: '50%',
    });
    // The output must satisfy the contract the backend renderer enforces.
    expect(() => reportDocumentSchema.parse(doc)).not.toThrow();
  });

  it('renders the period and filters line from the selected scope', () => {
    const doc = buildReportPdfDocument(buildParams());
    const grouping = (['project', 'member'] satisfies ReportGrouping)
      .map((dimension) => reportGroupingDimensionLabels[dimension])
      .join(' › ');

    expect(doc.period).toContain(' · Acme');
    expect(doc.period).toContain('–');
    expect(doc.filters).toBe(
      `Projects: Project Orion · Members: All · Grouping: ${grouping}`,
    );
  });

  it('falls back to the workspace name when no date range is set', () => {
    const doc = buildReportPdfDocument(buildParams({ dateRange: null }));

    expect(doc.period).toBe('Acme');
  });

  it('maps display rows to document rows preserving hierarchy', () => {
    const doc = buildReportPdfDocument(
      buildParams({
        rows: [
          displayRow({
            childCountLabel: '2 members',
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
      }),
    );

    expect(doc.rows).toEqual([
      {
        billable: '1h 00m',
        detail: '2 members',
        hours: '1h 30m',
        isLeaf: false,
        label: 'Project Orion',
        level: 0,
        share: '50%',
      },
      {
        billable: '1h 00m',
        detail: null,
        hours: '1h 30m',
        isLeaf: true,
        label: 'Alex Admin',
        level: 1,
        share: '50%',
      },
    ]);
  });

  it('summarises tracked and billable stats from the totals', () => {
    const doc = buildReportPdfDocument(buildParams());

    expect(doc.stats).toEqual([
      { label: 'TRACKED HOURS', value: '1h 30m' },
      { label: 'BILLABLE', value: '1h 00m · 50%' },
    ]);
    expect(doc.footerNote).toContain('GiTiempo');
  });
});
