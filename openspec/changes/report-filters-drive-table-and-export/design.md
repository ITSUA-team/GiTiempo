## Context

The Admin Reports header now carries date range, grouping, search, and `Export CSV` in one toolbar (`GITiempo.pen`, `Admin Reports`). Two of those four controls are decorative with respect to the table:

- **Date range** never reaches the query. `useReportFilters.applyCurrentFilters()` promotes working state into `appliedFilters` (the fetch's query key), and its only caller, `useReportRefreshDebounce.ts`, is imported nowhere — orphaned in `215b321`. `ReportsView.vue:56-59` compounds this by keeping local copies disconnected from the composable's refs.
- **Grouping** never reaches it either. `useReportRowsData.ts:76` hardcodes `groupBy: 'user'` on every request.

Both were deliberate: `admin-pages/spec.md:107` requires setup controls to leave loaded rows untouched, and `ReportsView.spec.ts:307` plus `useReportsData.spec.ts:370` lock it in. That contract made sense when the controls sat in their own bar. It stops making sense once they sit inside the table header.

Three constraints bound the solution:

- **The CSV must stay detailed.** `reports.service.ts:106-119` always builds export rows via `getDetailedRows`, and `toCsv` (`:521-542`) writes `groupBy` as a literal label column. The archived `2026-07-09-clarify-detailed-report-csv-export` states this explicitly — "Preserve selected `groupBy` as CSV metadata rather than using it to collapse CSV row granularity" — and says it exists to stop future agents "fixing" it back to grouped parity. Grouping therefore must not reshape the CSV.
- **The API has no project-and-member grouping, and no member count.** `timeReportGroupBySchema` is `project | task | user`, and `timeReportProjectRowSchema` carries `user: null`. Today's project-member table is a frontend construct: `useReportRowsData` loops visible projects and requests `groupBy: 'user'` per project, so each row carries a user from the response and a project from the loop.
- **`toReportTableRows` already collapses identities with placeholders.** `getReportTableRowLabels` (`report-view-model.ts:243-273`) substitutes `'Project scope'` / `'Member scope'` when the response omits an identity. Those placeholders are precisely what `spec.md:112` forbids, and are only unreachable today because the fetch always pairs `groupBy: 'user'` with a project id.

Per `apps/admin-web/AGENTS.md`, `docs/ui/*` is the source of truth over the design file, and the approved `.pen` screen is the design source for UI work.

## Goals / Non-Goals

**Goals:**

- Editing the date range refetches, updating rows and summary totals, and scopes the CSV.
- Selecting a grouping changes what a table row represents, with columns and column filters following.
- Answer both questions the page is for: how much time went into each project, and how each member spent theirs.
- Keep table discovery filters client-side and table-only.
- Keep PM scope enforced server-side.

**Non-Goals:**

- No backend, shared contract, database, migration, or OpenAPI changes.
- Not making grouping collapse CSV rows. That would reverse the archived detailed-export contract.
- Not adding a date column to the table (see Decisions).
- Not revisiting pagination or the throttling guidance in `getReportErrorMessage`.

## Decisions

### Date range drives the fetch, via the composable that already exists

Import `useReportRefreshDebounce` in `useReportsData.ts`, passing `filters.applyCurrentFilters`, `filters.dateRange`, `rowsData.initialLoaded`, and an `onRefreshScheduled` setting `currentAction` to `refresh-reports`. It already watches the range by timestamp and debounces at 300ms. `ReportsView.vue` must bind to the composable's `dateRange` rather than a local copy, or the wiring is never reached.

`applyCurrentFilters` keeps its `isReportDateRangeValid` guard (`useReportFilters.ts:32`), so an end-before-start range calls no endpoint, and `getReportDateRangeError` keeps the export button disabled. `spec.md:121` is satisfied unchanged.

*Alternative rejected:* a fresh watcher in the view. The composable exists, is tested by the rewritten `useReportsData.spec.ts`, and owns the debounce.

### Date range stays a control, not a table column

`reportTableRowSchema` (`validation/report-view-model.ts:46-58`) has no date field: a row aggregates many entries. Carrying `firstStartedAt`/`lastStartedAt` through would not help, because a client-side column filter can only include or exclude whole rows, never re-total them — a row spanning Apr 1-30 filtered to Apr 10 would still report the month's hours. The range changes how totals are computed, so it must stay a server-side parameter.

### Grouping is presentation over one fetch, not a fetch parameter

`useReportRowsData` keeps the existing loop over `getVisibleReportProjectsForScope` and always requests `groupBy: 'user'` per project — the finest granularity the API offers. Grouping never reaches the fetch or its query key; it is applied as a computed over the loaded rows:

- **`project` (default)** — folded by `foldRowsByProject` into one row per project, summing time and counting distinct contributors.
- **`member`** — re-ordered member-major by `sortRowsByMember`, keeping each member's per-project rows.

`groupBy: 'project'` would give project totals in one step, but `timeReportProjectRowSchema` carries `user: null` and no member count, so it cannot answer "how many members worked on this". The count exists only in member-level rows, so the fold is client-side by necessity.

Because both groupings derive from identical data, keying the query by grouping would refetch the whole project loop to render rows the client already holds. Switching grouping is therefore instant and issues no request; only the date range refetches.

Single unscoped requests were the obvious cheaper design and are wrong here. `buildQueryContext` (`reports.service.ts:146-153`) applies `projects.isActive = true` **only for PMs**; admins get no active-project filter, while `getVisibleReportProjectsForScope` filters to `isActive && totalSeconds > 0`. An unscoped request would hand admins time the loop hides, and `spec.md:140` shows excluding inactive projects is a deliberate product rule. Summary totals would then move when the user only changed grouping.

*Alternative rejected:* single requests per grouping. Cheaper, but rescopes the report for admins and cannot supply the member count.

### There is no combined project-and-member grouping

A `Project & Member` option was considered and dropped: the API groups by project, task, or user, and no combination expresses "group by both". It would mean inventing a grouping the report cannot express, and it is really just the ungrouped breakdown.

The default is `Project`, which answers the question the page leads with — how much time went into each project — while the `Members` count preserves how many people contributed. `Member` remains for the per-person view.

### A project row counts contributors instead of naming one

Under `project`, no single member owns a row. Rather than let `getReportTableRowLabels` fall through to `'Member scope'`, the table swaps the column for a count rendered as `4 members`:

| Grouping | Columns | A row is |
| --- | --- | --- |
| `project` (default) | Project, Members, Hours, Billable | all time spent on one project, plus its contributor count |
| `member` | Member, Project, Hours, Billable | one member's time on one project, member-major |

`reportTableRowSchema` allows `memberName` to be absent, and the placeholder branches in `getReportTableRowLabels` are removed rather than left as dead fallbacks.

### Both groupings keep both column filters

The member filter survives `project` grouping even though no Member column does. Filtering by a member there answers "which projects did they contribute to", which no other control answers in place. The filter row simply follows the column order: project-then-member under `project`, member-then-project under `member`.

The cost is that a member-filtered project row still shows the project's total hours, not that member's, because the row is a project total. That is inherent to grouping by project and is called out in the docs rather than papered over — and it is exactly why a member-scoped export is blocked under this grouping: the file would quantify a narrower thing than the screen.

*Alternative rejected:* hide the member filter under `project` grouping, on the grounds that a derived count is not filterable. It is tidier but removes a real question the page could answer.

### Export carries every table filter the CSV can honour

`Export CSV` sends the active date range, the grouping metadata, the table's project filter, and — only under `Member` grouping — its member filter, which `timeReportExportQuerySchema` accepts as `projectId` and `userId`. This reverses `spec.md:150` for filters with a faithful CSV equivalent: a filtered table exports a file with the same rows and sums.

The other three stop at the boundary. **Hours and billable** filter *aggregate row totals* (`filterReportRows` tests `row.totalSeconds >= 8h`), while the CSV is detailed project-task-user rows containing no such aggregate; "projects with 40h+" has nothing to match against.

**Global search** looks exportable and is not. The table's haystack is `projectName`, `memberName`, and *formatted labels* — durations and percentages (`report-view-model.ts:453-460`), a behaviour `report-view-model.spec.ts:215` pins deliberately. The endpoint's `search` matches project name, **task title**, `displayName`, and `email`. So searching `"1h 01m"` matches rows in the table and nothing in the export, while a task-title search matches the export and nothing in the table. Sending it would not scope the CSV — it would apply a *different* filter under the same name, which is worse than ignoring it.

Narrowing the table's haystack to the API's fields was considered and rejected: it deletes duration search, a tested capability, and still leaves task titles matching only server-side.

**The member filter is grouping-dependent**, and this was the sharpest trap. Under `Member` grouping each row carries one member's own sums, so a `userId`-scoped export matches the screen exactly. Under `Project` grouping, `foldRowsByProject` keeps whole folded rows with every contributor's time, and `filterReportRows` selects rows without re-summing — so a member-filtered table still shows full project totals while a `userId`-scoped export would return only that member's entries. On the test fixture: Orion shows 10800s / "2 members" on screen; the file would say 3600s. Recomputing the fold under the filter was rejected because table filters select rows and never recompute them (the summary cards depend on that same rule), and silently dropping `userId` would ignore an active filter.

So the rule is: filters export only where the table and CSV agree — project always, member only under `Member` grouping, label and aggregate filters never. Rather than drop anything silently, `Export CSV` is disabled with a reason. The rule and its wording live in one view-model function (`getReportExportBlockedReason`), grouping-aware, with the tooltip on a wrapper span since a disabled button swallows hover. The user gets a file that matches the screen, or no file and a reason — including the pointer to switch to `Member` grouping, which makes a member-scoped export valid.

*Alternative rejected:* send what maps and ignore the rest. Simplest, but hands back a file that quietly disagrees with the table.

Export handling — `handleExport`, the `exporting` flag, toasts, `downloadReportExport` — stays in `ReportsView`, with the button passed into `ReportsTable`'s header through an `actions` slot, keeping the table presentational and preserving `data-testid="export-reports-csv"`.

## Risks / Trade-offs

- **Single-request modes drop the frontend project loop** → `getVisibleReportProjectsForScope` currently filters to active projects with tracked time, so `project` and `member` groupings will rely purely on server-side scope and may include projects the loop would have filtered out. Verify PM scope for both modes explicitly before shipping; if the backend is laxer than the loop, keep the loop for `project` too.
- **Grouping affects the table but only labels the CSV** → a user switching to `Member` sees regrouped rows and a CSV whose rows did not change. This is required by the archived export contract, so document it in `docs/ui/pages-admin.md` rather than "fix" it.
- **Date range edits now refetch, from the page's most reachable control** → the fetch still walks the N-projects loop, so a wide range on a large workspace is expensive. The 300ms debounce bounds the burst, and `getReportErrorMessage` already surfaces throttling. Grouping switches cost nothing.
- **`useReportRefreshDebounce` also watches `selectedProjectId`** → inert once the project control is gone, but it would silently refetch if anything set that ref again. Comment the call site.
- **Three specs assert the behaviour being reversed** → `ReportsView.spec.ts:307`, `useReportsData.spec.ts:370`, and `spec.md:107` must be rewritten, not deleted, so the new contract stays covered.
- **Docs, spec, and design can drift** → `docs/ui/pages-admin.md:19-31`, the `admin-pages` spec, and the `.pen` screen all describe this surface, and the `.pen` still reads `Group by: Project` rather than the new default. All must move together, since `AGENTS.md` resolves conflicts in favour of the docs.
