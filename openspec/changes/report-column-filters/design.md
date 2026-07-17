## Context

`ReportTableFilters` (Zod schema in `apps/admin-web/src/validation/report-view-model.ts`) currently holds `projectId`, `memberId`, `hours`, `billable`, and `global`. `filterReportRows` filters loaded leaf rows; `ReportsTable.vue` renders the filter row under the column heads and a mobile filter grid. The approved design adds filters under Entries, Billable %, and Last activity with fixed option sets (see the "Report Filter Menus Spec" frame in GITiempo.pen). Per `apps/admin-web/AGENTS.md`, controls use PrimeVue `Select` with the existing filter-row treatment.

## Goals / Non-Goals

**Goals:**

- `entries` (`any | gte1 | gte10 | gte50`), `billableShare` (`any | below50 | gte50 | gte90`), and `activity` (`any | today | last7 | last30`) filters, desktop and mobile.
- Export blocking extends to the new filters (they have no CSV equivalent, same as hours/billable/search).

**Non-Goals:**

- Backend filtering, contract changes, or free-form numeric/date inputs — the design fixes preset options.
- Filtering nested (non-top-level) tree nodes independently — a qualifying group keeps its whole subtree.

## Decisions

- **Aggregate filters compare displayed top-level group totals** (revised during implementation): the primary rows show group subtotals, so testing invisible leaf aggregates could never match the on-screen numbers (a project displaying "7 entries" is built from leaves of one or two). `filterReportTreeGroups(nodes, filters, now)` keeps top-level groups whose own totals satisfy every aggregate filter (entries, hours, billable, billable %, activity) and preserves their subtrees; `sumReportTreeTotals` feeds the total row from the visible groups. Identity filters and global search stay leaf-level in `filterReportRows`.
- **`filterReportTreeGroups` takes an optional `now`** (default `new Date()`) so the activity filter is deterministic in tests. "Today" means the local calendar day of `now`; "Last 7/30 days" means `lastStartedAt >= now - 7/30 days`.
- **Blocked-export rule stays one sentence**: any of `hours`, `billable`, `entries`, `billableShare`, `activity`, or `global` being active blocks the CSV with the existing message (extended wording: "Search and column filters…"). The member-filter/grouping rule is untouched.

## Risks / Trade-offs

- [Timezone edges on "Today"] → local-day comparison via the same date helpers the app already uses (`getLocalDateKey`), matching how users read the Last activity column (`formatLocalCalendarDate`).
- [Filter row width creep] → controls reuse the compact 12px select treatment already present for hours/billable; column widths are unchanged.

## Planned file changes

**apps/admin-web**

- `src/validation/report-view-model.ts`: new filter enums + `reportTableFiltersSchema` fields, default filters, `getReportExportBlockedReason` update.
- `src/lib/report-view-model.ts`: `filterReportRows` logic + `now` parameter; `report-view-model.spec.ts`.
- `src/components/reports/ReportsTable.vue`: option lists and selects under Entries, Billable %, Last activity (desktop filter row + mobile grid); `ReportsTable.spec.ts`.
- `src/views/ReportsView.spec.ts`: extend export-blocking case if a new filter is exercised.
- `docs/ui/pages-admin.md`: filter list update.
