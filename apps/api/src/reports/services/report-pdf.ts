import PdfPrinter from 'pdfmake';
import {
  buildReportDocument,
  type ReportDocument,
  type ReportDocumentRow,
  type ReportPdfInput,
} from './report-document';
import {
  COLOR,
  DEFAULT_FONT,
  FONT,
  PAGE,
  STANDARD_FONTS,
  TABLE,
} from './report-pdf-theme';

export type { ReportPdfInput, ReportPdfLeaf } from './report-document';

/**
 * Renders a `ReportDocument` as the approved "Report PDF Preview" design
 * frame: brand masthead, period and workspace, filters line, summary strip,
 * the grouped table with per-level subtotal rows, a total row, and page
 * footers. This module composes the page — the report's wording and arithmetic
 * live in `report-document.ts`, its design tokens in `report-pdf-theme.ts`.
 */

/** pdfmake document nodes are untyped by the library. */
type PdfContent = Record<string, unknown>;

function mutedLine(text: string, fontSize: number, top: number): PdfContent {
  return { color: COLOR.textMuted, fontSize, margin: [0, top, 0, 0], text };
}

/** Shared cell metrics for the body table and the total row. */
function cellLayout(paddingY: number): PdfContent {
  return {
    paddingBottom: () => paddingY,
    paddingLeft: () => 6,
    paddingRight: () => 6,
    paddingTop: () => paddingY,
    vLineWidth: () => 0,
  };
}

function buildMasthead(document: ReportDocument): PdfContent {
  return {
    columns: [
      {
        columns: [
          {
            layout: 'noBorders',
            table: {
              body: [
                [
                  {
                    alignment: 'center',
                    bold: true,
                    color: COLOR.brand,
                    fillColor: COLOR.accentTint,
                    fontSize: FONT.number,
                    margin: [0, 5, 0, 5],
                    text: 'GT',
                  },
                ],
              ],
              widths: [24],
            },
            width: 'auto',
          },
          {
            bold: true,
            fontSize: FONT.wordmark,
            margin: [8, 6, 0, 0],
            text: document.masthead.wordmark,
            width: 'auto',
          },
        ],
        width: '*',
      },
      {
        alignment: 'right',
        characterSpacing: 1.5,
        color: COLOR.textMuted,
        fontSize: FONT.caption,
        margin: [0, 8, 0, 0],
        text: document.masthead.tag,
        width: 'auto',
      },
    ],
  };
}

function buildSummaryStrip(document: ReportDocument): PdfContent {
  return {
    columnGap: 24,
    columns: document.stats.map((stat) => ({
      stack: [
        {
          characterSpacing: 0.8,
          color: COLOR.textMuted,
          fontSize: FONT.micro,
          text: stat.label,
        },
        {
          bold: true,
          fontSize: FONT.stat,
          margin: [0, 3, 0, 0],
          text: stat.value,
        },
      ],
      width: 'auto',
    })),
    margin: [0, 18, 0, 0],
  };
}

function buildHeaderRow(columns: string[]): PdfContent[] {
  return columns.map((label, index) => ({
    alignment: index === 0 ? 'left' : 'right',
    bold: true,
    characterSpacing: 0.6,
    color: COLOR.textMuted,
    fontSize: FONT.micro,
    margin: [0, 4, 0, 4],
    text: label,
  }));
}

function buildNodeRow(row: ReportDocumentRow): PdfContent[] {
  const isGroupRow = row.level === 0 && !row.isLeaf;
  const fillColor = isGroupRow ? COLOR.groupFill : undefined;

  const label: PdfContent[] = [
    {
      bold: row.level === 0,
      color: row.isLeaf && row.level > 0 ? COLOR.textNested : COLOR.textDark,
      fontSize: row.level > 1 ? FONT.nested : FONT.emphasis,
      text: row.label,
    },
  ];
  if (row.detail) {
    label.push({
      color: COLOR.textMuted,
      fontSize: FONT.micro,
      text: `   ${row.detail}`,
    });
  }

  const numberCell = (text: string, muted = false): PdfContent => ({
    alignment: 'right',
    bold: row.level === 0,
    color: muted ? COLOR.textMuted : COLOR.textDark,
    fillColor,
    fontSize: FONT.number,
    text,
  });

  return [
    {
      fillColor,
      margin: [row.level * TABLE.indentPerLevel, 0, 0, 0],
      text: label,
    },
    numberCell(row.hours),
    numberCell(row.billable),
    numberCell(row.share, true),
  ];
}

function buildTable(document: ReportDocument): PdfContent {
  return {
    layout: {
      ...cellLayout(5),
      hLineColor: (index: number, tableNode: { table: { body: unknown[] } }) =>
        index <= 1 || index === tableNode.table.body.length
          ? COLOR.textDark
          : COLOR.divider,
      // Rule under the header; the total row supplies the closing rule.
      hLineWidth: (
        index: number,
        tableNode: { table: { body: unknown[] } },
      ) => {
        if (index === 1) return 1;
        if (index === tableNode.table.body.length) return 0;
        return 0.5;
      },
    },
    margin: [0, 18, 0, 0],
    table: {
      body: [
        buildHeaderRow(document.columns),
        ...document.rows.map(buildNodeRow),
      ],
      headerRows: 1,
      widths: TABLE.columnWidths,
    },
  };
}

function buildTotalRow(document: ReportDocument): PdfContent {
  const cell = (text: string, options: PdfContent = {}) => ({
    alignment: 'right',
    bold: true,
    fontSize: FONT.emphasis,
    text,
    ...options,
  });

  return {
    layout: {
      ...cellLayout(6),
      hLineColor: () => COLOR.textDark,
      hLineWidth: (index: number) => (index === 0 ? 1.2 : 0),
    },
    table: {
      body: [
        [
          cell(document.total.label, { alignment: 'left' }),
          cell(document.total.hours),
          cell(document.total.billable),
          cell(document.total.share, { color: COLOR.textMuted }),
        ],
      ],
      widths: TABLE.columnWidths,
    },
  };
}

function buildFooter(
  document: ReportDocument,
): (currentPage: number, pageCount: number) => PdfContent {
  return (currentPage, pageCount) => ({
    columns: [
      {
        color: COLOR.textMuted,
        fontSize: FONT.micro,
        text: document.footerNote,
      },
      {
        alignment: 'right',
        color: COLOR.textMuted,
        fontSize: FONT.micro,
        text: `Page ${currentPage} of ${pageCount}`,
      },
    ],
    margin: [PAGE.marginX, 12, PAGE.marginX, 0],
  });
}

/** Turns a report document into a pdfmake document definition. */
export function renderReportDocument(
  document: ReportDocument,
): Record<string, unknown> {
  return {
    background: () => ({
      canvas: [
        {
          color: COLOR.brand,
          h: PAGE.accentBarHeight,
          type: 'rect',
          w: PAGE.width,
          x: 0,
          y: 0,
        },
      ],
    }),
    content: [
      buildMasthead(document),
      {
        bold: true,
        fontSize: FONT.title,
        margin: [0, 24, 0, 0],
        text: document.title,
      },
      mutedLine(document.period, FONT.emphasis, 5),
      mutedLine(document.filters, FONT.caption, 3),
      buildSummaryStrip(document),
      buildTable(document),
      buildTotalRow(document),
    ],
    defaultStyle: {
      color: COLOR.textDark,
      font: DEFAULT_FONT,
      fontSize: FONT.base,
    },
    footer: buildFooter(document),
    pageMargins: [
      PAGE.marginX,
      PAGE.marginTop,
      PAGE.marginX,
      PAGE.marginBottom,
    ],
    pageSize: PAGE.size,
  };
}

export function buildTimeReportPdfDefinition(
  input: ReportPdfInput,
): Record<string, unknown> {
  return renderReportDocument(buildReportDocument(input));
}

function definitionToPdfBuffer(
  definition: Record<string, unknown>,
): Promise<Buffer> {
  const printer = new PdfPrinter(STANDARD_FONTS);
  const document = printer.createPdfKitDocument(definition);

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    document.on('data', (chunk) => chunks.push(chunk));
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);
    document.end();
  });
}

export function renderTimeReportPdf(input: ReportPdfInput): Promise<Buffer> {
  return definitionToPdfBuffer(buildTimeReportPdfDefinition(input));
}

// Renders a pre-built, validated document — the WYSIWYG export path where the
// client computed the on-screen report and the server only styles it.
export function renderReportDocumentPdf(
  document: ReportDocument,
): Promise<Buffer> {
  return definitionToPdfBuffer(renderReportDocument(document));
}
