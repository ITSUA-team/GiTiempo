## 1. Reconnect the date range to report data

- [ ] 1.1 Import `useReportRefreshDebounce` in `apps/admin-web/src/composables/reports/useReportsData.ts` and call it with `filters.applyCurrentFilters`, `filters.dateRange`, `rowsData.initialLoaded`, and an `onRefreshScheduled` that sets `currentAction` to `refresh-reports`
- [ ] 1.2 Note at the call site that `selectedProjectId` is passed as inert scope state, so a future project control does not silently start refetching
- [ ] 1.3 Add a unit test covering that a date range edit reaches `appliedFilters` after the 300ms debounce, and that an end-before-start range does not

## 2. Move the header controls into the results table

- [ ] 2.1 Add a `dateRange` model to `apps/admin-web/src/components/reports/ReportsTable.vue` and render a PrimeVue range `DatePicker` in the `SectionHeader` actions, left of the global search, with `manual-input` disabled and `@update:model-value` normalised through `normalizeReportDateRangeValue`
- [ ] 2.2 Add an `actions` slot to that header, rendered right of the search field, for the export button
- [ ] 2.3 Match the committed `Admin Reports` screen in `GITiempo.pen`: 38px control height, `radius-sm`, divider border, muted calendar and chevron icons, 12px gap between date range, search, and export
- [ ] 2.4 Confirm the mobile filter stack still renders sensibly now the header carries three controls

## 3. Reduce the reports view to date range plus export

- [ ] 3.1 Remove the `ReportsFilterForm` import, usage, and the `reportProjectId`, `reportMemberId`, and `reportGroupBy` local refs from `apps/admin-web/src/views/ReportsView.vue`
- [ ] 3.2 Bind the date range to the `dateRange` ref returned by `useReportsData` rather than a local copy, so task 1.1's wiring is actually reached
- [ ] 3.3 Pass the `Export CSV` button through the table's new `actions` slot, keeping `handleExport`, the `exporting` flag, toasts, and `data-testid="export-reports-csv"` in the view
- [ ] 3.4 Call `exportCurrentReport` with the active date range only, letting grouping default to `project` and sending no project or member restriction
- [ ] 3.5 Keep `getReportDateRangeError` gating the disabled state of `Export CSV`

## 4. Retire the setup form

- [ ] 4.1 Delete `apps/admin-web/src/components/reports/ReportsFilterForm.vue` and `ReportsFilterForm.spec.ts`
- [ ] 4.2 Narrow `reportFilterFormSchema` in `packages/web-shared/src/validation/report-filter-form.ts` to the date range, keeping `normalizeReportDateRangeValue` and `ReportDatePickerRangeValue` exported
- [ ] 4.3 Narrow the setup state in `apps/admin-web/src/composables/reports/useReportFilters.ts` to the date range, leaving the `isReportDateRangeValid` guard in `applyCurrentFilters` intact
- [ ] 4.4 Remove the filter-bar block from the `reports` variant of `apps/admin-web/src/components/loading/ManagementPageSkeleton.vue` so the skeleton matches the new surface

## 5. Update tests

- [ ] 5.1 Rewrite `keeps header setup controls as export scope instead of table state` in `apps/admin-web/src/views/ReportsView.spec.ts` to assert the reverse: a date range edit updates loaded rows and summary totals
- [ ] 5.2 Replace the `ReportsFilterForm` stub in that spec with a `ReportsTable` stub exposing the date range model and the `actions` slot
- [ ] 5.3 Update export assertions to expect a date-range-only payload
- [ ] 5.4 Add a case asserting that table global search and column filters still leave the CSV export scope untouched

## 6. Update documentation

- [ ] 6.1 Rewrite the Reports Page section of `docs/ui/pages-admin.md:19-31` to describe the header date range, search, and single export action, and drop the setup bar, group-by, and per-project export lines
- [ ] 6.2 Confirm the `.pen` screen, `docs/ui/pages-admin.md`, and the `admin-pages` spec agree, since `apps/admin-web/AGENTS.md` resolves conflicts in favour of the docs

## 7. Verify

- [ ] 7.1 Run `pnpm --filter admin-web lint && pnpm --filter admin-web typecheck`
- [ ] 7.2 Run `pnpm --filter admin-web test`
- [ ] 7.3 Verify `pnpm --filter web-shared test` still passes after the schema narrowing in 4.2
- [ ] 7.4 Exercise the page: confirm a date range edit refetches and moves the summary cards, an end-before-start range calls no endpoint and disables export, and the CSV covers the chosen range
