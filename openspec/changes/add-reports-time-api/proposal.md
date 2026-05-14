## Why

Admins and project managers need a backend-supported time reporting surface before the admin Reports page can move beyond its route scaffold. The existing time-entry, project, assignment, and member foundations are now in place, so the API can safely expose scoped aggregate reports and CSV export without introducing invoice behavior yet.

## What Changes

- Add protected `GET /reports/time` for aggregated time reports filtered by project, member, and date range.
- Add protected `GET /reports/time/export` for CSV export using the same filters, aggregation, and authorization rules as the JSON report.
- Support report grouping by project, task, or user/member, with totals for tracked and billable time.
- Restrict reports to `admin` and `pm` roles; members remain forbidden.
- Scope PM report visibility to active public projects plus active private projects assigned to that PM.
- Default report date filters to the current calendar month when omitted, with `dateFrom` defaulting to the calendar-month start.
- Define shared Zod contracts and OpenAPI DTOs for report queries and JSON responses.

## Capabilities

### New Capabilities

- `reports-api`: Admin and PM time report aggregation, filtering, authorization, and CSV export.

### Modified Capabilities

- `api-conventions`: Clarify report date-filter defaults and shared report filtering vocabulary.
- `contracts`: Add shared report request and response contracts for backend validation and frontend clients.

## Impact

- `apps/api`: new reports feature module, controller, service, DTOs, tests, and OpenAPI output.
- `packages/shared`: new reports contract schemas and exports.
- `packages/shared/openapi.json`: regenerated API snapshot after DTO/controller changes.
- Existing PostgreSQL tables are queried for reports; no new persistence table is expected for MVP.
