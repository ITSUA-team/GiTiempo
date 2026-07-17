## 1. View model

- [x] 1.1 Add `reportEntriesFilterSchema` (`any | gte1 | gte10 | gte50`), `reportBillableShareFilterSchema` (`any | below50 | gte50 | gte90`), and `reportActivityFilterSchema` (`any | today | last7 | last30`) to `src/validation/report-view-model.ts`; extend `reportTableFiltersSchema` and default filters
- [x] 1.2 Extend `getReportExportBlockedReason` so the new filters block the export alongside search/hours/billable
- [x] 1.3 Implement the new predicates in `filterReportRows` with an optional `now` parameter (local-day "Today", rolling 7/30-day windows)
- [x] 1.4 Cover the new filters and export-blocking in `report-view-model.spec.ts`

## 2. Table UI

- [x] 2.1 Add the Entries, Billable %, and Last activity selects to the desktop filter row in `ReportsTable.vue` (existing filter-row treatment, per the "Report Filter Menus Spec" .pen frame)
- [x] 2.2 Add the same three controls to the mobile filter grid
- [x] 2.3 Cover the new controls in `ReportsTable.spec.ts` (rendering + filter model updates)

## 3. Docs and verification

- [x] 3.1 Update the Reports Page filter bullets in `docs/ui/pages-admin.md`
- [x] 3.2 Run `pnpm --filter admin-web lint && pnpm --filter admin-web typecheck && pnpm --filter admin-web test`
