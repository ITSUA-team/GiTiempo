## Context

`apps/admin-web` already has an authenticated Reports route matching the approved `GITiempo.pen` Admin Reports screen. The current implementation must keep the existing report setup model where header controls define CSV export scope instead of rewriting the currently loaded table and summary state.

The completed `add-reports-time-api` change introduced shared `TimeReport*` contracts plus `GET /reports/time` and `GET /reports/time/export`. That change explicitly did not build the Admin Reports UI, so this change wires the existing page to those API contracts without changing backend behavior. `add-reports-time-api` is a prerequisite for implementation and deployment of this change.

## Goals / Non-Goals

**Goals:**

- Make `Export CSV` request the backend CSV export endpoint with the same report setup controls.
- Preserve frontend table rows as backend-generated project-member time breakdowns: member, project, tracked time, billable time, billable share, and entry count.
- Keep the visible Reports layout aligned with `docs/ui/INDEX.md`, `docs/ui/pages-admin.md`, and `GITiempo.pen` node `p2VXD`.
- Remove app-local CSV serialization and local report form schema in favor of shared reports contracts and small UI-only mapping/formatting code.
- Preserve table-only discovery controls: global search and column filters refine the currently loaded rows locally and do not alter export scope.

**Non-Goals:**

- Changing reports backend endpoints, shared response contracts, or PM scope rules.
- Adding invoices, saved reports, scheduled reports, XLSX/PDF export, or raw time-entry export.
- Adding database migrations.

## Decisions

### Extend the existing admin reports client

`apps/admin-web/src/services/admin-reports-client.ts` will own the `/reports/time` and `/reports/time/export` calls because it already owns the Reports feature fetch boundary. The client will parse query objects with `timeReportQuerySchema` and `timeReportExportQuerySchema`, parse JSON responses with `timeReportResponseSchema`, and request CSV with the same shared error-message handling used by existing clients.

Alternative considered: create a second reports API client for aggregate reports. Rejected because it would split one endpoint family across overlapping clients and violate the frontend client ownership rule.

### Use backend report generation for the frontend table

The Reports table is a frontend discovery surface and must continue to show member/project time breakdowns. `useReportsData` will keep using `AdminProjectsClient.listProjects` for selector options, then request backend report rows grouped by user within each visible project so the table preserves member identity without loading raw project time entries. Backend report endpoints are used for both table rows and CSV export.

Alternative considered: render table rows directly from a single `GET /reports/time` project aggregate response. Rejected because project aggregates collapse member context, which breaks the required table meaning.

### Keep report setup state export-only

The setup controls define backend CSV export scope: project, member, date range, and group-by map to `projectId`, `userId`, `dateFrom/dateTo`, and `groupBy` only when exporting. Control changes do not refresh the loaded table or summary state. Table search and column filters remain local discovery controls over the loaded backend-generated rows.

Alternative considered: apply setup controls to the table request immediately. Rejected because the Reports UI previously treated these controls as CSV-generation scope, and the table has separate discovery filters.

### Treat CSV export as a backend file response

The route view will call the reports client export method and download the returned Blob using the filename from `Content-Disposition` when available. A `204`/empty-body special case is not expected because the endpoint returns CSV headers even for no rows. Empty currently loaded table data or empty table-only filter results must not skip the backend export request; informational empty-data feedback may be shown only after or alongside a completed backend export, not as a replacement for it.

Alternative considered: keep browser CSV generation around as a fallback. Rejected because the backend endpoint is the new source of truth and fallback generation would preserve stale local aggregation logic.

### Replace stale helpers with UI view-model mapping

The old `reports-helpers.ts` and `reports-filter-schema.ts` will be removed. Any remaining frontend code should be limited to display formatting, table-filter defaults, date-range conversion, and mapping backend `TimeReportResponse.items` into the existing table presentation model.

Alternative considered: patch the existing helper file to consume API rows. Rejected because the file name and contents would keep stale frontend aggregation and local schema responsibilities alive.

## Risks / Trade-offs

- Project time-entry loading can issue multiple requests for all-project table scope -> keep the bounded visible-project behavior and page through project entries with the existing max page size.
- Table filter changes can trigger extra requests if wired incorrectly -> keep member search/filter table-local and debounce only table project/date refreshes.
- Local docs currently describe frontend CSV generation -> update the Reports page docs/spec language in this change so implementation and documentation remain aligned.
- Export filename depends on response headers -> fall back to a deterministic `time-report.csv` filename if the header is unavailable.

## Migration Plan

This is a frontend-only migration. Deploying the frontend after the reports API is available switches the Reports page to the backend endpoints. Rollback is limited to reverting the admin-web changes because no persisted data or backend behavior changes are introduced.

## Open Questions

- None blocking.
