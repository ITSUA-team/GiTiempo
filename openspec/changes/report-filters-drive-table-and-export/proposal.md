## Why

The redesigned Admin Reports header puts the date range and grouping controls directly beside the table's own search box, but neither actually touches the table. The date range never reaches the query, because the composable that promotes it (`useReportRefreshDebounce`) is imported nowhere. Grouping never reaches it either, because the row fetch hardcodes `groupBy: 'user'`. Both controls today only shape the CSV, and grouping barely does even that.

Controls sitting inside a table header read as filters for that table. Right now they silently do nothing to it, which reads as a bug. Make them mean what their placement promises: filter the results and scope the export.

## What Changes

- The date range drives report fetching. Editing it refetches, so results rows and summary totals update to match, and it continues to scope the CSV.
- Grouping drives the results table's row shape. Selecting a grouping changes what one row represents, and the table's columns and column filters follow that choice.
- Add `Project & Member` as a third grouping option and make it the default. It names the project-member breakdown the table already shows today, so the current view survives as the default rather than disappearing.
- `Project` groups to one row per project (Project, Hours, Billable columns). `Member` groups to one row per member (Member, Hours, Billable columns). The column filter for a hidden column is hidden and its filter state cleared.
- **BREAKING** Header controls stop being export-only scope. The requirement that loaded rows and summary cards do not change when a header control changes is reversed.
- **BREAKING** The results table is a project-member breakdown only under the default grouping. Under `Project` or `Member` it deliberately collapses one of those identities, which the current spec forbids outright.
- Grouping remains CSV metadata and does not collapse CSV row granularity. The export stays detailed project-task-user rows, per the contract set by `2026-07-09-clarify-detailed-report-csv-export`.
- Table-only discovery filters (global search, project/member/hours/billable columns) stay table-only and continue not to affect the CSV or the summary cards.

## Capabilities

### New Capabilities

None. This changes behaviour on an existing surface.

### Modified Capabilities

- `admin-pages`: The `Reports Generation And Export` requirement changes. The date range and grouping controls move into the results table header and now drive report fetching and row shape rather than acting purely as export scope. The project-member breakdown becomes conditional on the default grouping instead of guaranteed. The scenario covering explicit export of inactive or empty projects is removed with the project setup control, and the skeleton scenario changes with the removed setup bar.

## Impact

Frontend only. No backend, shared contract, database, migration, or OpenAPI changes:

- `timeReportQuerySchema` and `timeReportExportQuerySchema` in `packages/shared/src/contracts/reports.ts` already accept every field involved, all optional, with `groupBy` defaulting to `project`.
- `reports.service.ts` already treats `groupBy` on export as a CSV label column while always emitting detailed rows via `getDetailedRows`. That behaviour is deliberate and stays untouched.
- PM scope stays enforced server-side and is unchanged.

Affected code in `apps/admin-web`:

- `src/composables/reports/useReportsData.ts` — wires in the orphaned `useReportRefreshDebounce` so header edits reach `appliedFilters`.
- `src/composables/reports/useReportRowsData.ts` — the fetch stops hardcoding `groupBy: 'user'` and branches on the selected grouping.
- `src/composables/reports/useReportFilters.ts` — setup state narrows to date range and grouping.
- `src/lib/report-view-model.ts` and `src/validation/report-view-model.ts` — the row model and `toReportTableRows` gain the grouping dimension; `reportTableRowSchema` allows an absent project or member.
- `src/components/reports/ReportsTable.vue` — hosts the date range and grouping controls, derives columns from the grouping, and hosts the export action in its header.
- `src/views/ReportsView.vue` — drops `ReportsFilterForm` and binds to composable state instead of local copies.
- `src/components/reports/ReportsFilterForm.vue` — removed, with its spec.
- `src/components/loading/ManagementPageSkeleton.vue` — the `reports` variant loses its filter-bar block.
- `src/views/ReportsView.spec.ts` and `src/composables/reports/useReportsData.spec.ts` — both assert the export-only behaviour this change reverses and must be rewritten.

Affected shared code:

- `packages/web-shared/src/validation/report-filter-form.ts` — `reportFilterFormSchema` loses its consumer when the setup form goes; `normalizeReportDateRangeValue` stays in use.

Docs and design:

- `docs/ui/pages-admin.md:19-31` still describes the old setup bar and must be rewritten; `apps/admin-web/AGENTS.md` makes docs the source of truth over the design file.
- `GITiempo.pen` shows the redesigned header but reads `Group by: Project`; it needs to read `Group by: Project & Member` to match the new default.
