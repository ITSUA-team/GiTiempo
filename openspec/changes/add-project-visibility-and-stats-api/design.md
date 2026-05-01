## Context

Project access is currently assignment-scoped for non-admin users: admins can list and read all workspace projects, while PMs and members can access only assigned active projects. The same `ProjectsService.requireVisibleProject` path protects project reads, task access, project time-entry lists, and timer starts, so changing project visibility affects several backend flows.

Project source is already represented through `project_external_refs`. Core project rows are intentionally provider-neutral, so the API should expose an MVP source label without moving provider identity into `projects`.

The admin and user project pages need summary cards and richer project rows. Those values depend on completed time entries and visibility scope, so they should be calculated server-side and exposed through shared contracts.

Affected file groups:

- `apps/api`: Drizzle schema/migration, project service/controller/DTOs, access checks, tests, and OpenAPI export.
- `packages/shared`: Zod contracts and exported response/input types.
- `apps/admin-web` and `apps/user-web`: future consumers of new fields/endpoints; implementation can remain backend-first, but contracts must be stable for both SPAs.

## Goals / Non-Goals

**Goals:**

- Add project `visibility` with `public | private`, defaulting to `private`.
- Preserve current safety for existing data by backfilling current projects as `private`.
- Let all active workspace members access active public projects without assignment.
- Keep private project access assignment-scoped for non-admin users.
- Keep admins able to access and edit every workspace project, including inactive projects.
- Add `visibility`, MVP `source`, and `totalHours` to project responses.
- Add management and user project summary endpoints with shared contracts.
- Keep archive/unarchive as `PATCH /projects/:id` with `{ isActive }`, with active-state mutation admin-only.

**Non-Goals:**

- Do not add provider-specific columns such as `github_*` to core project records.
- Do not redesign project assignments, workspace roles, or membership.
- Do not add project-level permission roles beyond public/private visibility.
- Do not count running time entries or incomplete entries in project hour totals.
- Do not implement frontend project pages in this change.

## Decisions

### Store Visibility On Projects

Add a `visibility` column to `projects` with allowed values `public` and `private`. New and existing projects default to `private`.

This keeps visibility queryable and indexable without interpreting assignment rows as visibility state. Inferring public/private from assignments was rejected because it would make "public" ambiguous and would not provide a stable API field for clients.

### Treat Visibility As Scope, Not A Replacement For Role Checks

Public visibility grants non-admin users the same project-scoped access they would get from an assignment: project read, task access, team project time-entry list, and time tracking on active work. Private projects continue to require assignment for the same project-scoped access.

Role checks still gate management capabilities. Admins can update any project and change `isActive`. PMs can update mutable project metadata on visible active projects but cannot change `isActive`. Members remain unable to call project mutation endpoints unless a later change explicitly widens that role policy.

This preserves current role boundaries while expanding project scope through a single shared visibility rule. Creating separate guards per endpoint was rejected because it would duplicate the access policy already centralized in `ProjectsService.requireVisibleProject`.

### Keep Archive/Unarchive On PATCH

Archive and unarchive remain ordinary project updates via `PATCH /projects/:id` with only `{ isActive: false }` or `{ isActive: true }`. The shared update contract already permits `isActive` as the only supplied field, so implementation should add explicit admin e2e coverage rather than introduce a separate action endpoint.

Dedicated archive endpoints were rejected for MVP because they would duplicate an existing contract path and require additional frontend action wiring.

### Derive Source From External References

Expose MVP project `source` as `manual | github`. A project with at least one GitHub project external reference is reported as `github`; otherwise it is reported as `manual`.

Adding `source` to `projects` was rejected because it would conflict with the provider-neutral data model and duplicate information already represented by external refs. Future providers can extend the public enum and source-derivation rules without changing the core source of truth.

### Aggregate Hours Server-Side

Expose `totalHours` as a numeric hour total derived from completed time entries only. The aggregate should sum non-null `duration_seconds` through `tasks.project_id`, divide by 3600, and return zero when no completed entries exist.

Client-side aggregation was rejected because clients may not have all project entries and the admin/user SPAs would duplicate business logic.

### Add Dedicated Summary Endpoints

Add `GET /projects/management-summary` and `GET /projects/my-summary` rather than embedding summary cards into the project list.

`GET /projects/management-summary` returns active visible project counts for the current user scope:

- `activeProjects`
- `privateProjects`
- `publicProjects`

For admins, scope is all active workspace projects. For PMs, scope is active public projects plus active assigned projects, counted distinctly.

`GET /projects/my-summary` returns:

- `visibleProjects`
- `trackedHoursWeek`
- `trackedHoursMonth`

The user summary is scoped to the authenticated user's own tracked completed entries. Week and month windows are calendar-based. Because the workspace model does not yet expose a timezone, the MVP should use UTC boundaries: ISO week starting Monday 00:00 UTC and calendar month starting on the first day at 00:00 UTC.

Embedding summaries in `GET /projects` was rejected because summary cards do not need full project rows and should not be coupled to list pagination or sorting.

## Risks / Trade-offs

- Public projects expand non-admin visibility across project-scoped endpoints. Mitigation: centralize the rule in `requireVisibleProject` and add e2e coverage for list/read/tasks/time-entry/timer behavior.
- `isActive` could accidentally become editable by PMs or members when public scope broadens access. Mitigation: keep active-state authorization as a separate explicit admin-only check in `updateProject`.
- Project list aggregation can become expensive if implemented with per-project queries. Mitigation: use grouped SQL joins/aggregates for `source` and `totalHours` instead of N+1 queries.
- `source` can be ambiguous if a project has multiple provider refs. Mitigation: MVP rule is deterministic: any GitHub project ref produces `github`; no recognized refs produces `manual`.
- Calendar stats may later need workspace-local timezone. Mitigation: document UTC MVP behavior in specs and keep date-window calculation isolated for future replacement.

## Migration Plan

1. Update `projects` Drizzle schema with `visibility` and a database constraint/default for `public | private`.
2. Generate/add a migration that adds the column, backfills existing rows to `private`, sets `NOT NULL`, and creates any useful workspace/active/visibility index.
3. Update seed data to preserve private defaults unless a fixture intentionally needs public behavior.
4. Update shared contracts for project responses, project update/create payloads if visibility is made mutable, and summary responses.
5. Update `ProjectsService` queries and response mapping to return visibility, source, and totalHours.
6. Update visibility checks so non-admin users can access active public projects or active assigned projects.
7. Add summary endpoints and controller DTO metadata.
8. Add/adjust unit and e2e tests for private default behavior, public access, admin archive/unarchive, source derivation, totalHours, and summary calculations.
9. Run API verification and export OpenAPI through the build-based workflow required by `apps/api/AGENTS.md`.

Rollback is straightforward while the feature is backend-only: remove consumers of the new fields/endpoints, then roll back the migration if no deployed data depends on non-private visibility. After frontend code starts using public visibility, rollback requires first converting any public projects back to private or preserving the column while disabling public-access behavior.

## Open Questions

None for implementation. Future provider support and workspace-local timezone handling are intentionally deferred beyond the MVP rules above.
