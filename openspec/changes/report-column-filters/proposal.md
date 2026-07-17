## Why

The redesigned reports table shows Entries, Hours, Billable, Billable %, and Last activity columns, but only Hours and Billable have filters — the approved design update (GITiempo.pen "Admin Reports V2" filter row + "Report Filter Menus Spec") gives every column a filter so grouped results can be narrowed in place.

## What Changes

- Add table-only filters for the remaining columns: Billable % (Any · Below 50% · 50%+ · 90%+) and Last activity (Any time · Today · Last 7 days · Last 30 days). (Revised: the Entries column and its filter were removed from the reports table entirely.)
- Keep the existing project, member, hours, and billable filters; all filters apply to loaded leaf rows, rebuild the visible tree with its subtotals, and never call report data endpoints.
- Mobile filter section gains the same three controls.
- CSV export stays blocked while any aggregate-level filter is active (the new filters join hours/billable/search in that rule).
- The Entries column is removed from the table and the PDF export (revision requested after implementation).
- No backend or contract changes.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `admin-pages`: the "Reports Generation And Export" requirement's discovery-controls and export-blocking scenarios extend to entries, billable-share, and last-activity column filters.

## Impact

- `apps/admin-web/src/validation/report-view-model.ts`, `src/lib/report-view-model.ts` — filter schema, filtering logic, export-blocked rule; spec file.
- `apps/admin-web/src/components/reports/ReportsTable.vue` — filter-row and mobile filter controls; spec file.
- `apps/admin-web/src/views/ReportsView.spec.ts` — export-blocking coverage if affected.
- `docs/ui/pages-admin.md` — filter documentation.
