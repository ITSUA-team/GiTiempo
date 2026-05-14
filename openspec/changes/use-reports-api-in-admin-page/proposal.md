## Why

The Admin Reports page shows project-member table rows, and both table data and CSV export should now come from the reports API. The page needs to preserve the existing table semantics while moving report generation to backend endpoints.

## What Changes

- Replace browser-built CSV export with the shared `GET /reports/time/export` CSV endpoint.
- Keep the approved Reports page structure: header export action, project/member/date/group setup controls, summary cards, searchable/filterable results table, skeleton, request-error, and empty states.
- Use shared reports contracts for query and response validation instead of admin-web-local report schemas/helpers.
- Preserve frontend table rows as project-member time breakdowns from backend-generated report data.
- Remove stale frontend-only CSV/schema files and update tests around the reports client, composable, view, and table behavior.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `admin-pages`: Admin Reports page behavior changes from browser-generated CSV export to backend CSV export while preserving existing table behavior and export setup behavior.

## Impact

- Affected app code: `apps/admin-web/src/views/ReportsView.vue`, `apps/admin-web/src/components/reports/*`, `apps/admin-web/src/composables/useReportsData.ts`, and `apps/admin-web/src/services/admin-reports-client.ts`.
- Removed app-local files: `apps/admin-web/src/lib/reports-helpers.ts`, `apps/admin-web/src/lib/reports-filter-schema.ts`, and their tests.
- Shared contracts consumed: `packages/shared/src/contracts/reports.ts`.
- Prerequisite: `add-reports-time-api` must be available before this frontend change ships because this change consumes `GET /reports/time` and `GET /reports/time/export` without redefining those contracts.
- No backend, shared contract, database, or migration changes are expected.
