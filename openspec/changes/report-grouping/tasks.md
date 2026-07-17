## 1. Shared contract

- [ ] 1.1 Change `timeReportGroupBySchema` usage in `packages/shared/src/contracts/reports.ts`: `groupBy` accepts a comma-separated ordered list (1–4 unique dimensions of `project`, `task`, `user`), transformed to a validated array; bare `groupBy=project` still parses (default `['project']`)
- [ ] 1.2 Replace the `timeReportRowSchema` discriminated union with the unified row shape: nullable `project`, `task`, `user` identity objects populated per requested dimension (task rows always carry project), same aggregate fields; response `groupBy` echoes the ordered array
- [ ] 1.3 Update `packages/shared/src/contracts/reports.spec.ts`: list parsing (valid orders, duplicates rejected, >4 rejected, unknown dimension rejected, single-value compatibility) and unified row validation
- [ ] 1.4 Build shared package and confirm dependent typechecks surface all consumers of the old union (`pnpm --filter @gitiempo/shared build && pnpm --filter @gitiempo/shared test`)

## 2. Reports API

- [ ] 2.1 Update `apps/api/src/reports/dto/*.dto.ts` to re-wrap the updated query, export-query, and response contracts
- [ ] 2.2 Rework `ReportsService.groupSelection`/`groupByColumns` to build selection and `GROUP BY` from the ordered dimension path; keep single-level requests on the existing one-step query path
- [ ] 2.3 Implement top-level-group pagination: subquery selecting the page of first-dimension keys ordered by the aggregated sort metric, main query returning all leaf rows for those keys; `meta.total` counts top-level groups
- [ ] 2.4 Update `toReportRow` for the unified row shape and echo the grouping array in the response
- [ ] 2.5 Update CSV export: accept the grouping array, keep detailed project-task-user rows, record the joined ordered path in the `Group By` column
- [ ] 2.6 Update `reports.service.spec.ts` unit coverage: multi-level grouping combinations, validation failures, pagination-by-top-level-group, complete subtrees per page, unchanged single-level behavior
- [ ] 2.7 Extend reports e2e coverage: multi-level rows carry full path identity, PM scope holds for nested rows, summary ignores pagination, CSV metadata path
- [ ] 2.8 Regenerate `packages/shared/openapi.json` via the build-based workflow (per `apps/api/AGENTS.md` gotcha — not `pnpm openapi:export` through tsx)

## 3. Admin web view model

- [ ] 3.1 Update `src/validation/report-view-model.ts`: `ReportGrouping` becomes an ordered array of `'project' | 'member' | 'task'`, default `['project']`; keep `reportGroupingApiValue` mapping (member → user); table-row schema gains path identity, `level`, `isLeaf`
- [ ] 3.2 Add tree assembly in `src/lib/report-view-model.ts`: `buildReportTree(rows, grouping)` grouping leaves by path, computing node subtotals (sums + max `lastStartedAt`), and flattening with expansion state
- [ ] 3.3 Rework `filterReportRows` to filter leaf rows then rebuild the visible tree and subtotals from surviving leaves
- [ ] 3.4 Update `getReportExportBlockedReason` for grouping arrays (member filter exportable when `user`/`member` is a requested level; task-level rules analogous)
- [ ] 3.5 Update `report-view-model.spec.ts` for tree building, subtotal math, flatten/expand behavior, filter-rebuild, and export-blocked rules

## 4. Admin web data layer

- [ ] 4.1 Update `src/services/admin-reports-client.ts` and `src/composables/reports/useReportsData.ts` to send the ordered `groupBy` list and consume unified rows
- [ ] 4.2 Update `useReportExport.ts` / export query building to pass the grouping path; adjust `useReportOptions.ts` if option derivation touches row shape
- [ ] 4.3 Update composable spec files for the new query and row shapes

## 5. Admin web UI

- [ ] 5.1 Build the grouping-builder control in `ReportsTable.vue` per the "Admin Reports V2" .pen frame: ordered level chips with remove and reorder, "Add level" offering only unused dimensions, max 4, min 1 (follow `docs/ui/INDEX.md` routing and the pixel-parity checklist from `apps/admin-web/AGENTS.md`)
- [ ] 5.2 Render the hierarchy in the results table: indentation per level, expand/collapse chevrons on non-leaf rows, subtotal styling for group rows, overall total footer row
- [ ] 5.3 Add the new columns (entries, billable %, last activity) and align the filter row with the new column set; keep mobile card rendering coherent for grouped rows
- [ ] 5.4 Update `ReportsView.vue` wiring (grouping state, export guard) and `ManagementPageSkeleton`/desktop-row skeleton variants if column structure changed
- [ ] 5.5 Update `ReportsTable.spec.ts` and `ReportsView.spec.ts`: builder interactions (add/remove/reorder/cap), expand/collapse, subtotal correctness, total row, export request includes grouping path

## 6. Verification

- [ ] 6.1 API: `pnpm --filter @gitiempo/api lint && pnpm --filter @gitiempo/api typecheck && pnpm --filter @gitiempo/api test`; run e2e after `db:migrate` + `db:seed`
- [ ] 6.2 Admin web: `pnpm --filter admin-web lint && pnpm --filter admin-web typecheck && pnpm --filter admin-web test`
- [ ] 6.3 Confirm single-level `groupBy=project` requests return byte-compatible aggregates with pre-change behavior (regression check via e2e fixtures)
- [ ] 6.4 State in the final review whether any PrimeVue constraint forced a deviation from the approved .pen design (per `apps/admin-web/AGENTS.md` execution rule)
