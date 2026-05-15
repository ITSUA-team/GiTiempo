## 1. Shared Contracts

- [x] 1.1 Add `packages/shared/src/contracts/reports.ts` with report group, query, summary, row, pagination, and response schemas.
- [x] 1.2 Export the reports contract from `packages/shared/src/index.ts`.
- [x] 1.3 Add focused shared contract tests for valid filters, invalid `groupBy`, invalid sorting, and response row variants.

## 2. Backend DTOs And Module Wiring

- [x] 2.1 Create `apps/api/src/reports` module structure with DTO wrappers using the shared report schemas.
- [x] 2.2 Add `ReportsModule` to `AppModule`.
- [x] 2.3 Add `ReportsController` with `GET /reports/time` and `GET /reports/time/export`, Swagger tags, bearer auth, JSON response DTOs, and CSV response metadata.

## 3. Report Query Implementation

- [x] 3.1 Implement effective UTC calendar-month date defaults for omitted `dateFrom` and `dateTo`.
- [x] 3.2 Implement Admin/PM role enforcement with members forbidden.
- [x] 3.3 Implement shared report scope conditions: admins see workspace projects; PMs see active public projects plus active private projects assigned to them.
- [x] 3.4 Implement completed-entry-only aggregate queries grouped by `project`, `task`, or `user`.
- [x] 3.5 Implement project, user, date window, case-insensitive search, sorting, pagination, and full-filtered summary totals.
- [x] 3.6 Evaluate whether a report-specific time-entry index is needed and add a Drizzle migration only if query shape or tests justify it.

## 4. CSV Export

- [x] 4.1 Reuse the JSON report filtering, grouping, sorting, and scope logic for export.
- [x] 4.2 Generate escaped CSV aggregate rows with group context, total seconds, billable seconds, non-billable seconds, entry count, first started at, and last started at.
- [x] 4.3 Return `text/csv; charset=utf-8` with an attachment filename derived from the effective report date window.

## 5. Backend Tests

- [x] 5.1 Add report service/controller tests for admin full-workspace access.
- [x] 5.2 Add PM scope tests for active public projects, assigned private projects, and unassigned private project exclusion.
- [x] 5.3 Add member-forbidden tests for JSON and CSV endpoints.
- [x] 5.4 Add date-default and closed-open started-at boundary tests.
- [x] 5.5 Add group-by project/task/user aggregation tests including billable and non-billable totals.
- [x] 5.6 Add JSON pagination and summary-not-limited-to-page tests.
- [x] 5.7 Add CSV export tests confirming it shares JSON filters and scope.

## 6. OpenAPI And Verification

- [x] 6.1 Regenerate `packages/shared/openapi.json` after DTO/controller changes.
- [x] 6.2 Run `pnpm --filter @gitiempo/shared test` or the focused shared-package test command available in the repo.
- [x] 6.3 Run `pnpm --filter @gitiempo/api lint`, `pnpm --filter @gitiempo/api typecheck`, and `pnpm --filter @gitiempo/api test`.
- [x] 6.4 Run `openspec status --change add-reports-time-api` and resolve any incomplete or invalid artifacts.
