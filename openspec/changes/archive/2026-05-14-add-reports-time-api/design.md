## Context

The admin Reports route exists as a protected `admin-web` scaffold, and docs define reports as an Admin/PM surface with project, member, date range, group-by, summary totals, table search/filtering, and CSV export. The backend already has the required source data: workspace-scoped users and memberships, projects, project assignments, tasks, and completed/running time entries.

The API currently exposes own and project-scoped time-entry lists, but it does not expose a report aggregate endpoint, shared report contracts, or OpenAPI paths for reports. This change adds the backend contract and implementation foundation for the admin Reports page without implementing invoice creation or a frontend reports UI.

## Goals / Non-Goals

**Goals:**

- Add JSON time reports for Admin/PM users at `GET /reports/time`.
- Add CSV export at `GET /reports/time/export` using the same filters and authorization scope as JSON reports.
- Support grouping by project, task, or user/member.
- Support project, member, date window, search, pagination, and sorting filters for the JSON report.
- Define shared Zod contracts and NestJS DTOs so backend validation, frontend clients, and OpenAPI stay aligned.
- Preserve PM scope rules: PMs may report on active public projects plus active private projects assigned to them.

**Non-Goals:**

- Building the Admin Reports UI.
- Creating invoices from report data.
- Persisting report snapshots, saved reports, scheduled reports, or audit history.
- Adding XLSX/PDF export.
- Recalculating or changing stored time-entry duration semantics.

## Decisions

### Add a dedicated Reports API module

Create a new backend feature module under `apps/api/src/reports` rather than expanding `TimeEntriesModule` or `ProjectsModule`. Reports combine time entries, tasks, projects, assignments, and users, so a dedicated module keeps reporting orchestration separate from CRUD ownership logic.

Alternatives considered:

- Add report methods to `TimeEntriesService`: rejected because time-entry ownership/mutation logic would become coupled to management reporting.
- Add reports under `ProjectsService`: rejected because user-grouped reports and export are not project CRUD concerns.

### Use existing tables, not report persistence

Reports are computed from completed time entries joined to tasks, projects, and users. No new table is required for MVP because reports are read-only, not saved or invoiced snapshots.

Alternatives considered:

- Materialized report table: rejected for MVP because it adds invalidation and migration complexity before data volume requires it.
- Invoice-like snapshot table: rejected because invoice creation is explicitly out of scope for this change.

### Resolve a default calendar-month date window

Report endpoints always operate with an effective date window. If `dateFrom` is omitted, it resolves to `00:00:00.000Z` on the first day of the current calendar month. If `dateTo` is omitted, it resolves to `00:00:00.000Z` on the first day of the next calendar month. Filtering remains closed-open by `time_entries.started_at`: `startedAt >= dateFrom` and `startedAt < dateTo`.

This gives the UI useful default data while preventing accidental unbounded workspace-wide scans.

### Apply reports-specific authorization scope

Report endpoints require `admin` or `pm`. Members receive `403 Forbidden` even if they can view project time-entry lists elsewhere.

Admin scope includes all projects in the current workspace. PM scope includes active public projects plus active private projects assigned to the current PM. PMs cannot filter by a private unassigned project, and such filters should produce no data rather than widening scope.

This intentionally aligns with the product decision for reports and avoids treating generic project visibility as permission to report on every private project.

### Aggregate completed time only

Reports aggregate only completed entries with non-null `endedAt` and `durationSeconds`. Running entries are excluded because their durations are not final and existing data-model invariants keep running duration empty.

Rows expose totals in seconds for precision, with frontend clients responsible for display formatting. Each row includes `totalSeconds`, `billableSeconds`, `nonBillableSeconds`, `entryCount`, `firstStartedAt`, and `lastStartedAt`.

### Use group-specific row contracts

The shared response should make the selected aggregation explicit. Rows are grouped by project, task, or user/member and carry the matching group context. Task rows include their parent project context; project rows include project context; user rows include member/user context.

This keeps frontend rendering predictable and avoids guessing whether a nullable field is absent because of grouping or missing data.

### Share one filtered aggregate query path for JSON and CSV

The service should build one scoped, filtered aggregate query path and use it for both JSON and CSV responses. JSON applies pagination to rows and returns summary totals for the full filtered result set. CSV export uses the same filters, grouping, sorting, and scope, but exports the full filtered aggregate result set rather than only the current page.

CSV should be generated without a new dependency unless implementation proves escaping or streaming needs justify one. Use `text/csv; charset=utf-8` and an attachment filename derived from the effective date window.

## Risks / Trade-offs

- Report queries may become expensive as `time_entries` grows -> require a bounded date window by default and evaluate whether an additional `(workspace_id, started_at, ended_at)` index is needed during implementation.
- PM scope mistakes could leak private project data -> centralize report scope conditions and test admin, PM public, PM assigned private, PM unassigned private, and member-forbidden cases.
- CSV export could drift from JSON filters -> share the same query-building logic for both endpoints.
- Group-specific rows add contract complexity -> keep the variants small and reuse shared project/task/user summary shapes where practical.
- Calendar defaults depend on UTC boundaries -> document and test UTC month-start behavior to avoid local-time ambiguity.

## Migration Plan

No data migration is expected for the MVP implementation. If query planning or test fixtures show weak performance, add a narrow Drizzle migration for a report-friendly time-entry index before implementation is considered complete.

Rollback is limited to removing the new reports module, shared contracts, and OpenAPI paths because no persisted report state is introduced.

## Open Questions

- None currently blocking. CSV is scoped to grouped aggregate rows, not raw time-entry export, unless a later UI requirement changes that.
