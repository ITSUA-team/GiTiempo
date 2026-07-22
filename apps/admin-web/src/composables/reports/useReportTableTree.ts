import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';

import {
  buildReportTree,
  filterReportTreeGroups,
  flattenReportTree,
  sumReportTreeTotals,
  type ReportDisplayRow,
  type ReportGrouping,
  type ReportRowTotals,
  type ReportTableFilters,
  type ReportTableRow,
} from '@/lib/report-view-model';

interface UseReportTableTreeOptions {
  rows: () => ReportTableRow[];
  grouping: () => ReportGrouping;
  filters: () => ReportTableFilters;
  // Injectable clock so the activity filter stays deterministic in tests.
  now?: () => Date;
}

export interface UseReportTableTreeResult {
  collapsedIds: Ref<Set<string>>;
  displayRows: ComputedRef<ReportDisplayRow[]>;
  totals: ComputedRef<ReportRowTotals>;
  toggleRowExpansion: (row: ReportDisplayRow) => void;
}

/**
 * Turns flat report rows into the expandable subtotal tree the table renders.
 *
 * Owns collapse state and the aggregate-filtered tree so `ReportsTable` stays a
 * composition shell. Aggregate filters (hours, billable, billable %, activity)
 * act on the tree's top-level groups so they compare the totals the rows
 * display, and a new grouping path invalidates the old collapsed node ids.
 */
export function useReportTableTree(
  options: UseReportTableTreeOptions,
): UseReportTableTreeResult {
  const collapsedIds = ref(new Set<string>());
  watch(
    () => options.grouping(),
    () => {
      collapsedIds.value = new Set();
    },
  );

  const reportTree = computed(() =>
    filterReportTreeGroups(
      buildReportTree(options.rows(), options.grouping()),
      options.filters(),
      options.now?.() ?? new Date(),
    ),
  );
  const displayRows = computed(() =>
    flattenReportTree(reportTree.value, collapsedIds.value),
  );
  const totals = computed(() => sumReportTreeTotals(reportTree.value));

  function toggleRowExpansion(row: ReportDisplayRow): void {
    const next = new Set(collapsedIds.value);
    if (next.has(row.id)) {
      next.delete(row.id);
    } else {
      next.add(row.id);
    }
    collapsedIds.value = next;
  }

  return { collapsedIds, displayRows, totals, toggleRowExpansion };
}
