## Context

The admin Reports page currently splits filtering across two layers by design:

- A **setup bar** (`ReportsFilterForm.vue`) holding project, member, date range, and group-by. Its values are export scope only. `openspec/specs/admin-pages/spec.md` states that changing them leaves loaded rows and summary cards untouched, and `ReportsView.spec.ts:307` (`keeps header setup controls as export scope instead of table state`) locks that in.
- **Table discovery filters** (`ReportsTable.vue`): global search plus project/member/hours/billable column filters. These are client-side over already-loaded rows and never call an endpoint.

The split is coherent but unsignposted: two rows of controls that look alike, one of which silently governs a download. The redesign collapses it to one date range plus one `Export CSV` in the table header.

Two pieces of current state matter for implementation:

- `useReportFilters.ts` exposes `applyCurrentFilters()`, which promotes the working filter state into `appliedFilters` (the query key driving the fetch). Its only caller, `useReportRefreshDebounce.ts`, is **imported nowhere** — orphaned in `215b321` ("refactor(admin-web): split reports data composable"). So `appliedFilters` is set once from defaults and never updates.
- `ReportsView.vue:56-59` holds its own local copies of the setup state (`reportDateRange`, `reportProjectId`, …), disconnected from the composable's refs. This is what makes the export-scope behaviour work today.

Together these mean the date range currently affects nothing but the CSV. Making it a real filter is therefore mostly a *wiring* job, not new machinery.

Per `apps/admin-web/AGENTS.md`, the approved `.pen` screen is the design source and `docs/ui/*` wins on conflict. The `Admin Reports` screen in `GITiempo.pen` already shows the target layout; `docs/ui/pages-admin.md:19-31` still describes the old setup bar and must be updated in step with the spec.

## Goals / Non-Goals

**Goals:**

- One `Export CSV` action, in the results table header, right of the global search.
- One date range control, next to that search, driving report fetch, summary totals, and CSV scope alike.
- Remove the setup bar and the project, member, and group-by controls.
- Keep table discovery filters exactly as they are: client-side, no endpoint calls, no effect on the CSV or summary cards.
- Keep PM scope enforcement server-side and unchanged.

**Non-Goals:**

- No backend, shared contract, database, migration, or OpenAPI changes. Every relevant field in `packages/shared/src/contracts/reports.ts` is already optional and `groupBy` already defaults to `project`.
- Not making the CSV reflect table search or column filters. `spec.md:150` keeps export independent of table state, and this change does not revisit that.
- Not adding a date column to the results table (see Decisions).
- No change to the reports data-fetch strategy in `useReportRowsData.ts`, which will keep looping visible projects and requesting `groupBy: 'user'` internally.

## Decisions

### Date range filters the table rather than only scoping the CSV

Placed beside the search box, a control that changed only the download would read as a bug. It becomes a real filter: edits flow into `appliedFilters`, the query refetches, rows and summary cards follow, and the same range scopes the CSV.

This reverses the `Header setup controls define backend CSV export scope` scenario in `spec.md:107` for the one control that survives, and obsoletes `ReportsView.spec.ts:307`.

Implementation: import the existing `useReportRefreshDebounce` in `useReportsData.ts`, passing `filters.applyCurrentFilters`, `filters.dateRange`, `rowsData.initialLoaded`, and a `onRefreshScheduled` that sets `currentAction` to `refresh-reports`. It already watches the range by timestamp and debounces at 300ms, so no new composable is needed. It also watches `selectedProjectId`, which is now inert but harmless — that ref stays as null-valued scope state.

`ReportsView.vue` must then bind the picker to the composable's `dateRange` ref rather than a local copy, or the wiring will not be reached.

*Alternative rejected:* leave it export-only and keep `spec.md:107` verbatim. Smaller diff, but ships a control whose placement contradicts its behaviour.

### Date range stays a discrete control instead of becoming a table column

A date column was considered and does not work. `reportTableRowSchema` (`apps/admin-web/src/validation/report-view-model.ts:46-58`) has no date field: a row is an aggregate of many entries (project × member with `totalSeconds`, `billableSeconds`, `entryCount`), not a time entry.

Even carrying `firstStartedAt`/`lastStartedAt` through would not help. A client-side column filter can only include or exclude whole rows; it cannot re-aggregate. A row spanning Apr 1-30 filtered to Apr 10 would still report the full month's hours. Date range changes *how totals are computed*, so it has to stay a server-side query parameter. That is precisely what separates it from project and member.

### Export scope narrows to the date range, accepting capability loss

With the setup bar gone, `Export CSV` sends only the active range. Grouping stays at the `project` default, and no project or member restriction is sent.

This drops the `Admin can explicitly report inactive or empty visible projects` scenario (`spec.md:140`). The table's project filter cannot stand in: it filters loaded rows, and a project with zero tracked hours produces no rows to select. The capability is genuinely removed, not relocated — hence **BREAKING** in the proposal.

*Alternative rejected:* fold grouping and scope into an export dropdown (SplitButton). Preserves every capability and still reads as one button, but re-adds the complexity the redesign exists to remove, and would need the `.pen` screen reworked.

### The export action moves to the table header but export logic stays in the view

`ReportsTable.vue` gains a `dateRange` model plus an `actions` slot rendered after the search field. `ReportsView.vue` keeps `handleExport`, the `exporting` flag, and toast handling, and passes the button through that slot.

This keeps toasts and download side effects in the view that already owns `useToasts` and `downloadReportExport`, leaves `ReportsTable` presentational, and mirrors the slot pattern `ReportsFilterForm` uses today, so `data-testid="export-reports-csv"` survives.

*Alternative rejected:* move export wholesale into `ReportsTable`. It would pull toasts and download plumbing into a component whose job is rendering rows.

### Date-range validation stays, and still gates both paths

`getReportDateRangeError` continues to disable `Export CSV` on an end-before-start range, per `spec.md:121`. Because the range now also drives fetching, `applyCurrentFilters` must keep its existing `isReportDateRangeValid` guard so an invalid range calls no endpoint either. That guard already exists in `useReportFilters.ts:32` and needs no change.

The picker keeps `manual-input` disabled per `spec.md:122`, but loses the `@primevue/forms` `Form` + `zodResolver` wrapper that `ReportsFilterForm` provided. A single control in a table header does not warrant a form. Validation messaging moves to the disabled export button plus inline feedback; `reportFilterFormSchema` in `packages/web-shared` sheds the fields for the removed controls, while `normalizeReportDateRangeValue` stays in use for `@update:model-value`.

## Risks / Trade-offs

- **Inactive or zero-hour projects become unexportable** → Accepted and recorded as BREAKING. Re-adding it later means an export dropdown, not restoring the bar.
- **Every export now covers all visible projects and members** → CSVs grow, and PMs and admins lose the ability to hand someone a single-member file. PM scope still binds server-side, so this is a size and convenience cost, not a data-leak one.
- **Date range edits now trigger refetches** → `useReportRowsData` loops every visible project and pages through each, so a wide range on a large workspace is expensive, and the control is now the page's most reachable. The 300ms debounce in `useReportRefreshDebounce` bounds the burst; the underlying fetch strategy is out of scope here.
- **Wiring `useReportRefreshDebounce` also watches `selectedProjectId`** → inert while nothing sets it, but if a project control ever returns it would silently start refetching. Worth a comment at the call site.
- **`ReportsView.spec.ts:307` asserts the behaviour being reversed** → it must be rewritten, not deleted, so the new contract (range edits *do* reach the table) is covered.
- **Docs, spec, and design can drift apart** → `docs/ui/pages-admin.md:19-31`, the `admin-pages` spec, and the `.pen` screen all describe this surface. All three change together or the next UI task inherits a conflict, which `AGENTS.md` resolves in favour of docs.
