import { describe, expect, it } from 'vitest';
import type { ReportDocument } from '@gitiempo/shared';
import { renderReportDocument, renderReportDocumentPdf } from './report-pdf';

// The client builds the on-screen document and the server only styles it, so
// these cover the styling from a ready-made document rather than a re-query.
const document: ReportDocument = {
  columns: ['NAME', 'HOURS', 'BILLABLE', 'BILL %'],
  filters: 'Projects: All · Members: All · Grouping: Project › Member',
  footerNote: 'Generated with GiTiempo · May 21, 2026',
  masthead: { tag: 'TIME REPORT', wordmark: 'GiTiempo' },
  period: 'May 1, 2026 – Jun 1, 2026 · GI Tiempo',
  rows: [
    {
      billable: '1h 45m',
      detail: '2 members',
      hours: '3h 00m',
      isLeaf: false,
      label: 'Project Orion',
      level: 0,
      share: '58%',
    },
    {
      billable: '1h 00m',
      detail: null,
      hours: '1h 00m',
      isLeaf: true,
      label: 'Alex Admin',
      level: 1,
      share: '100%',
    },
  ],
  stats: [
    { label: 'TRACKED HOURS', value: '3h 15m' },
    { label: 'BILLABLE', value: '1h 45m · 58%' },
  ],
  title: 'Time report',
  total: { billable: '1h 45m', hours: '3h 15m', label: 'Total', share: '58%' },
};

describe('renderReportDocument', () => {
  it('composes the designed document sections from a client-built document', () => {
    const definition = renderReportDocument(document) as {
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
    const definition = renderReportDocument(document) as {
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

describe('renderReportDocumentPdf', () => {
  it('renders a real PDF from a client-built document', async () => {
    const pdf = await renderReportDocumentPdf(document);

    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(1500);
  });
});
