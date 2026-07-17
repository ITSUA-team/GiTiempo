import { describe, expect, it } from 'vitest';
import {
  buildTimeReportPdfDefinition,
  flattenReportPdfNodes,
  renderTimeReportPdf,
  type ReportPdfInput,
  type ReportPdfLeaf,
} from './report-pdf';

const projectOrion = { key: 'p1', label: 'Project Orion' };
const projectBilling = { key: 'p2', label: 'Billing API' };
const alex = { key: 'u1', label: 'Alex Admin' };
const nina = { key: 'u2', label: 'Nina PM' };

function makeLeaf(overrides: Partial<ReportPdfLeaf>): ReportPdfLeaf {
  return {
    billableSeconds: 3600,
    entryCount: 2,
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
    entryCount: 1,
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

describe('flattenReportPdfNodes', () => {
  it('emits depth-first nodes with per-level subtotals, heaviest first', () => {
    const nodes = flattenReportPdfNodes(leaves, ['project', 'user']);

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
    const nodes = flattenReportPdfNodes(leaves, ['user']);

    expect(nodes.map((node) => node.label)).toEqual(['Nina PM', 'Alex Admin']);
    expect(nodes.every((node) => node.isLeaf)).toBe(true);
    expect(nodes[0]!.totalSeconds).toBe(8100);
  });
});

describe('buildTimeReportPdfDefinition', () => {
  it('describes the designed document sections', () => {
    const definition = buildTimeReportPdfDefinition(input) as {
      content: unknown[];
      footer: (page: number, total: number) => { columns: { text: string }[] };
    };

    const flat = JSON.stringify(definition.content);
    expect(flat).toContain('GiTiempo');
    expect(flat).toContain('TIME REPORT');
    expect(flat).toContain('GI Tiempo');
    expect(flat).toContain('Grouping: Project › Member');
    expect(flat).toContain('Project Orion');
    expect(flat).toContain('3h 15m');
    expect(flat).toContain('Total');

    const footer = definition.footer(2, 3);
    expect(footer.columns[1]!.text).toBe('Page 2 of 3');
    expect(footer.columns[0]!.text).toContain('Generated with GiTiempo');
  });
});

describe('renderTimeReportPdf', () => {
  it('renders a real PDF document', async () => {
    const pdf = await renderTimeReportPdf(input);

    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(1500);
  });
});
