## Why

The approved reports redesign promised export "not only CSV but also a styled PDF" (GITiempo.pen "Report PDF Preview" frame). The API still only emits the detailed CSV; the reports page has a single `Export CSV` button.

## What Changes

- The export endpoint gains a `format` parameter (`csv` default, `pdf`). CSV behavior is unchanged — it stays the detailed project-task-user report the reports-api spec mandates.
- `format=pdf` returns a backend-generated PDF following the approved design: brand masthead, report period and workspace, filters/grouping summary line, summary strip, the grouped table rendered at the requested grouping path with per-level subtotal rows and indentation, a total row, and a footer with generation date and page numbers.
- The reports page `Export CSV` button becomes the design's `Export ▾` menu with "Export as CSV" and "Export as PDF"; both share the existing export-blocked rules and download flow.
- New backend dependency: `pdfmake` (server-side PDF composition, no headless browser).

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `reports-api`: adds a PDF export requirement — same endpoint, filters, scope rules, and date defaults as the CSV export, with grouped-path rendering; the CSV requirement is untouched.
- `admin-pages`: the export scenarios change from a single `Export CSV` action to an export menu offering CSV and PDF.

## Impact

- `packages/shared/src/contracts/reports.ts` — export query `format` field; OpenAPI regenerated.
- `apps/api` — `pdfmake` dependency, PDF builder + service method + controller wiring, unit and e2e coverage.
- `apps/admin-web` — reports client `format` passthrough, export menu in `ReportsView.vue`, tests.
- `docs/ui/pages-admin.md` — export documentation.
