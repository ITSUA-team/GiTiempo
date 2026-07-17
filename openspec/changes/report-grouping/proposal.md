## Why

The admin reports page can only group time aggregates by a single dimension (project OR task OR member), so PMs cannot answer layered questions like "who worked on what inside each project" without exporting and pivoting elsewhere. The approved reports redesign (GITiempo.pen, "Admin Reports V2") calls for configurable, ordered multi-level grouping of 2–4 levels rendered as an expandable hierarchy.

## What Changes

- Extend the shared time-report contract so `groupBy` accepts an ordered list of 1–4 unique dimensions (`project`, `user`, `task`) instead of a single value.
- Extend the reports API aggregation to group completed time entries by the requested dimension path and return rows that carry the full identity tuple for their grouping path, so clients can assemble the hierarchy.
- Keep single-dimension requests behaving exactly as today (backward compatible: a one-element list is the existing behavior).
- CSV export accepts the same ordered `groupBy` list and records the full path as export metadata; exported rows stay at the detailed project-task-user granularity the reports-api spec already mandates.
- Replace the admin reports page single "Group by" select with the grouping builder from the design: ordered level chips (remove, reorder, "Add level", max 4).
- Render report results as an expandable tree table: parent rows show subtotals for their subtree, child rows indent per level; columns follow the report row structure (entries, hours, billable, billable %, last activity).
- Summary cards and PM scope behavior are unchanged.
- Out of scope (separate changes): saved report presets and PDF export from the same redesign.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `reports-api`: the report and export endpoints accept an ordered multi-level `groupBy` (1–4 unique dimensions); the JSON endpoint returns aggregate rows keyed by the full grouping path with subtotals derivable per level; CSV export keeps detailed rows and records the path as metadata.
- `admin-pages`: the "Reports Generation And Export" requirement changes — the reports page exposes a configurable ordered grouping builder (up to 4 levels) instead of a single group-by select, and the results table renders grouped rows as an expandable hierarchy with per-level subtotals.

## Impact

- `packages/shared/src/contracts/reports.ts` — `timeReportGroupBySchema`, query/export query schemas, row discriminated union becomes path-keyed row shape (contract change consumed by API and admin-web).
- `apps/api/src/reports/` — reports service aggregation SQL (Drizzle), controller query parsing, CSV serializer, e2e/unit tests.
- `apps/admin-web/src/` — `ReportsTable.vue`, `ReportsView.vue`, `report-view-model.ts`, `useReportsData.ts`, validation schemas, tests.
- OpenAPI export regenerates from the updated contract.
- Existing consumers of `TimeReportRow` (admin-web only) must migrate to the path-keyed row shape.
