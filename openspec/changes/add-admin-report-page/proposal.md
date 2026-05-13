## Why

The admin reports route is currently a placeholder even though the admin SPA requirements already call for filtered reporting, summary totals, and CSV export. Implementing the page now turns the documented reports workflow into a usable admin-web surface without changing backend APIs.

## What Changes

- Replace the `admin-web` reports placeholder with the approved `Admin Reports` page layout from `GITiempo.pen`.
- Add a reports header using the existing `StatsHeader`/`StatCard` pattern, including a primary CSV export action.
- Add PrimeVue-based report filters for project, member, date range, and group-by with 300ms debounced result refresh where API-backed filters are involved.
- Reuse the existing PrimeVue DataTable management-table conventions for sortable, searchable, column-filterable report rows.
- Add report summary totals for tracked hours, billable share, average per member, and top project.
- Add a reports loading skeleton variant that matches the final page structure.
- Implement frontend-only CSV export from the currently visible report rows.
- Keep the change scoped to `apps/admin-web`; do not modify API code, API contracts, or backend behavior.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `admin-pages`: Clarify and implement the admin reports page behavior for filtering, scoped rows, summaries, loading states, and frontend CSV export.

## Impact

- Affected app: `apps/admin-web` only.
- Affected route: existing protected `/reports` route and `ReportsView.vue`.
- Reused UI: `@gitiempo/web-shared` `StatsHeader`, `StatCard`, `SurfaceCard`, and existing management table styling conventions.
- Reused API surface: existing `GET /projects` and `GET /projects/:projectId/time-entries` behavior through admin-web frontend clients; no backend endpoint or shared contract changes.
- Verification: admin-web lint, typecheck, focused tests for report data derivation/export/filter behavior, and design parity review against `GITiempo.pen` node `p2VXD`.
