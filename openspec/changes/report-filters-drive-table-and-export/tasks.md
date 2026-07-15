## 1. Model the grouping dimension

- [x] 1.1 Add a report grouping type covering `project` and `member` in `apps/admin-web/src/validation/report-view-model.ts`, defaulting to `project`, and map each to its API `groupBy` value for export metadata
- [x] 1.2 Allow `projectName` and `memberName` to be absent in `reportTableRowSchema` so a collapsed identity is modelled as missing rather than placeholder text
- [x] 1.3 Remove the `'Project scope'` / `'Member scope'` placeholder branches from `getReportTableRowLabels` in `apps/admin-web/src/lib/report-view-model.ts` and return the identities the response actually carries
- [x] 1.4 Update `getReportTableRowId` and the `toReportTableRows` sort so they stay stable when a row has no project or no member

## 2. Make the date range drive report data

- [x] 2.1 Import `useReportRefreshDebounce` in `apps/admin-web/src/composables/reports/useReportsData.ts` and call it with `filters.applyCurrentFilters`, `filters.dateRange`, `rowsData.initialLoaded`, and an `onRefreshScheduled` that sets `currentAction` to `refresh-reports`
- [x] 2.2 Note at the call site that `selectedProjectId` is inert scope state, so a future project control does not silently start refetching
- [x] 2.3 Confirm `applyCurrentFilters` keeps its `isReportDateRangeValid` guard so an end-before-start range calls no endpoint

## 3. Make grouping drive the fetch

- [x] 3.1 Add the grouping to setup state in `apps/admin-web/src/composables/reports/useReportFilters.ts`, narrow that state to date range plus grouping, and keep grouping out of `appliedFilters` so it never reaches the query key
- [x] 3.2 Keep grouping out of `useReportRefreshDebounce`: both groupings derive from the same member rows, so grouping regroups instantly and only the date range refetches
- [x] 3.3 Keep the fetch in `apps/admin-web/src/composables/reports/useReportRowsData.ts` at member granularity and apply grouping as a computed over the loaded rows
- [x] 3.4 Keep the existing loop over `getVisibleReportProjectsForScope`, requesting `groupBy: 'user'` per project, so both groupings share one scope
- [x] 3.5 Implement `project` (default) with `foldRowsByProject`, summing time and collecting distinct contributors, since `groupBy: 'project'` returns `user: null` and carries no member count
- [x] 3.6 Implement `member` with `sortRowsByMember`, member-major, keeping each member's per-project rows
- [x] 3.7 Confirm PM scope stays on the loop: the backend filters inactive projects for PMs only (`reports.service.ts:146-153`), so an unscoped request would let admins see time the loop hides

## 4. Make the table follow the grouping

- [x] 4.1 Add a `dateRange` model to `apps/admin-web/src/components/reports/ReportsTable.vue` and render a PrimeVue range `DatePicker` in the `SectionHeader` actions, with `manual-input` disabled and `@update:model-value` normalised through `normalizeReportDateRangeValue`
- [x] 4.2 Add a `grouping` model and render a `Select` beside it, labelled inline (`Group by: Project` / `Group by: Member`) since the header carries no field labels
- [x] 4.3 Add an `actions` slot to that header, rendered right of the search field, for the export button
- [x] 4.4 Derive `columns` from the grouping: Project+Members(count, rendered `4 members`)+Hours+Billable for `project`, Member+Project+Hours+Billable for `member`
- [x] 4.5 Keep both the project and member column filters for every grouping, ordered to follow the columns, so filtering by a member under `Project` grouping still answers which projects they contributed to
- [x] 4.6 Update the mobile filter stack and `MobileRecordCard` metadata to match the visible columns for the selected grouping
- [x] 4.7 Match the approved `Admin Reports` screen in `GITiempo.pen`: 38px control height, `radius-sm`, divider border, muted icons, 12px gap between header controls, and a 180px left-aligned Members column

## 5. Reduce the reports view

- [x] 5.1 Remove the `ReportsFilterForm` import, usage, and the `reportProjectId`, `reportMemberId`, and `reportGroupBy` local refs from `apps/admin-web/src/views/ReportsView.vue`
- [x] 5.2 Bind date range and grouping to the refs returned by `useReportsData` rather than local copies, so the wiring in tasks 2.1 and 3.1 is actually reached
- [x] 5.3 Pass the `Export CSV` button through the table's `actions` slot, keeping `handleExport`, the `exporting` flag, toasts, and `data-testid="export-reports-csv"` in the view
- [x] 5.4 Call `exportCurrentReport` with the active date range, the grouping's mapped API value (`project`/`user`), and the table's project, member, and global search filters
- [x] 5.9 Disable `Export CSV` while an hours or billable filter is active, with the reason on a wrapper span since a disabled button swallows hover
- [x] 5.5 Keep `getReportDateRangeError` gating the disabled state of `Export CSV`
- [x] 5.6 Delete `apps/admin-web/src/components/reports/ReportsFilterForm.vue` and `ReportsFilterForm.spec.ts`
- [x] 5.7 Resolve `reportFilterFormSchema` in `packages/web-shared/src/validation/report-filter-form.ts`, which loses its only consumer with the form; keep `normalizeReportDateRangeValue` and `ReportDatePickerRangeValue`, which stay in use
- [x] 5.8 Remove the filter-bar block from the `reports` variant of `apps/admin-web/src/components/loading/ManagementPageSkeleton.vue`

## 6. Update tests

- [x] 6.1 Rewrite `keeps setup controls as export-only scope without changing rows or summary` in `apps/admin-web/src/composables/reports/useReportsData.spec.ts:370` to assert a date range edit refetches after the 300ms debounce and updates rows
- [x] 6.2 Add composable cases asserting the project fold with its member count, the member-major ordering, and that switching grouping issues no request
- [x] 6.3 Rewrite `keeps header setup controls as export scope instead of table state` in `apps/admin-web/src/views/ReportsView.spec.ts:307` to assert the reverse, and replace the `ReportsFilterForm` stub with a `ReportsTable` stub exposing the date range and grouping models plus the `actions` slot
- [x] 6.4 Add `ReportsTable.spec.ts` cases covering which columns each grouping renders, that the Members count reads `4 members`, and that both filters stay available
- [x] 6.5 Assert the export payload carries the date range, grouping, and the table's project/member/search filters, and that an active hours or billable filter blocks export entirely
- [x] 6.6 Pass the new required models at every existing `ReportsTable` mount site

## 7. Update documentation and design

- [x] 7.1 Rewrite the Reports Page section of `docs/ui/pages-admin.md:19-31` for the header controls, the grouping options, and the single export action
- [x] 7.2 Document that grouping regroups the table but only labels the CSV, which stays detailed project-task-user rows per the archived export contract, so it is not later "fixed"
- [x] 7.3 No `.pen` change needed: the approved `Admin Reports` screen already shows `Group by: Project`, the `Members` count column, and the retained member filter
- [x] 7.4 Confirm the `.pen` screen, `docs/ui/pages-admin.md`, and the `admin-pages` spec agree, since `apps/admin-web/AGENTS.md` resolves conflicts in favour of the docs

## 8. Verify

- [x] 8.1 Run `pnpm --filter admin-web lint && pnpm --filter admin-web typecheck`
- [x] 8.2 Run `pnpm --filter admin-web test`
- [x] 8.3 Run `pnpm --filter web-shared test` after resolving the schema in task 5.7
- [ ] 8.4 NOT DONE - needs a running app; covered by unit tests only. Exercise the page in a browser: each grouping regroups rows and columns, a date range edit refetches and moves the summary cards, an end-before-start range calls no endpoint and disables export, and the CSV covers the chosen range
