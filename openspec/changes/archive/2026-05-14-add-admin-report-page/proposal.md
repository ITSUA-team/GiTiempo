## Why

The admin reports route is currently a placeholder even though the admin SPA requirements already call for filtered reporting, summary totals, and CSV export. Implementing the page now turns the documented reports workflow into a usable admin-web surface without changing backend APIs.

## What Changes

- Replace the `admin-web` reports placeholder with the approved `Admin Reports` page layout from `GITiempo.pen`.
- Add a reports header using the existing `StatsHeader`/`StatCard` pattern, including a primary CSV export action.
- Add PrimeVue-based report setup controls for project, member, date range, and group-by that define the CSV generation scope.
- Reuse the existing management-table conventions for searchable, column-filterable report rows with stable default ordering.
- Add report summary totals for tracked hours, billable share, average per member, and top project.
- Add a reports loading skeleton variant that matches the final page structure.
- Implement frontend-only CSV export by generating rows from the current report setup controls through existing project time-entry endpoints.
- Update the admin UI page requirements to document report setup controls, table-only discovery filters, and CSV scope explicitly.
- Keep implementation code scoped to `apps/admin-web` and reuse `@gitiempo/web-shared` components unchanged; do not modify API code, API contracts, backend behavior, or shared package behavior.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `admin-pages`: Clarify and implement the admin reports page behavior for report setup controls, table discovery filters, scoped rows, summaries, loading states, and frontend CSV export.

## Impact

- Affected app code: `apps/admin-web` only.
- Affected docs: `docs/ui/pages-admin.md` Reports Page behavior.
- Affected route: existing protected `/reports` route and `ReportsView.vue`.
- Reused UI: existing `@gitiempo/web-shared` `StatsHeader`, `StatCard`, `SurfaceCard`, `ManagementTableShell`, and existing management table styling conventions without changing `packages/web-shared`.
- Reused API surface: existing `GET /projects` and `GET /projects/:projectId/time-entries` behavior through admin-web frontend clients; no backend endpoint or shared contract changes.
- Verification: admin-web lint, typecheck, focused tests for report data derivation, report setup/export behavior, table discovery filters, and design parity review against `GITiempo.pen` node `p2VXD`. User-web verification is required only if a future edit touches shared frontend packages.
