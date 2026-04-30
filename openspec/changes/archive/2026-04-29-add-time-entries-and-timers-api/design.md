## Context

`apps/api` already has the prerequisites for time tracking: Firebase-backed JWT auth, workspace membership as the role source of truth, provider-neutral projects and tasks, assignment-based project visibility, external provider reference tables, and deterministic seed data for admin, PM, and member users. The current gap is that there is no `time_entries` table, no timer lifecycle, no manual entry API, and no shared contracts for frontend or Chrome Extension clients.

This is a backend-led change affecting `apps/api` and `packages/shared`. It must follow `apps/api/AGENTS.md`: Drizzle schemas stay feature-owned and re-exported from `src/db/schema.ts`, API DTOs wrap shared Zod contracts with `createZodDto`, API contract changes require OpenAPI refresh, and focused API verification is `pnpm --filter @gitiempo/api lint && pnpm --filter @gitiempo/api typecheck && pnpm --filter @gitiempo/api test`. E2E verification still requires a migrated and seeded PostgreSQL database.

The change also intersects the product docs: `docs/DATA-MODEL.md` defines `time_entries`, `docs/API-ENDPOINTS.md` defines timer and CRUD endpoints, and `docs/TECHNICAL-REQUIREMENTS.md` defines Chrome Extension lazy creation. One deliberate deviation is approved for this change: `time_entries.invoice_id` is deferred until invoices are implemented, because there is no `invoices` table or reporting layer yet.

## Goals / Non-Goals

**Goals:**

- Add `TimeEntriesModule` with feature-owned Drizzle schema, DTOs, controller, service, and tests.
- Add `time_entries` persistence with task/user/workspace ownership, start/end timestamps, stored `duration_seconds`, optional description, billable flag, and source.
- Enforce one running timer per user through a PostgreSQL partial unique index on `user_id` where `ended_at IS NULL`.
- Add own-entry APIs: list with filters, create manual entry, get, update, and delete.
- Add timer APIs: get current timer, start against existing task, start from GitHub issue data, and stop current timer.
- Add read-only project time-entry listing for visible projects, including entries from other users.
- Add shared contracts in `packages/shared` for requests, responses, query parameters, and source/status vocabulary.
- Add focused unit and e2e tests for timer lifecycle, manual entries, filters, authorization, and Chrome lazy-create behavior.

**Non-Goals:**

- Invoices, reports, billing aggregation, invoice linkage, or `time_entries.invoice_id`.
- Full GitHub OAuth, GitHub API sync, webhooks, background sync, or GitHub token validation.
- Frontend implementation in `apps/user-web`, `apps/admin-web`, or a Chrome Extension package.
- Preventing all overlapping completed intervals. This change only enforces one running timer per user.
- Recalculating future invoices or report totals after time-entry edits.

## Decisions

### D1. Create a separate `TimeEntriesModule`

- `TimeEntriesModule` owns the `time_entries` schema, DTOs, controller, service, and tests.
- It depends on `TasksModule`/`ProjectsModule` behavior for task/project visibility instead of duplicating authorization logic.
- `TasksService` should expose a reusable task lookup suitable for time tracking, or `TimeEntriesService` should perform an equivalent join-based visibility check if exposing a method would leak too much internals.

Why:

- Time entries will later feed reports, invoices, dashboard widgets, and integrations. Keeping them separate avoids growing `TasksModule` or `ProjectsModule` into a broad work-tracking module.
- Existing project/task modules already define the visibility model; time tracking should consume that model rather than invent a parallel one.

Alternatives considered:

- Add time-entry behavior directly to `TasksModule`: rejected because timer lifecycle and entry CRUD are a separate domain.
- Create one large `WorkModule`: rejected for the same reason as the prior project/task change; it would become a god module once reports and invoices arrive.

### D2. Store `duration_seconds` as app-computed data with DB invariants

- Running entries have `ended_at = NULL` and `duration_seconds = NULL`.
- Completed entries have `ended_at IS NOT NULL` and a positive integer `duration_seconds` computed by application code as elapsed whole seconds.
- Manual create, timer stop, and completed-entry update all recompute `duration_seconds` in the service before writing.
- The migration should add check constraints that keep running/completed duration state consistent and require `ended_at > started_at` for completed entries.

Why:

- Docs require a stored `duration_seconds` field and future reports/invoices will benefit from fast aggregation.
- App-computed storage is simpler than Drizzle/PostgreSQL generated expressions for this change while still giving stable response values.
- DB checks reduce drift if future code paths write inconsistent timestamps.

Alternatives considered:

- DB-generated column: stronger invariant, but more Drizzle/migration complexity now.
- Compute only on read: simpler schema, but conflicts with docs and makes future aggregation less direct.

### D3. Use partial unique index plus transaction-aware writes for timers

- `time_entries_running_unique` is a unique index on `user_id` where `ended_at IS NULL`.
- `start` inserts a running entry directly and maps unique violations to `409 Conflict` with a stable message.
- `stop` runs in a transaction, locks or otherwise targets the user's current running row, sets `ended_at`, recomputes duration, and returns the completed entry.
- Multi-step flows that find or create project/task external refs then start a timer run in one transaction.

Why:

- A pre-check alone is race-prone. The database must be the final authority for one running timer per user.
- Transactions are required for read-then-write stop behavior and Chrome lazy creation.

Alternatives considered:

- Service-only check for existing running timers: rejected because concurrent requests can both pass the check.
- Stop by updating without checking: rejected because the API needs a clear not-found response when no timer is running.

### D4. Only completed entries can be updated or deleted

- `PATCH /time-entries/:id` rejects running entries with `409 Conflict` or `422 Unprocessable Entity`; implementation should choose one and test it consistently.
- `DELETE /time-entries/:id` also rejects running entries. Users must call `POST /time-entries/timer/stop` before editing or deleting.
- Manual create always creates completed entries.

Why:

- This keeps timer lifecycle explicit and prevents accidental loss of active timer state.
- It matches the agreed product direction: first stop, then edit/delete.

Alternatives considered:

- Allow delete as discard running timer: rejected because it creates a second stop-like pathway with different semantics.
- Allow patching running start time/description only: deferred until there is a concrete UX need.

### D5. List filters use `started_at` range semantics

- `dateFrom` filters entries with `started_at >= dateFrom`.
- `dateTo` filters entries with `started_at < dateTo`.
- This applies to own-entry lists and project time-entry lists.
- Reports may later use interval overlap and duration clipping, but that is intentionally separate from list semantics.

Why:

- Time-entry list pages group entries by the day they started. Started-at filtering is predictable for UI lists and simple to index.
- Using half-open ranges avoids double-counting entries at day boundaries when clients page through adjacent periods.

Alternatives considered:

- Overlap filtering with `started_at < dateTo AND COALESCE(ended_at, now()) > dateFrom`: better for reporting, but surprising for entry lists and incomplete without duration clipping.

### D6. Add Chrome Extension lazy-create endpoint using existing external refs

- `POST /time-entries/timer/start-from-github` accepts `githubRepo`, `issueNumber`, and `issueTitle`.
- The service finds or creates a provider-neutral project for `githubRepo` and a provider-neutral task for the issue.
- It stores provider-specific identity in `project_external_refs` and `task_external_refs` using provider `github`, external type `repository`/`issue`, and natural keys like `owner/repo` and `owner/repo#123`.
- The endpoint does not call GitHub APIs, validate repository membership, or require a connected GitHub account in this change.
- The started time entry uses source `extension`.

Why:

- Docs require the extension to start timers with one API call and lazy-create missing project/task records.
- Existing external ref tables were explicitly introduced to support this provider-neutral flow.
- Avoiding GitHub API calls keeps this change focused on local persistence and timer behavior.

Alternatives considered:

- Defer the endpoint entirely: rejected by product decision; extension-facing endpoints should exist now.
- Require GitHub OAuth and API validation now: rejected as a larger integration change.

### D7. Project time-entry read is visible-project scoped, not ownership scoped

- `GET /projects/:id/time-entries` requires project visibility through existing project rules.
- Admins can read entries for any workspace project, including inactive projects.
- PMs and members can read entries only for assigned active projects.
- The endpoint is read-only; mutation endpoints remain own-entry only.

Why:

- Docs require team time visibility inside assigned projects while preserving member read-only behavior for other users' entries.
- Existing `ProjectsService.requireVisibleProject()` already encodes the correct project access policy.

Alternatives considered:

- Admin/PM-only team time reads: rejected because product docs allow members to view other users' entries in assigned projects.
- Reuse own-entry list with optional `userId`: rejected because it would blur owner-scoped and project-scoped permissions.

### D8. Keep response shapes task/project-aware enough for clients

- Time-entry responses should include core time-entry fields plus enough task/project display context for current UI needs: task id/title and project id/name are useful for lists and current timer widgets.
- The stored table remains normalized; display context can be selected via joins.
- Shared contracts should not expose provider external ref internals in the first time-entry response shape.

Why:

- User SPA docs expect rows to show task, project, time range, duration, edit, and delete without requiring N+1 client calls.
- Keeping provider refs out of response shape matches the existing project/task API decision.

Alternatives considered:

- Return only ids: minimal backend response, but pushes extra round trips and coupling onto clients.
- Embed full task/project resources: unnecessarily broad and makes response stability harder.

## Risks / Trade-offs

- [Risk] Unique-constraint errors from concurrent timer starts can surface as 500s if not mapped. -> Mitigation: detect Postgres unique violation for `time_entries_running_unique` and return `409 Conflict`.
- [Risk] App-computed `duration_seconds` can drift if future writers forget to recompute it. -> Mitigation: centralize create/stop/update logic in `TimeEntriesService` and add DB check constraints for null/positive state.
- [Risk] Chrome lazy-create can create projects visible only to admins unless assignment policy is addressed. -> Mitigation: for non-admin extension starts, create or ensure a project assignment for the acting user in the same transaction, mirroring PM project-creation visibility semantics for extension-created projects.
- [Risk] Extension endpoint can create arbitrary `githubRepo` strings because GitHub API validation is deferred. -> Mitigation: validate strict repo/name format, store provider refs only, and defer external authorization to the GitHub integration change.
- [Risk] List filtering by `started_at` differs from future reporting overlap semantics. -> Mitigation: document the list behavior in OpenSpec now and define report semantics separately later.
- [Risk] OpenAPI export can be sensitive to Nest decorator metadata. -> Mitigation: follow `apps/api/AGENTS.md` and use the build-based `openapi:export` workflow already configured in `apps/api/package.json`.

## Migration Plan

1. Add shared time-entry contracts and export them from `packages/shared`.
2. Add `time_entries` Drizzle schema and re-export it from `apps/api/src/db/schema.ts`.
3. Generate/add the PostgreSQL migration for `time_entries`, indexes, partial unique index, and check constraints.
4. Add `TimeEntriesModule`, DTOs, controller, and service.
5. Add/adjust project/task service helpers needed by time tracking and Chrome lazy creation.
6. Add unit tests for duration calculation, running-entry restrictions, timer conflicts, and lazy-create decisions.
7. Add e2e tests for own CRUD, timer start/stop/current, project time-entry reads, filters, and Chrome start-from-GitHub.
8. Refresh OpenAPI output after API DTO/controller changes.
9. Run focused backend/shared verification.

Rollback:

- Revert shared contracts and API code.
- Drop `time_entries` after dependent code is removed. No invoice/reporting data depends on it in this change.
- If production data has been collected, export or archive entries before dropping the table.

## Planned File Changes

**`apps/api`**

- Add `src/time-entries/time-entries.module.ts`.
- Add `src/time-entries/schemas/time-entries.schema.ts`.
- Add `src/time-entries/dto/*` wrappers around shared Zod schemas.
- Add `src/time-entries/controllers/time-entries.controller.ts`.
- Add `src/time-entries/services/time-entries.service.ts` and focused specs.
- Update `src/db/schema.ts` to export the new schema.
- Update `src/app.module.ts` to import `TimeEntriesModule`.
- Add a Drizzle migration under `apps/api/drizzle/*`.
- Add e2e coverage under `apps/api/test/*`.
- Update `src/db/seed.ts` only if deterministic time-entry fixtures are needed for tests; prefer test-created entries to avoid time-sensitive seed data.

**`packages/shared`**

- Add `src/contracts/time-entries.ts`.
- Export the new contracts from `src/index.ts`.
- Refresh `packages/shared/openapi.json` after API changes.

## Backend / Frontend Coordination

This change does not build UI, but it defines the contracts future user-web dashboard, timer, time-entry list, project view, and Chrome Extension code will consume. The backend should return ISO datetime strings and stored seconds while frontend code remains responsible for formatting durations as `Xh Ym` for completed entries and `HH:MM:SS` for running timers.

## Open Questions

None. Invoice linkage is intentionally deferred, Chrome API validation against GitHub is deferred to the GitHub integration change, and list date filtering is explicitly `started_at` based for this change.
