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
const TEXT_MUTED = '#666666';
const DIVIDER = '#EEEEEE';
const GROUP_FILL = '#F5F0FA';
const A4_WIDTH = 595.28;

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
  const dimension = groupBy[level];
  if (dimension === undefined || leaves.length === 0) {
    return [];
  }

  const isLeafLevel = level === groupBy.length - 1;
  const groups = new Map<string, ReportPdfLeaf[]>();
  for (const leaf of leaves) {
    const key = leaf.identity[dimension]?.key ?? '∅';
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(leaf);
    } else {
      groups.set(key, [leaf]);
    }
  }

  const nodes = [...groups.values()].map((groupLeaves) => {
    const first = groupLeaves[0]!;
    const totals = groupLeaves.reduce(
      (acc, leaf) => ({
        billableSeconds: acc.billableSeconds + leaf.billableSeconds,
        totalSeconds: acc.totalSeconds + leaf.totalSeconds,
      }),
      { billableSeconds: 0, totalSeconds: 0 },
    );
    const children = isLeafLevel
      ? []
      : flattenReportPdfNodes(groupLeaves, groupBy, level + 1);
    const childDimension = groupBy[level + 1];
    const directChildren = children.filter(
      (child) => child.level === level + 1,
    ).length;

    return {
      children,
      node: {
        ...totals,
        childCountLabel:
          childDimension === undefined
            ? null
            : formatChildCount(directChildren, childDimension),
        isLeaf: isLeafLevel,
        label: first.identity[dimension]?.label ?? '—',
        level,
      },
    };
  });

  return nodes
    .sort(
      (a, b) =>
        b.node.totalSeconds - a.node.totalSeconds ||
        a.node.label.localeCompare(b.node.label),
    )
    .flatMap((entry) => [entry.node, ...entry.children]);
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

function buildSummaryStrip(input: ReportPdfInput): Record<string, unknown> {
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
          fontSize: 7.5,
          text: stat.label,
        },
        { bold: true, fontSize: 14, margin: [0, 3, 0, 0], text: stat.value },
      ],
      width: 'auto',
    })),
    margin: [0, 18, 0, 0],
  };
}

function buildTable(nodes: ReportPdfNode[]): Record<string, unknown> {
  const headerCell = (text: string, alignment: 'left' | 'right') => ({
    alignment,
    bold: true,
    characterSpacing: 0.6,
    color: TEXT_MUTED,
    fontSize: 7.5,
    margin: [0, 4, 0, 4],
    text,
  });

  const body: Record<string, unknown>[][] = [
    [
      headerCell('NAME', 'left'),
      headerCell('HOURS', 'right'),
      headerCell('BILLABLE', 'right'),
      headerCell('BILL %', 'right'),
    ],
  ];

  for (const node of nodes) {
    const isGroupRow = node.level === 0 && !node.isLeaf;
    const fillColor = isGroupRow ? GROUP_FILL : undefined;
    const nameText: Record<string, unknown>[] = [
      {
        bold: node.level === 0,
        color: node.isLeaf && node.level > 0 ? '#555555' : TEXT_DARK,
        fontSize: node.level > 1 ? 8.5 : 9.5,
        text: node.label,
      },
    ];
    if (node.childCountLabel) {
      nameText.push({
        color: TEXT_MUTED,
        fontSize: 7.5,
        text: `   ${node.childCountLabel}`,
      });
    }
    const numberCell = (text: string, muted = false) => ({
      alignment: 'right',
      bold: node.level === 0,
      color: muted ? TEXT_MUTED : TEXT_DARK,
      fillColor,
      fontSize: 9,
      text,
    });

    body.push([
      { fillColor, margin: [node.level * 12, 0, 0, 0], text: nameText },
      numberCell(formatHoursMinutes(node.totalSeconds)),
      numberCell(formatHoursMinutes(node.billableSeconds)),
      numberCell(formatShare(node.billableSeconds, node.totalSeconds), true),
    ]);
  }

  return {
    layout: {
      hLineColor: (index: number, tableNode: { table: { body: unknown[] } }) =>
        index <= 1 || index === tableNode.table.body.length
          ? TEXT_DARK
          : DIVIDER,
      hLineWidth: (
        index: number,
        tableNode: { table: { body: unknown[] } },
      ) => {
        if (index === 1) return 1;
        if (index === tableNode.table.body.length) return 0;
        return 0.5;
      },
      paddingBottom: () => 5,
      paddingLeft: () => 6,
      paddingRight: () => 6,
      paddingTop: () => 5,
      vLineWidth: () => 0,
    },
    margin: [0, 18, 0, 0],
    table: {
      body,
      headerRows: 1,
      widths: ['*', 70, 70, 50],
    },
  };
}

function buildTotalRow(input: ReportPdfInput): Record<string, unknown> {
  const cell = (text: string, options: Record<string, unknown> = {}) => ({
    alignment: 'right',
    bold: true,
    fontSize: 9.5,
    text,
    ...options,
  });

  return {
    layout: {
      hLineColor: () => TEXT_DARK,
      hLineWidth: (index: number) => (index === 0 ? 1.2 : 0),
      paddingBottom: () => 6,
      paddingLeft: () => 6,
      paddingRight: () => 6,
      paddingTop: () => 6,
      vLineWidth: () => 0,
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
      widths: ['*', 70, 70, 50],
    },
  };
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
      {
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
                        fontSize: 9,
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
                fontSize: 12,
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
            fontSize: 8,
            margin: [0, 8, 0, 0],
            text: 'TIME REPORT',
            width: 'auto',
          },
        ],
      },
      {
        bold: true,
        fontSize: 20,
        margin: [0, 24, 0, 0],
        text: 'Time report',
      },
      { color: TEXT_MUTED, fontSize: 9.5, margin: [0, 5, 0, 0], text: period },
      {
        color: TEXT_MUTED,
        fontSize: 8,
        margin: [0, 3, 0, 0],
        text: buildFiltersLine(input),
      },
      buildSummaryStrip(input),
      buildTable(nodes),
      buildTotalRow(input),
    ],
    defaultStyle: { color: TEXT_DARK, font: 'Helvetica', fontSize: 10 },
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        {
          color: TEXT_MUTED,
          fontSize: 7.5,
          text: `Generated with GiTiempo · ${formatDate(input.generatedAt)}`,
        },
        {
          alignment: 'right',
          color: TEXT_MUTED,
          fontSize: 7.5,
          text: `Page ${currentPage} of ${pageCount}`,
        },
      ],
      margin: [48, 12, 48, 0],
    }),
    pageMargins: [48, 42, 48, 48],
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
