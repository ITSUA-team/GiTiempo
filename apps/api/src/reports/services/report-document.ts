import type {
  TimeReportEffectiveDateRange,
  TimeReportGroupBy,
  TimeReportGroupByPath,
  TimeReportTotals,
} from '@gitiempo/shared';

/**
 * What the exported report *says*, independent of how it is drawn. Every value
 * here is already formatted for display, so a renderer only has to decide
 * typography, colour, and layout — see `report-pdf.ts` for the pdfmake adapter.
 *
 * Keeping this layer free of pdfmake means the report's wording, grouping, and
 * arithmetic are testable without producing a document.
 */

/** Bucket key for leaves missing identity on the grouped dimension. */
const MISSING_KEY = '∅';
const MISSING_LABEL = '—';

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

/** One node of the grouping tree, with the subtotals of its whole subtree. */
export interface ReportGroupNode {
  label: string;
  level: number;
  isLeaf: boolean;
  childCountLabel: string | null;
  totalSeconds: number;
  billableSeconds: number;
}

export interface ReportDocumentStat {
  label: string;
  value: string;
}

export interface ReportDocumentRow {
  /** Secondary text beside the label, e.g. "2 members". */
  detail: string | null;
  label: string;
  /** Depth in the grouping path; drives indentation. */
  level: number;
  isLeaf: boolean;
  hours: string;
  billable: string;
  share: string;
}

export interface ReportDocumentTotal {
  label: string;
  hours: string;
  billable: string;
  share: string;
}

export interface ReportDocument {
  masthead: { wordmark: string; tag: string };
  title: string;
  /** Date window and workspace, e.g. "May 1, 2026 – Jun 1, 2026 · GI Tiempo". */
  period: string;
  /** Applied filters and the grouping path. */
  filters: string;
  stats: ReportDocumentStat[];
  columns: string[];
  rows: ReportDocumentRow[];
  total: ReportDocumentTotal;
  footerNote: string;
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

export function formatHoursMinutes(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

export function formatShare(
  billableSeconds: number,
  totalSeconds: number,
): string {
  if (totalSeconds <= 0) return '0%';
  return `${Math.round((billableSeconds / totalSeconds) * 100)}%`;
}

export function formatDate(value: string | Date): string {
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

interface ReportLevel {
  /** Distinct groups at this level — the direct child count of the parent. */
  groupCount: number;
  nodes: ReportGroupNode[];
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
): ReportLevel {
  const dimension = groupBy[level];
  if (dimension === undefined || leaves.length === 0) {
    return { groupCount: 0, nodes: [] };
  }

  const childDimension = groupBy[level + 1];
  const entries = [...groupLeavesBy(leaves, dimension).values()].map(
    (groupLeaves) => {
      const child = buildLevel(groupLeaves, groupBy, level + 1);
      const node: ReportGroupNode = {
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
export function flattenReportNodes(
  leaves: ReportPdfLeaf[],
  groupBy: TimeReportGroupByPath,
  level = 0,
): ReportGroupNode[] {
  return buildLevel(leaves, groupBy, level).nodes;
}

// --- document assembly ---------------------------------------------------

function buildPeriod(input: ReportPdfInput): string {
  return `${formatDate(input.dateRange.dateFrom)} – ${formatDate(
    input.dateRange.dateTo,
  )} · ${input.workspaceName}`;
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

function buildStats(summary: TimeReportTotals): ReportDocumentStat[] {
  return [
    { label: 'TRACKED HOURS', value: formatHoursMinutes(summary.totalSeconds) },
    {
      label: 'BILLABLE',
      value: `${formatHoursMinutes(summary.billableSeconds)} · ${formatShare(
        summary.billableSeconds,
        summary.totalSeconds,
      )}`,
    },
  ];
}

function toRow(node: ReportGroupNode): ReportDocumentRow {
  return {
    billable: formatHoursMinutes(node.billableSeconds),
    detail: node.childCountLabel,
    hours: formatHoursMinutes(node.totalSeconds),
    isLeaf: node.isLeaf,
    label: node.label,
    level: node.level,
    share: formatShare(node.billableSeconds, node.totalSeconds),
  };
}

export function buildReportDocument(input: ReportPdfInput): ReportDocument {
  const { summary } = input;

  return {
    columns: ['NAME', 'HOURS', 'BILLABLE', 'BILL %'],
    filters: buildFiltersLine(input),
    footerNote: `Generated with GiTiempo · ${formatDate(input.generatedAt)}`,
    masthead: { tag: 'TIME REPORT', wordmark: 'GiTiempo' },
    period: buildPeriod(input),
    rows: flattenReportNodes(input.leaves, input.groupBy).map(toRow),
    stats: buildStats(summary),
    title: 'Time report',
    total: {
      billable: formatHoursMinutes(summary.billableSeconds),
      hours: formatHoursMinutes(summary.totalSeconds),
      label: 'Total',
      share: formatShare(summary.billableSeconds, summary.totalSeconds),
    },
  };
}
