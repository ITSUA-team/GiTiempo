## 1. Shared contract

- [x] 1.1 Change `timeReportGroupBySchema` usage in `packages/shared/src/contracts/reports.ts`: `groupBy` accepts a comma-separated ordered list (1–4 unique dimensions of `project`, `task`, `user`), transformed to a validated array; bare `groupBy=project` still parses (default `['project']`)
- [x] 1.2 Replace the `timeReportRowSchema` discriminated union with the unified row shape: nullable `project`, `task`, `user` identity objects populated per requested dimension (task rows always carry project), same aggregate fields; response `groupBy` echoes the ordered array
- [x] 1.3 Add `timeReportExportFormatSchema` (`csv | pdf`, default `csv`) to the shared export query contract
- [x] 1.4 Update `packages/shared/src/contracts/reports.spec.ts`: list parsing (valid orders, duplicates rejected, >4 rejected, unknown dimension rejected, single-value compatibility), unified row validation, and export format parsing
- [x] 1.5 Build shared package and confirm dependent typechecks surface all consumers of the old union (`pnpm --filter @gitiempo/shared build && pnpm --filter @gitiempo/shared test`)

## 2. Reports API — multi-level grouping

- [x] 2.1 Update `apps/api/src/reports/dto/*.dto.ts` to re-wrap the updated query, export-query, and response contracts
- [x] 2.2 Rework `ReportsService.groupSelection`/`groupByColumns` to build selection and `GROUP BY` from the ordered dimension path; keep single-level requests on the existing one-step query path
- [x] 2.3 Implement top-level-group pagination: subquery selecting the page of first-dimension keys ordered by the aggregated sort metric, main query returning all leaf rows for those keys; `meta.total` counts top-level groups
- [x] 2.4 Update `toReportRow` for the unified row shape and echo the grouping array in the response
- [x] 2.5 Update CSV export: accept the grouping array, keep detailed project-task-user rows, record the joined ordered path in the `Group By` column
- [x] 2.6 Update `reports.service.spec.ts` unit coverage: multi-level grouping combinations, validation failures, pagination-by-top-level-group, complete subtrees per page, unchanged single-level behavior
- [x] 2.7 Extend reports e2e coverage: multi-level rows carry full path identity, PM scope holds for nested rows, summary ignores pagination, CSV metadata path

## 3. Reports API — PDF export

- [x] 3.1 Add `pdfmake` to `apps/api` with a lockfile diff scoped to the new package (per the pnpm minimumReleaseAge policy)
- [x] 3.2 Implement the PDF document builder (`report-pdf.ts`): masthead, period/workspace line, filters + grouping line, summary strip, grouped table with per-level subtotals and indentation, total row, footer with generation date and page numbers, per the "Report PDF Preview" .pen frame
- [x] 3.3 Extend `ReportsService.exportTimeReport` to branch on format: CSV unchanged; PDF builds the grouped tree from path-granularity rows and returns a PDF buffer with a `.pdf` filename
- [x] 3.4 Wire the controller response (content type and disposition per format)
- [x] 3.5 Unit coverage: format branching, PDF magic bytes, filename; e2e coverage: admin PDF 200 + content type, default stays CSV, PM scope, invalid format 400
- [x] 3.6 Regenerate `packages/shared/openapi.json` via the build-based workflow (per `apps/api/AGENTS.md` gotcha — not `pnpm openapi:export` through tsx)

## 4. Admin web view model

- [x] 4.1 Update `src/validation/report-view-model.ts`: `ReportGrouping` becomes an ordered array of `'project' | 'member' | 'task'`, default `['project']`; keep `reportGroupingApiValue` mapping (member → user); table-row schema gains path identity, `level`, `isLeaf`
- [x] 4.2 Add tree assembly in `src/lib/report-view-model.ts`: `buildReportTree(rows, grouping)` grouping leaves by path, computing node subtotals (sums + max `lastStartedAt`), and flattening with expansion state
- [x] 4.3 Add `reportBillableShareFilterSchema` (`any | below50 | gte50 | gte90`) and `reportActivityFilterSchema` (`any | today | last7 | last30`); extend `reportTableFiltersSchema` and default filters
- [x] 4.4 Split filtering: identity filters and global search stay leaf-level (`filterReportRows`, rebuilding the visible tree from surviving leaves); aggregate filters compare displayed top-level group totals (`filterReportTreeGroups` with optional `now`); `sumReportTreeTotals` feeds the total row from visible groups
- [x] 4.5 Update `getReportExportBlockedReason` for grouping arrays (member filter exportable when `user`/`member` is a requested level) and for the new aggregate filters blocking export alongside search/hours/billable
- [x] 4.6 Update `report-view-model.spec.ts` for tree building, subtotal math, flatten/expand behavior, filter-rebuild, new filter predicates, and export-blocked rules

## 5. Admin web data layer

- [x] 5.1 Update `src/services/admin-reports-client.ts` and `src/composables/reports/useReportsData.ts` to send the ordered `groupBy` list and consume unified rows
- [x] 5.2 Pass `format` through `admin-reports-client` and `useReportExport`; export query building carries the grouping path; adjust `useReportOptions.ts` if option derivation touches row shape
- [x] 5.3 Update composable and client spec files for the new query, row shapes, and format param

## 6. Admin web UI

- [x] 6.1 Build the grouping-builder control in `ReportsTable.vue` per the "Admin Reports V2" .pen frame: ordered level chips with remove and reorder, "Add level" offering only unused dimensions, max 4, min 1 (follow `docs/ui/INDEX.md` routing and the pixel-parity checklist from `apps/admin-web/AGENTS.md`)
- [x] 6.2 Render the hierarchy in the results table: indentation per level, expand/collapse chevrons on non-leaf rows, subtotal styling for group rows, overall total footer row
- [x] 6.3 Add the new columns (billable %, last activity) and align the filter row with the new column set; keep mobile card rendering coherent for grouped rows
- [x] 6.4 Add the Billable % and Last activity selects to the desktop filter row and the mobile filter grid (existing filter-row treatment, per the "Report Filter Menus Spec" .pen frame)
- [x] 6.5 Replace the `Export CSV` button in `ReportsView.vue` with the design's `Export ▾` menu ("Export as CSV" / "Export as PDF"), keeping the blocked-reason tooltip and download flow; update grouping state wiring and `ManagementPageSkeleton`/desktop-row skeleton variants for the new column structure
- [x] 6.6 Update `ReportsTable.spec.ts` and `ReportsView.spec.ts`: builder interactions (add/remove/reorder/cap), expand/collapse, subtotal correctness, total row, new filter controls, export menu, and export request includes grouping path + format

## 7. Docs

- [x] 7.1 Update the Reports Page section in `docs/ui/pages-admin.md`: grouping builder, tree rendering, filter list, export menu and PDF bullets

## 8. Verification

- [x] 8.1 API: `pnpm --filter @gitiempo/api lint && pnpm --filter @gitiempo/api typecheck && pnpm --filter @gitiempo/api test`; run e2e after `db:migrate` + `db:seed`
- [x] 8.2 Admin web: `pnpm --filter admin-web lint && pnpm --filter admin-web typecheck && pnpm --filter admin-web test`
- [x] 8.3 Confirm single-level `groupBy=project` requests return byte-compatible aggregates with pre-change behavior (regression check via e2e fixtures)
- [x] 8.4 State in the final review whether any PrimeVue constraint forced a deviation from the approved .pen design (per `apps/admin-web/AGENTS.md` execution rule) — deviation recorded: the PDF uses standard Helvetica instead of Inter (pdfmake standard fonts)
