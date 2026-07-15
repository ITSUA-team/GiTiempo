## Why

The admin Reports page carries a four-field setup bar (project, member, date range, group-by) above the summary cards whose only job is to scope the CSV export. It costs a full row of vertical space, visually reads as a table filter bar while deliberately not filtering the table, and duplicates the project and member controls the results table already offers. Collapsing reporting down to one date range plus one `Export CSV` action next to the table search makes the page state legible: what you filter is what you see, and what you see is what you export.

## What Changes

- Remove the project, member, and group-by report setup controls from the reports page, along with the setup bar that hosts them.
- Move the date range control into the results table header, alongside the global search field and the `Export CSV` action.
- **BREAKING** The date range becomes a report filter rather than export-only scope: changing it refetches report data, so results rows and summary cards update to match. It continues to scope the CSV.
- **BREAKING** CSV export scope is reduced to the active date range. Every export covers all visible projects, all members, and groups by project. Callers can no longer choose grouping, restrict the export to one member, or target a single project.
- **BREAKING** Admins lose the ability to export a project that is inactive or has zero tracked hours. That relied on explicitly selecting the project in the setup bar; the table's project filter cannot substitute, because a project with no rows never appears in the loaded data.
- Update the reports loading skeleton so it mirrors the new header instead of the removed setup bar.
- Keep the results table's own discovery controls (global search, project/member/hours/billable column filters) unchanged and still table-only.

## Capabilities

### New Capabilities

None. This change reshapes an existing surface rather than introducing a new one.

### Modified Capabilities

- `admin-pages`: The `Reports Generation And Export` requirement changes. The reporting surface no longer renders project, member, or group-by setup controls; the date range moves into the table header and now drives report fetching and summary totals instead of acting purely as export scope; CSV export scope narrows to the date range; and the scenario covering explicit export of inactive or empty projects is removed. The skeleton scenario changes with the removed setup bar, and the PM-scope scenario narrows to the controls that remain.

## Impact

Frontend only. No backend, shared contract, database, migration, or OpenAPI changes are required: every field on `timeReportExportQuerySchema` and `timeReportQuerySchema` in `packages/shared/src/contracts/reports.ts` is already optional, and `groupBy` already defaults to `project`.

Affected code in `apps/admin-web`:

- `src/views/ReportsView.vue` — drops the setup form, its local setup state, and passes export handling to the table header.
- `src/components/reports/ReportsFilterForm.vue` — removed, along with `ReportsFilterForm.spec.ts`.
- `src/components/reports/ReportsTable.vue` — gains the date range control and hosts the `Export CSV` action in its header.
- `src/composables/reports/useReportsData.ts` — wires in `useReportRefreshDebounce`, which exists but is currently imported nowhere, so date range edits reach `appliedFilters`.
- `src/composables/reports/useReportFilters.ts` — setup state narrows to the date range.
- `src/components/loading/ManagementPageSkeleton.vue` — the `reports` variant loses its filter-bar block.
- `src/views/ReportsView.spec.ts` — the `keeps header setup controls as export scope instead of table state` case asserts the behaviour this change reverses and must be rewritten.

Affected shared code:

- `packages/web-shared/src/validation/report-filter-form.ts` — `reportFilterFormSchema` loses the fields backing the removed controls; `normalizeReportDateRangeValue` stays in use.

Design: `GITiempo.pen` already reflects the target `Admin Reports` layout.
