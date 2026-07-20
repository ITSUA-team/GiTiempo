import { describe, expect, it } from 'vitest';
import {
  buildTimeReportPdfDefinition,
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

  it('tints top-level group rows and indents nested rows', () => {
    const definition = buildTimeReportPdfDefinition(input) as {
      content: {
        table?: { body: { fillColor?: string; margin?: number[] }[][] };
      }[];
    };
    const table = definition.content.find(
      (section) => section.table && section.table.body.length > 1,
    );
    const [, groupRow, nestedRow] = table!.table!.body;

    expect(groupRow![0]!.fillColor).toBe('#F5F0FA');
    expect(groupRow![0]!.margin).toEqual([0, 0, 0, 0]);
    expect(nestedRow![0]!.fillColor).toBeUndefined();
    expect(nestedRow![0]!.margin).toEqual([12, 0, 0, 0]);
  });
});

describe('renderTimeReportPdf', () => {
  it('renders a real PDF document', async () => {
    const pdf = await renderTimeReportPdf(input);

    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(1500);
  });
});
