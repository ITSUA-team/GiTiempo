import PdfPrinter from 'pdfmake';
import type {
  TimeReportEffectiveDateRange,
  TimeReportGroupBy,
  TimeReportGroupByPath,
  TimeReportTotals,
} from '@gitiempo/shared';

/**
 * Styled PDF export following the approved "Report PDF Preview" design frame:
 * brand masthead, period and workspace, filters line, summary strip, the
 * grouped table with per-level subtotal rows, a total row, and page footers.
 * Uses the standard Helvetica family — the design's Inter is a webfont pdfmake
 * cannot embed without shipping font files (recorded design deviation).
 */

const BRAND = '#5D2B85';
const ACCENT_TINT = '#E8E1F5';
const TEXT_DARK = '#1A1A1A';
const TEXT_NESTED = '#555555';
const TEXT_MUTED = '#666666';
const DIVIDER = '#EEEEEE';
const GROUP_FILL = '#F5F0FA';

const FONT = {
  caption: 8,
  emphasis: 9.5,
  micro: 7.5,
  nested: 8.5,
  number: 9,
  stat: 14,
  title: 20,
  wordmark: 12,
} as const;

const A4_WIDTH = 595.28;
const PAGE_MARGIN_X = 48;
/** Name, hours, billable, bill % — shared by the body table and the total row. */
const COLUMN_WIDTHS = ['*', 70, 70, 50];
const INDENT_PER_LEVEL = 12;

/** Bucket key for leaves missing identity on the grouped dimension. */
const MISSING_KEY = '∅';
const MISSING_LABEL = '—';

/** pdfmake document nodes are untyped by the library. */
type PdfContent = Record<string, unknown>;

export interface ReportPdfLeaf {
  identity: Partial<Record<TimeReportGroupBy, { key: string; label: string }>>;
  totalSeconds: number;
  billableSeconds: number;
  lastStartedAt: string | null;
}

export interface ReportPdfInput {
  workspaceName: string;
  dateRange: TimeReportEffectiveDateRange;
  groupBy: TimeReportGroupByPath;
  summary: TimeReportTotals;
  leaves: ReportPdfLeaf[];
  filters: { projectLabel: string | null; memberLabel: string | null };
  generatedAt: Date;
}

interface ReportPdfNode {
  label: string;
  level: number;
  isLeaf: boolean;
  childCountLabel: string | null;
  totalSeconds: number;
  billableSeconds: number;
}

const dimensionNouns: Record<TimeReportGroupBy, string> = {
  project: 'project',
  task: 'task',
  user: 'member',
};

const dimensionTitles: Record<TimeReportGroupBy, string> = {
  project: 'Project',
  task: 'Task',
  user: 'Member',
};

function formatHoursMinutes(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

function formatShare(billableSeconds: number, totalSeconds: number): string {
  if (totalSeconds <= 0) return '0%';
  return `${Math.round((billableSeconds / totalSeconds) * 100)}%`;
}

function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatChildCount(count: number, dimension: TimeReportGroupBy): string {
  const noun = dimensionNouns[dimension];
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

// --- tree assembly -------------------------------------------------------

interface ReportPdfLevel {
  /** Distinct groups at this level — the direct child count of the parent. */
  groupCount: number;
  nodes: ReportPdfNode[];
}

function groupLeavesBy(
  leaves: ReportPdfLeaf[],
  dimension: TimeReportGroupBy,
): Map<string, ReportPdfLeaf[]> {
  const groups = new Map<string, ReportPdfLeaf[]>();
  for (const leaf of leaves) {
    const key = leaf.identity[dimension]?.key ?? MISSING_KEY;
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(leaf);
    } else {
      groups.set(key, [leaf]);
    }
  }
  return groups;
}

function sumSeconds(
  leaves: ReportPdfLeaf[],
  field: 'billableSeconds' | 'totalSeconds',
): number {
  return leaves.reduce((total, leaf) => total + leaf[field], 0);
}

function buildLevel(
  leaves: ReportPdfLeaf[],
  groupBy: TimeReportGroupByPath,
  level: number,
): ReportPdfLevel {
  const dimension = groupBy[level];
  if (dimension === undefined || leaves.length === 0) {
    return { groupCount: 0, nodes: [] };
  }

  const childDimension = groupBy[level + 1];
  const entries = [...groupLeavesBy(leaves, dimension).values()].map(
    (groupLeaves) => {
      const child = buildLevel(groupLeaves, groupBy, level + 1);
      const node: ReportPdfNode = {
        billableSeconds: sumSeconds(groupLeaves, 'billableSeconds'),
        childCountLabel:
          childDimension === undefined
            ? null
            : formatChildCount(child.groupCount, childDimension),
        isLeaf: childDimension === undefined,
        label: groupLeaves[0]!.identity[dimension]?.label ?? MISSING_LABEL,
        level,
        totalSeconds: sumSeconds(groupLeaves, 'totalSeconds'),
      };
      return { children: child.nodes, node };
    },
  );

  entries.sort(
    (a, b) =>
      b.node.totalSeconds - a.node.totalSeconds ||
      a.node.label.localeCompare(b.node.label),
  );

  return {
    groupCount: entries.length,
    nodes: entries.flatMap((entry) => [entry.node, ...entry.children]),
  };
}

/**
 * Folds path-granularity leaves into a flattened, depth-first node list with
 * per-level subtotals — the same shape the reports table renders when fully
 * expanded. Siblings order by tracked time, heaviest first.
 */
export function flattenReportPdfNodes(
  leaves: ReportPdfLeaf[],
  groupBy: TimeReportGroupByPath,
  level = 0,
): ReportPdfNode[] {
  return buildLevel(leaves, groupBy, level).nodes;
}

// --- document sections ---------------------------------------------------

function mutedLine(text: string, fontSize: number, top: number): PdfContent {
  return { color: TEXT_MUTED, fontSize, margin: [0, top, 0, 0], text };
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

function buildMasthead(): PdfContent {
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
                    color: BRAND,
                    fillColor: ACCENT_TINT,
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
            text: 'GiTiempo',
            width: 'auto',
          },
        ],
        width: '*',
      },
      {
        alignment: 'right',
        characterSpacing: 1.5,
        color: TEXT_MUTED,
        fontSize: FONT.caption,
        margin: [0, 8, 0, 0],
        text: 'TIME REPORT',
        width: 'auto',
      },
    ],
  };
}

function buildFiltersLine(input: ReportPdfInput): string {
  const parts = [
    `Projects: ${input.filters.projectLabel ?? 'All'}`,
    `Members: ${input.filters.memberLabel ?? 'All'}`,
    `Grouping: ${input.groupBy
      .map((dimension) => dimensionTitles[dimension])
      .join(' › ')}`,
  ];
  return parts.join(' · ');
}

function buildSummaryStrip(input: ReportPdfInput): PdfContent {
  const stats = [
    {
      label: 'TRACKED HOURS',
      value: formatHoursMinutes(input.summary.totalSeconds),
    },
    {
      label: 'BILLABLE',
      value: `${formatHoursMinutes(input.summary.billableSeconds)} · ${formatShare(
        input.summary.billableSeconds,
        input.summary.totalSeconds,
      )}`,
    },
  ];

  return {
    columnGap: 24,
    columns: stats.map((stat) => ({
      stack: [
        {
          characterSpacing: 0.8,
          color: TEXT_MUTED,
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

function buildHeaderRow(): PdfContent[] {
  const headerCell = (text: string, alignment: 'left' | 'right') => ({
    alignment,
    bold: true,
    characterSpacing: 0.6,
    color: TEXT_MUTED,
    fontSize: FONT.micro,
    margin: [0, 4, 0, 4],
    text,
  });

  return [
    headerCell('NAME', 'left'),
    headerCell('HOURS', 'right'),
    headerCell('BILLABLE', 'right'),
    headerCell('BILL %', 'right'),
  ];
}

function buildNodeRow(node: ReportPdfNode): PdfContent[] {
  const isGroupRow = node.level === 0 && !node.isLeaf;
  const fillColor = isGroupRow ? GROUP_FILL : undefined;

  const label: PdfContent[] = [
    {
      bold: node.level === 0,
      color: node.isLeaf && node.level > 0 ? TEXT_NESTED : TEXT_DARK,
      fontSize: node.level > 1 ? FONT.nested : FONT.emphasis,
      text: node.label,
    },
  ];
  if (node.childCountLabel) {
    label.push({
      color: TEXT_MUTED,
      fontSize: FONT.micro,
      text: `   ${node.childCountLabel}`,
    });
  }

  const numberCell = (text: string, muted = false): PdfContent => ({
    alignment: 'right',
    bold: node.level === 0,
    color: muted ? TEXT_MUTED : TEXT_DARK,
    fillColor,
    fontSize: FONT.number,
    text,
  });

  return [
    {
      fillColor,
      margin: [node.level * INDENT_PER_LEVEL, 0, 0, 0],
      text: label,
    },
    numberCell(formatHoursMinutes(node.totalSeconds)),
    numberCell(formatHoursMinutes(node.billableSeconds)),
    numberCell(formatShare(node.billableSeconds, node.totalSeconds), true),
  ];
}

function buildTable(nodes: ReportPdfNode[]): PdfContent {
  return {
    layout: {
      ...cellLayout(5),
      hLineColor: (index: number, tableNode: { table: { body: unknown[] } }) =>
        index <= 1 || index === tableNode.table.body.length
          ? TEXT_DARK
          : DIVIDER,
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
      body: [buildHeaderRow(), ...nodes.map(buildNodeRow)],
      headerRows: 1,
      widths: COLUMN_WIDTHS,
    },
  };
}

function buildTotalRow(input: ReportPdfInput): PdfContent {
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
      hLineColor: () => TEXT_DARK,
      hLineWidth: (index: number) => (index === 0 ? 1.2 : 0),
    },
    table: {
      body: [
        [
          cell('Total', { alignment: 'left' }),
          cell(formatHoursMinutes(input.summary.totalSeconds)),
          cell(formatHoursMinutes(input.summary.billableSeconds)),
          cell(
            formatShare(
              input.summary.billableSeconds,
              input.summary.totalSeconds,
            ),
            { color: TEXT_MUTED },
          ),
        ],
      ],
      widths: COLUMN_WIDTHS,
    },
  };
}

function buildFooter(
  input: ReportPdfInput,
): (currentPage: number, pageCount: number) => PdfContent {
  return (currentPage, pageCount) => ({
    columns: [
      {
        color: TEXT_MUTED,
        fontSize: FONT.micro,
        text: `Generated with GiTiempo · ${formatDate(input.generatedAt)}`,
      },
      {
        alignment: 'right',
        color: TEXT_MUTED,
        fontSize: FONT.micro,
        text: `Page ${currentPage} of ${pageCount}`,
      },
    ],
    margin: [PAGE_MARGIN_X, 12, PAGE_MARGIN_X, 0],
  });
}

export function buildTimeReportPdfDefinition(
  input: ReportPdfInput,
): Record<string, unknown> {
  const nodes = flattenReportPdfNodes(input.leaves, input.groupBy);
  const period = `${formatDate(input.dateRange.dateFrom)} – ${formatDate(
    input.dateRange.dateTo,
  )} · ${input.workspaceName}`;

  return {
    background: () => ({
      canvas: [{ color: BRAND, h: 6, type: 'rect', w: A4_WIDTH, x: 0, y: 0 }],
    }),
    content: [
      buildMasthead(),
      {
        bold: true,
        fontSize: FONT.title,
        margin: [0, 24, 0, 0],
        text: 'Time report',
      },
      mutedLine(period, FONT.emphasis, 5),
      mutedLine(buildFiltersLine(input), FONT.caption, 3),
      buildSummaryStrip(input),
      buildTable(nodes),
      buildTotalRow(input),
    ],
    defaultStyle: { color: TEXT_DARK, font: 'Helvetica', fontSize: 10 },
    footer: buildFooter(input),
    pageMargins: [PAGE_MARGIN_X, 42, PAGE_MARGIN_X, PAGE_MARGIN_X],
    pageSize: 'A4',
  };
}

const standardFonts = {
  Helvetica: {
    bold: 'Helvetica-Bold',
    bolditalics: 'Helvetica-BoldOblique',
    italics: 'Helvetica-Oblique',
    normal: 'Helvetica',
  },
};

export function renderTimeReportPdf(input: ReportPdfInput): Promise<Buffer> {
  const printer = new PdfPrinter(standardFonts);
  const document = printer.createPdfKitDocument(
    buildTimeReportPdfDefinition(input),
  );

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    document.on('data', (chunk) => chunks.push(chunk));
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);
    document.end();
  });
}
