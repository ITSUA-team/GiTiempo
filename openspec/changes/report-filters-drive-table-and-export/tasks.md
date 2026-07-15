## 1. Model the grouping dimension

- [ ] 1.1 Add a report grouping type covering `projectAndMember`, `project`, and `member` in `apps/admin-web/src/validation/report-view-model.ts`, defaulting to `projectAndMember`, and map each to its API `groupBy` value (`user`, `project`, `user`) for export metadata
- [ ] 1.2 Allow `projectName` and `memberName` to be absent in `reportTableRowSchema` so a collapsed identity is modelled as missing rather than placeholder text
- [ ] 1.3 Remove the `'Project scope'` / `'Member scope'` placeholder branches from `getReportTableRowLabels` in `apps/admin-web/src/lib/report-view-model.ts` and return the identities the response actually carries
- [ ] 1.4 Update `getReportTableRowId` and the `toReportTableRows` sort so they stay stable when a row has no project or no member

## 2. Make the date range drive report data

- [ ] 2.1 Import `useReportRefreshDebounce` in `apps/admin-web/src/composables/reports/useReportsData.ts` and call it with `filters.applyCurrentFilters`, `filters.dateRange`, `rowsData.initialLoaded`, and an `onRefreshScheduled` that sets `currentAction` to `refresh-reports`
- [ ] 2.2 Note at the call site that `selectedProjectId` is inert scope state, so a future project control does not silently start refetching
- [ ] 2.3 Confirm `applyCurrentFilters` keeps its `isReportDateRangeValid` guard so an end-before-start range calls no endpoint

## 3. Make grouping drive the fetch

- [ ] 3.1 Add the grouping to setup state in `apps/admin-web/src/composables/reports/useReportFilters.ts`, narrow that state to date range plus grouping, and include grouping in `appliedFilters` so it is part of the query key
- [ ] 3.2 Extend `useReportRefreshDebounce` to watch grouping alongside the date range
- [ ] 3.3 Branch `fetchReportRowsForScope` in `apps/admin-web/src/composables/reports/useReportRowsData.ts` on the applied grouping, replacing the hardcoded `groupBy: 'user'` at line 76
- [ ] 3.4 Keep `projectAndMember` on the existing loop over `getVisibleReportProjectsForScope`, requesting `groupBy: 'user'` per project
- [ ] 3.5 Implement `project` as a single request with `groupBy: 'project'` and no project loop
- [ ] 3.6 Implement `member` as a single request with `groupBy: 'user'` and no project id
- [ ] 3.7 Verify PM scope for the two single-request groupings; if the backend is laxer than `getVisibleReportProjectsForScope` (which filters to active projects with tracked time), keep the loop for `project` and record why

## 4. Make the table follow the grouping

- [ ] 4.1 Add a `dateRange` model to `apps/admin-web/src/components/reports/ReportsTable.vue` and render a PrimeVue range `DatePicker` in the `SectionHeader` actions, with `manual-input` disabled and `@update:model-value` normalised through `normalizeReportDateRangeValue`
- [ ] 4.2 Add a `grouping` model and render a `Select` beside it, labelled inline (`Group by: …`) since the header carries no field labels
- [ ] 4.3 Add an `actions` slot to that header, rendered right of the search field, for the export button
- [ ] 4.4 Derive `columns` from the grouping: Project+Member+Hours+Billable for `projectAndMember`, Project+Hours+Billable for `project`, Member+Hours+Billable for `member`
- [ ] 4.5 Hide the column filter for a hidden column and clear its filter state when grouping changes, so a stale `projectId`/`memberId` cannot silently empty the table
- [ ] 4.6 Update the mobile filter stack and `MobileRecordCard` metadata to match the visible columns for the selected grouping
- [ ] 4.7 Match the approved `Admin Reports` screen in `GITiempo.pen`: 38px control height, `radius-sm`, divider border, muted icons, 12px gap between the header controls

## 5. Reduce the reports view

- [ ] 5.1 Remove the `ReportsFilterForm` import, usage, and the `reportProjectId`, `reportMemberId`, and `reportGroupBy` local refs from `apps/admin-web/src/views/ReportsView.vue`
- [ ] 5.2 Bind date range and grouping to the refs returned by `useReportsData` rather than local copies, so the wiring in tasks 2.1 and 3.1 is actually reached
- [ ] 5.3 Pass the `Export CSV` button through the table's `actions` slot, keeping `handleExport`, the `exporting` flag, toasts, and `data-testid="export-reports-csv"` in the view
- [ ] 5.4 Call `exportCurrentReport` with the active date range and the grouping's mapped API value, sending no project or member restriction
- [ ] 5.5 Keep `getReportDateRangeError` gating the disabled state of `Export CSV`
- [ ] 5.6 Delete `apps/admin-web/src/components/reports/ReportsFilterForm.vue` and `ReportsFilterForm.spec.ts`
- [ ] 5.7 Resolve `reportFilterFormSchema` in `packages/web-shared/src/validation/report-filter-form.ts`, which loses its only consumer with the form; keep `normalizeReportDateRangeValue` and `ReportDatePickerRangeValue`, which stay in use
- [ ] 5.8 Remove the filter-bar block from the `reports` variant of `apps/admin-web/src/components/loading/ManagementPageSkeleton.vue`

## 6. Update tests

- [ ] 6.1 Rewrite `keeps setup controls as export-only scope without changing rows or summary` in `apps/admin-web/src/composables/reports/useReportsData.spec.ts:370` to assert a date range edit refetches after the 300ms debounce and updates rows
- [ ] 6.2 Add composable cases asserting each grouping issues the fetch shape from tasks 3.4 to 3.6
- [ ] 6.3 Rewrite `keeps header setup controls as export scope instead of table state` in `apps/admin-web/src/views/ReportsView.spec.ts:307` to assert the reverse, and replace the `ReportsFilterForm` stub with a `ReportsTable` stub exposing the date range and grouping models plus the `actions` slot
- [ ] 6.4 Add `ReportsTable.spec.ts` cases covering which columns and column filters each grouping renders, and that switching grouping clears filter state for a hidden column
- [ ] 6.5 Update export assertions to expect a date-range-plus-grouping payload, and keep a case asserting table search and column filters leave export scope untouched
- [ ] 6.6 Pass the new required models at every existing `ReportsTable` mount site

## 7. Update documentation and design

- [ ] 7.1 Rewrite the Reports Page section of `docs/ui/pages-admin.md:19-31` for the header controls, the grouping options, and the single export action
- [ ] 7.2 Document that grouping regroups the table but only labels the CSV, which stays detailed project-task-user rows per the archived export contract, so it is not later "fixed"
- [ ] 7.3 Update the `Admin Reports` screen in `GITiempo.pen` to read `Group by: Project & Member`, matching the new default
- [ ] 7.4 Confirm the `.pen` screen, `docs/ui/pages-admin.md`, and the `admin-pages` spec agree, since `apps/admin-web/AGENTS.md` resolves conflicts in favour of the docs

## 8. Verify

- [ ] 8.1 Run `pnpm --filter admin-web lint && pnpm --filter admin-web typecheck`
- [ ] 8.2 Run `pnpm --filter admin-web test`
- [ ] 8.3 Run `pnpm --filter web-shared test` after resolving the schema in task 5.7
- [ ] 8.4 Exercise the page: each grouping regroups rows and columns, a date range edit refetches and moves the summary cards, an end-before-start range calls no endpoint and disables export, and the CSV covers the chosen range
