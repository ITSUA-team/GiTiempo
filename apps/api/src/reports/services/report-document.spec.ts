import { describe, expect, it } from 'vitest';
import {
  buildReportDocument,
  flattenReportNodes,
  type ReportPdfInput,
  type ReportPdfLeaf,
} from './report-document';

const projectOrion = { key: 'p1', label: 'Project Orion' };
const projectBilling = { key: 'p2', label: 'Billing API' };
const alex = { key: 'u1', label: 'Alex Admin' };
const nina = { key: 'u2', label: 'Nina PM' };

function makeLeaf(overrides: Partial<ReportPdfLeaf>): ReportPdfLeaf {
  return {
    billableSeconds: 3600,
    identity: { project: projectOrion, user: alex },
    lastStartedAt: '2026-05-02T10:00:00.000Z',
    totalSeconds: 3600,
    ...overrides,
  };
}

const leaves: ReportPdfLeaf[] = [
  makeLeaf({}),
  makeLeaf({
    billableSeconds: 1800,
    identity: { project: projectOrion, user: nina },
    totalSeconds: 7200,
  }),
  makeLeaf({
    billableSeconds: 900,
    identity: { project: projectBilling, user: nina },
    totalSeconds: 900,
  }),
];

const input: ReportPdfInput = {
  dateRange: {
    dateFrom: '2026-05-01T00:00:00.000Z',
    dateTo: '2026-06-01T00:00:00.000Z',
  },
  filters: { memberLabel: null, projectLabel: null },
  generatedAt: new Date('2026-05-21T12:00:00.000Z'),
  groupBy: ['project', 'user'],
  leaves,
  summary: {
    billableSeconds: 6300,
    billableShare: 6300 / 11700,
    entryCount: 5,
    nonBillableSeconds: 5400,
    totalSeconds: 11700,
  },
  workspaceName: 'GI Tiempo',
};

describe('flattenReportNodes', () => {
  it('emits depth-first nodes with per-level subtotals, heaviest first', () => {
    const nodes = flattenReportNodes(leaves, ['project', 'user']);

    expect(
      nodes.map((node) => [node.level, node.label, node.totalSeconds]),
    ).toEqual([
      [0, 'Project Orion', 10800],
      [1, 'Nina PM', 7200],
      [1, 'Alex Admin', 3600],
      [0, 'Billing API', 900],
      [1, 'Nina PM', 900],
    ]);
    expect(nodes[0]!.childCountLabel).toBe('2 members');
    expect(nodes[3]!.childCountLabel).toBe('1 member');
    expect(nodes[1]!.isLeaf).toBe(true);
  });

  it('builds single-level nodes as leaves', () => {
    const nodes = flattenReportNodes(leaves, ['user']);

    expect(nodes.map((node) => node.label)).toEqual(['Nina PM', 'Alex Admin']);
    expect(nodes.every((node) => node.isLeaf)).toBe(true);
    expect(nodes[0]!.totalSeconds).toBe(8100);
  });

  it('falls back to a placeholder label for leaves missing identity', () => {
    const nodes = flattenReportNodes([makeLeaf({ identity: {} })], ['project']);

    expect(nodes.map((node) => node.label)).toEqual(['—']);
  });

  it('returns nothing for an empty leaf set', () => {
    expect(flattenReportNodes([], ['project'])).toEqual([]);
  });
});

describe('buildReportDocument', () => {
  it('states the report heading, period, and filters', () => {
    const document = buildReportDocument(input);

    expect(document.title).toBe('Time report');
    expect(document.masthead).toEqual({
      tag: 'TIME REPORT',
      wordmark: 'GiTiempo',
    });
    expect(document.period).toBe('May 1, 2026 – Jun 1, 2026 · GI Tiempo');
    expect(document.filters).toBe(
      'Projects: All · Members: All · Grouping: Project › Member',
    );
    expect(document.footerNote).toBe('Generated with GiTiempo · May 21, 2026');
  });

  it('names the applied project and member filters', () => {
    const document = buildReportDocument({
      ...input,
      filters: { memberLabel: 'Nina PM', projectLabel: 'Project Orion' },
    });

    expect(document.filters).toBe(
      'Projects: Project Orion · Members: Nina PM · Grouping: Project › Member',
    );
  });

  it('formats the summary strip as hours and billable share', () => {
    expect(buildReportDocument(input).stats).toEqual([
      { label: 'TRACKED HOURS', value: '3h 15m' },
      { label: 'BILLABLE', value: '1h 45m · 54%' },
    ]);
  });

  it('formats rows with subtotals, detail, and depth', () => {
    const { columns, rows } = buildReportDocument(input);

    expect(columns).toEqual(['NAME', 'HOURS', 'BILLABLE', 'BILL %']);
    expect(rows[0]).toEqual({
      billable: '1h 30m',
      detail: '2 members',
      hours: '3h 00m',
      isLeaf: false,
      label: 'Project Orion',
      level: 0,
      share: '50%',
    });
    expect(rows[1]).toMatchObject({ isLeaf: true, level: 1, label: 'Nina PM' });
  });

  it('sums the total row from the report summary, not the visible rows', () => {
    expect(buildReportDocument(input).total).toEqual({
      billable: '1h 45m',
      hours: '3h 15m',
      label: 'Total',
      share: '54%',
    });
  });

  it('reports a zero share when no time is tracked', () => {
    const document = buildReportDocument({
      ...input,
      leaves: [],
      summary: {
        billableSeconds: 0,
        billableShare: null,
        entryCount: 0,
        nonBillableSeconds: 0,
        totalSeconds: 0,
      },
    });

    expect(document.rows).toEqual([]);
    expect(document.total).toEqual({
      billable: '0h 00m',
      hours: '0h 00m',
      label: 'Total',
      share: '0%',
    });
  });
});
