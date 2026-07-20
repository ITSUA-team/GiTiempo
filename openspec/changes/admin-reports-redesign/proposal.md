## Why

The admin reports page could only group time aggregates by a single dimension (project OR task OR member), so PMs could not answer layered questions like "who worked on what inside each project" without exporting and pivoting elsewhere. Only two of its columns had filters, and export was CSV-only. The approved reports redesign (GITiempo.pen, "Admin Reports V2" and "Report PDF Preview" frames; issue #309) calls for configurable ordered multi-level grouping of up to 4 levels rendered as an expandable hierarchy, a filter for every table column, and a styled PDF export beside the detailed CSV. This change ships that redesign end-to-end across shared contracts, the reports API, and the admin web app.

## What Changes

**Multi-level grouping**

- Extend the shared time-report contract so `groupBy` accepts an ordered list of 1–4 unique dimensions (`project`, `user`, `task`) instead of a single value.
- Extend the reports API aggregation to group completed time entries by the requested dimension path and return rows that carry the full identity tuple for their grouping path, so clients can assemble the hierarchy. Pagination operates on top-level groups with complete subtrees per page.
- Keep single-dimension requests behaving exactly as today (backward compatible: a one-element list is the existing behavior).
- Replace the admin reports page single "Group by" select with the grouping builder from the design: ordered level chips (remove, reorder, "Add level", max 4).
- Render report results as an expandable tree table: parent rows show subtotals for their subtree, child rows indent per level; columns follow the report row structure (hours, billable, billable %, last activity).

**Column filters**

- Add table-only filters for the remaining columns: Billable % (Any · Below 50% · 50%+ · 90%+) and Last activity (Any time · Today · Last 7 days · Last 30 days). (Revised: the Entries column and its filter were removed from the reports table entirely.)
- Keep the existing project, member, hours, and billable filters; identity filters and global search apply to loaded leaf rows, aggregate filters compare displayed top-level group totals, and no filter calls report data endpoints. The mobile filter section gains the same controls.
- Export stays blocked while any aggregate-level filter is active (the new filters join hours/billable/search in that rule).

**PDF export**

- The export endpoint gains a `format` parameter (`csv` default, `pdf`). CSV export accepts the same ordered `groupBy` list and records the full path as export metadata; exported rows stay at the detailed project-task-user granularity the reports-api spec already mandates.
- `format=pdf` returns a backend-generated PDF following the approved design: brand masthead, report period and workspace, filters/grouping summary line, summary strip, the grouped table rendered at the requested grouping path with per-level subtotal rows and indentation, a total row, and a footer with generation date and page numbers.
- The reports page `Export CSV` button becomes the design's `Export ▾` menu with "Export as CSV" and "Export as PDF"; both share the existing export-blocked rules and download flow.
- New backend dependency: `pdfmake` (server-side PDF composition, no headless browser).

Summary cards and PM scope behavior are unchanged. Out of scope (separate change from the same redesign): saved report presets.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `reports-api`: the report and export endpoints accept an ordered multi-level `groupBy` (1–4 unique dimensions); the JSON endpoint returns aggregate rows keyed by the full grouping path with subtotals derivable per level and paginates by top-level group; CSV export keeps detailed rows and records the path as metadata; a new requirement adds `format=pdf` producing the styled grouped PDF with the same filters, scope rules, and date defaults as the CSV export.
- `admin-pages`: the "Reports Generation And Export" requirement changes — the reports page exposes a configurable ordered grouping builder (up to 4 levels) instead of a single group-by select, renders results as an expandable hierarchy with per-level subtotals, exposes a column filter for every table column with aggregate filters compared against displayed group totals, and replaces the single `Export CSV` action with an export menu offering CSV and PDF.

## Impact

Affected layers: shared contracts, backend, and frontend. This change modifies contracts (`groupBy` list, unified row shape, export `format`); authentication behavior is unchanged.

- `packages/shared/src/contracts/reports.ts` — `timeReportGroupBySchema`, query/export query schemas, row discriminated union becomes a unified path-keyed row shape (**BREAKING** for `TimeReportRow`; admin-web is the only consumer and migrates in this change), `timeReportExportFormatSchema`; OpenAPI regenerates from the updated contract.
- `apps/api/src/reports/` — reports service aggregation SQL (Drizzle) with top-level-group pagination, controller query parsing and per-format response headers, CSV serializer, new PDF document builder (`report-pdf.ts`), `pdfmake` dependency, e2e/unit tests.
- `apps/admin-web/src/` — `ReportsTable.vue` (grouping builder, tree rendering, filter row), `ReportsView.vue` (export menu), `report-view-model.ts` (tree assembly, filters, export-blocked rules), reports composables and client (`format` passthrough), validation schemas, tests.
- `docs/ui/pages-admin.md` — reports page documentation.
