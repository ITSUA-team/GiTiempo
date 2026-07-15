## Context

The Admin Reports header now carries date range, grouping, search, and `Export CSV` in one toolbar (`GITiempo.pen`, `Admin Reports`). Two of those four controls are decorative with respect to the table:

- **Date range** never reaches the query. `useReportFilters.applyCurrentFilters()` promotes working state into `appliedFilters` (the fetch's query key), and its only caller, `useReportRefreshDebounce.ts`, is imported nowhere — orphaned in `215b321`. `ReportsView.vue:56-59` compounds this by keeping local copies disconnected from the composable's refs.
- **Grouping** never reaches it either. `useReportRowsData.ts:76` hardcodes `groupBy: 'user'` on every request.

Both were deliberate: `admin-pages/spec.md:107` requires setup controls to leave loaded rows untouched, and `ReportsView.spec.ts:307` plus `useReportsData.spec.ts:370` lock it in. That contract made sense when the controls sat in their own bar. It stops making sense once they sit inside the table header.

Three constraints bound the solution:

- **The CSV must stay detailed.** `reports.service.ts:106-119` always builds export rows via `getDetailedRows`, and `toCsv` (`:521-542`) writes `groupBy` as a literal label column. The archived `2026-07-09-clarify-detailed-report-csv-export` states this explicitly — "Preserve selected `groupBy` as CSV metadata rather than using it to collapse CSV row granularity" — and says it exists to stop future agents "fixing" it back to grouped parity. Grouping therefore must not reshape the CSV.
- **The API has no project-and-member grouping.** `timeReportGroupBySchema` is `project | task | user`. Today's project-member table is a frontend construct: `useReportRowsData` loops visible projects and requests `groupBy: 'user'` per project, so each row carries a user from the response and a project from the loop.
- **`toReportTableRows` already collapses identities with placeholders.** `getReportTableRowLabels` (`report-view-model.ts:243-273`) substitutes `'Project scope'` / `'Member scope'` when the response omits an identity. Those placeholders are precisely what `spec.md:112` forbids, and are only unreachable today because the fetch always pairs `groupBy: 'user'` with a project id.

Per `apps/admin-web/AGENTS.md`, `docs/ui/*` is the source of truth over the design file, and the approved `.pen` screen is the design source for UI work.

## Goals / Non-Goals

**Goals:**

- Editing the date range refetches, updating rows and summary totals, and scopes the CSV.
- Selecting a grouping changes what a table row represents, with columns and column filters following.
- Preserve today's project-member breakdown as the default so no view is lost.
- Keep table discovery filters client-side and table-only.
- Keep PM scope enforced server-side.

**Non-Goals:**

- No backend, shared contract, database, migration, or OpenAPI changes.
- Not making grouping collapse CSV rows. That would reverse the archived detailed-export contract.
- Not making table search or column filters scope the CSV. `spec.md:150` stands.
- Not adding a date column to the table (see Decisions).
- Not revisiting pagination or the throttling guidance in `getReportErrorMessage`.

## Decisions

### Date range drives the fetch, via the composable that already exists

Import `useReportRefreshDebounce` in `useReportsData.ts`, passing `filters.applyCurrentFilters`, `filters.dateRange`, `rowsData.initialLoaded`, and an `onRefreshScheduled` setting `currentAction` to `refresh-reports`. It already watches the range by timestamp and debounces at 300ms. `ReportsView.vue` must bind to the composable's `dateRange` rather than a local copy, or the wiring is never reached.

`applyCurrentFilters` keeps its `isReportDateRangeValid` guard (`useReportFilters.ts:32`), so an end-before-start range calls no endpoint, and `getReportDateRangeError` keeps the export button disabled. `spec.md:121` is satisfied unchanged.

*Alternative rejected:* a fresh watcher in the view. The composable exists, is tested by the rewritten `useReportsData.spec.ts`, and owns the debounce.

### Date range stays a control, not a table column

`reportTableRowSchema` (`validation/report-view-model.ts:46-58`) has no date field: a row aggregates many entries. Carrying `firstStartedAt`/`lastStartedAt` through would not help, because a client-side column filter can only include or exclude whole rows, never re-total them — a row spanning Apr 1-30 filtered to Apr 10 would still report the month's hours. The range changes how totals are computed, so it must stay a server-side parameter.

### Grouping selects the fetch strategy

`useReportRowsData` branches on the applied grouping:

- **`projectAndMember` (default)** — loop visible projects, request `groupBy: 'user'` with each `projectId`, exactly as today. This is the only way to obtain both identities from the current API.
- **`project`** — one request with `groupBy: 'project'` and no project loop. Rows carry project identity directly, so the loop that exists to supply it is unnecessary.
- **`member`** — one request with `groupBy: 'user'` and no project id. The backend aggregates each user across visible projects; looping and merging client-side would be browser-side aggregation over data the backend already groups.

The two single-request modes are also markedly cheaper than the current N-projects-times-N-pages loop.

*Alternative rejected:* keep the loop for all modes and merge client-side for `member`. It duplicates work the backend does and reintroduces frontend aggregation.

### `Project & Member` is a UI grouping, and the default

The API has no combined grouping, so `projectAndMember` is a frontend concept that names the fetch strategy already in use. Making it the default keeps the current table intact, so this change adds capability rather than trading one view for another. Dropping to only `Project` and `Member` would delete the project-member breakdown outright.

For export, `projectAndMember` maps to `groupBy: 'user'` — the value its underlying requests use. Since export grouping is only a CSV label column, this affects metadata, not rows.

*Alternative rejected:* two options matching the API exactly. Cleaner mapping, but silently removes today's default view.

### Collapsed identities hide their column instead of showing placeholder labels

Under `project`, no row has a member; under `member`, none has a project. Rather than let `getReportTableRowLabels` fall through to `'Member scope'` / `'Project scope'`, the table derives its columns from the grouping:

| Grouping | Columns |
| --- | --- |
| `projectAndMember` | Project, Member, Hours, Billable |
| `project` | Project, Hours, Billable |
| `member` | Member, Hours, Billable |

The column filter for an absent column is hidden and its filter state cleared on change, so a stale `filters.memberId` cannot silently empty the table after switching to `project`. `reportTableRowSchema` allows `projectName`/`memberName` to be absent, and the placeholder branches in `getReportTableRowLabels` are removed rather than left as dead fallbacks.

This is why `spec.md:112` becomes conditional rather than simply deleted: the default grouping still guarantees the breakdown, and the other groupings omit the column instead of faking it.

*Alternative rejected:* keep the placeholder labels and all four columns. It is what the spec forbids, and a column of `'Member scope'` communicates nothing.

### Export keeps the header controls as its scope

`Export CSV` sends the active date range plus the grouping metadata. Table search and column filters remain excluded, per `spec.md:150`. Export handling — `handleExport`, the `exporting` flag, toasts, `downloadReportExport` — stays in `ReportsView`, with the button passed into `ReportsTable`'s header through an `actions` slot, keeping the table presentational and preserving `data-testid="export-reports-csv"`.

## Risks / Trade-offs

- **Single-request modes drop the frontend project loop** → `getVisibleReportProjectsForScope` currently filters to active projects with tracked time, so `project` and `member` groupings will rely purely on server-side scope and may include projects the loop would have filtered out. Verify PM scope for both modes explicitly before shipping; if the backend is laxer than the loop, keep the loop for `project` too.
- **Grouping affects the table but only labels the CSV** → a user switching to `Member` sees regrouped rows and a CSV whose rows did not change. This is required by the archived export contract, so document it in `docs/ui/pages-admin.md` rather than "fix" it.
- **Date range edits now refetch, from the page's most reachable control** → under `projectAndMember` that is still the N-projects loop, so a wide range on a large workspace is expensive. The 300ms debounce bounds the burst, and `getReportErrorMessage` already surfaces throttling.
- **`useReportRefreshDebounce` also watches `selectedProjectId`** → inert once the project control is gone, but it would silently refetch if anything set that ref again. Comment the call site.
- **Three specs assert the behaviour being reversed** → `ReportsView.spec.ts:307`, `useReportsData.spec.ts:370`, and `spec.md:107` must be rewritten, not deleted, so the new contract stays covered.
- **Docs, spec, and design can drift** → `docs/ui/pages-admin.md:19-31`, the `admin-pages` spec, and the `.pen` screen all describe this surface, and the `.pen` still reads `Group by: Project` rather than the new default. All must move together, since `AGENTS.md` resolves conflicts in favour of the docs.
