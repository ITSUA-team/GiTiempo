## Context

`apps/api` already has the backend foundation this change needs: Firebase-backed login, JWT access tokens carrying `workspaceId` and `role`, refresh-token rotation, workspace membership as the role source of truth, admin-only workspace/member/invite routes, and deterministic seed users for `admin`, `pm`, and `member` roles.

The missing layer is project and task management. Existing docs now define projects and tasks as provider-neutral core records, with provider-specific data stored in external reference tables. This matters because GitHub is the first integration, not the core domain model. Future time entries, reports, invoices, and Chrome Extension flows all need stable project/task IDs and project visibility semantics before they can be implemented safely.

This is a backend/API change. It affects `apps/api` and `packages/shared`, and it must follow `apps/api/AGENTS.md`: Drizzle schemas stay feature-owned and re-exported from `src/db/schema.ts`, DTOs wrap shared Zod contracts with `createZodDto`, API changes require OpenAPI refresh, and focused backend verification is `pnpm --filter @gitiempo/api lint && pnpm --filter @gitiempo/api typecheck && pnpm --filter @gitiempo/api test`.

## Goals / Non-Goals

**Goals:**

- Add backend persistence for provider-neutral projects, tasks, project assignments, and external provider references.
- Add shared contracts and API DTOs for project, task, and assignment flows.
- Add project list/create/read/update endpoints with role and project-visibility enforcement.
- Add admin-only project assignment endpoints for assigning `pm` and `member` users to projects.
- Add task list/create/read/update endpoints gated by project visibility.
- Add reusable authorization support for role checks and project visibility checks.
- Seed deterministic projects, assignments, and tasks for local development and e2e tests.
- Add focused tests for authorization, visibility, assignment, and soft-disable behavior.

**Non-Goals:**

- Frontend implementation in `apps/user-web` or `apps/admin-web`.
- GitHub OAuth, GitHub API sync, or Chrome Extension implementation.
- Time entries, running timers, reports, invoices, or billing behavior.
- Returning external refs in the first public project/task response contracts.
- Multi-workspace SaaS behavior beyond preserving `workspace_id` scoping.
- Background jobs, webhooks, or provider sync scheduling.

## Decisions

### D1. Add `ProjectsModule` and `TasksModule` as separate feature areas

- `ProjectsModule` owns project CRUD, project assignments, project external refs, and project visibility checks.
- `TasksModule` owns task CRUD and task external refs.
- Both modules consume membership context but do not move role ownership out of `MembersService`.

Why:

- Projects and tasks are distinct domain concepts and will grow separately once time entries and integrations arrive.
- Keeping assignments with projects avoids coupling membership administration to project-level visibility rules.

Alternatives considered:

- Put all work tracking in one `WorkModule`: rejected because it would quickly become a god module once time entries and reports are added.
- Put assignments in `MembersModule`: rejected because assignments are project-visibility state, not workspace-membership state.

### D2. Keep core tables provider-neutral and put provider data in external refs

Core tables:

- `projects`: `workspace_id`, `name`, `color`, `is_active`, timestamps.
- `tasks`: `workspace_id`, `project_id`, `title`, `status`, `is_active`, timestamps.
- `project_assignments`: `workspace_id`, `project_id`, `user_id`, `assigned_by`, `assigned_at`.

External ref tables:

- `project_external_refs`: provider object references for projects, e.g. GitHub repositories or Project V2 boards.
- `task_external_refs`: provider work-item references for tasks, e.g. GitHub issues.

External refs use `provider`, `external_type`, `external_id`, `external_key`, `external_url`, `metadata`, and `synced_at`.

Why:

- This follows ADR 004 and prevents GitHub from becoming a permanent part of the core project/task schema.
- `external_id` as string avoids JavaScript precision problems with provider numeric IDs.
- `external_key` supports natural lookups such as `owner/repo` or `owner/repo#123`.

Alternatives considered:

- Keep `github_*` columns on projects/tasks: rejected because it makes future providers expensive and leaks integration concerns into core contracts.
- Store all provider data only in JSONB metadata: rejected because lookup and uniqueness need indexed scalar columns.

### D3. Project visibility is assignment-based for non-admin users

- Admins have implicit access to every project in their workspace, active or inactive.
- `pm` and `member` users can see only projects where they have a `project_assignments` row and the project is active.
- Assignments remain valid when a user changes between `pm` and `member`; role controls allowed actions, assignment controls visibility.

Why:

- This matches the product rule agreed during exploration.
- It avoids stale assignment cleanup on role changes and keeps project visibility independent from role-level capabilities.

Alternatives considered:

- Assign only PMs: rejected because members also need explicit project visibility.
- Allow members to see all active projects: rejected because project visibility must be controlled through assignment.

### D4. Role checks and project visibility checks are separate

- Add reusable role authorization for `admin` and `admin/pm` route policies.
- Add project visibility checks for routes that operate on a project or task.
- Do not trust JWT role claims alone for sensitive checks; re-resolve current membership from the database as the existing `WorkspaceAdminGuard` does.

Why:

- JWT claims can be stale after role or membership changes.
- Separating role from visibility keeps policies readable:
  - `POST /projects`: role `admin` or `pm`.
- `PATCH /projects/:id`: role `admin` or `pm` plus project visibility; admin can target inactive projects and is the only role that can change project active state.
  - Task routes: any active member plus project visibility.

Alternatives considered:

- Use only token claims: rejected because role and membership changes must affect protected actions without waiting for token expiry.
- Build one large guard for every route: rejected because it would mix role checks, project lookup, and task lookup into one hard-to-test unit.

### D5. PM project creation auto-assigns the creator in one transaction

- Admin-created projects do not require an assignment for the admin.
- PM-created projects insert the project and assignment in the same transaction.
- If assignment creation fails, the project creation rolls back.
- The auto-assignment row sets `assigned_by` to the PM creator's own user ID. This is a self-assignment; the semantic "who initiated this assignment" is the PM creator, not an admin actor.

Why:

- PMs can create projects but must only manage projects they are assigned to.
- This avoids a newly created project becoming invisible or unmanageable to its creator.

Alternatives considered:

- Require admins to assign PM-created projects afterward: rejected because it creates a broken post-create state.
- Auto-assign admins too: rejected because admins have implicit access and do not need assignment rows.

### D6. Task writes are allowed for any active member with project visibility

- Any authenticated user with project visibility can create and update tasks in an active project.
- `PATCH /tasks/:id` can update `title`, `status`, and `isActive`.
- Task updates are rejected when the parent project is inactive, including for admins.

Why:

- The agreed product rule treats tasks as collaborative work items within visible projects.
- This keeps the initial backend simple and defers stricter authorship rules until a product need appears.

Alternatives considered:

- Restrict task updates to admins/PMs: rejected per agreed endpoint policy.
- Add `created_by` now: deferred because no ownership-based behavior is required yet.

### D7. Public project/task responses omit external refs initially

- Initial project/task responses expose core provider-neutral fields only.
- External refs remain internal until GitHub sync/integration APIs need to expose them.

Why:

- This keeps the first project/task API stable and avoids prematurely designing integration-facing response shapes.
- Integration refs can be added later as dedicated endpoints or expanded response contracts.

Alternatives considered:

- Include external refs immediately: rejected because no client flow in this change consumes them.

### D8. Seed data should create visibility fixtures, not only demo rows

Seed should add deterministic data under the default workspace:

- At least two active projects.
- At least one inactive project or test-created inactive project coverage.
- At least one PM assignment and one member assignment.
- A small set of active tasks per visible project.

Why:

- Existing e2e tests depend on deterministic seeded users and workspace state.
- Project visibility tests need assigned and unassigned project fixtures.

Alternatives considered:

- Create all test data inside e2e files: rejected because local development also benefits from realistic project/task data.

## Risks / Trade-offs

- [Risk] External ref workspace/project/task consistency can drift because refs denormalize `workspace_id` and sometimes `project_id`. → Mitigation: write service mutations transactionally and add DB constraints/indexes where Drizzle/Postgres support the shape cleanly.
- [Risk] Role claims in JWT can be stale. → Mitigation: authorization services re-read current membership for protected role and project-scope checks.
- [Risk] PM-created project auto-assignment is a multi-step mutation. → Mitigation: use a Drizzle transaction.
- [Risk] Project assignment target validation spans membership role and project workspace. → Mitigation: assignment creation must verify the target is an active workspace member with role `pm` or `member` before insertion.
- [Risk] E2E visibility tests can interfere with shared seed data. → Mitigation: use deterministic unique test rows or cleanup per test, and remember e2e files are not parallelized.
- [Trade-off] Public responses omit external refs. → Accepted because provider integration APIs are out of scope for this backend foundation change.

## Migration Plan

1. Add shared contracts first so DTOs can wrap stable Zod schemas.
2. Add Drizzle schemas and generate the SQL migration for project, assignment, task, and external ref tables.
3. Add services, controllers, and authorization helpers for project/task behavior.
4. Update seed data with deterministic projects, assignments, and tasks.
5. Add focused unit tests for authorization/visibility helpers and service edge cases.
6. Add e2e coverage for admin, PM, and member route policies.
7. Run focused backend verification and refresh OpenAPI artifacts.

Rollback:

- Revert application code and shared contracts.
- The new tables are additive and can be left in place during rollback if no production data depends on them yet.
- If rollback must remove tables, drop external ref tables first, then tasks, assignments, and projects.

## Planned File Changes

**`apps/api`**

- Add `src/projects/*` for schemas, DTOs, services, controllers, guards/helpers, and tests.
- Add `src/tasks/*` for schemas, DTOs, services, controllers, and tests.
- Update `src/db/schema.ts` to re-export new schemas.
- Update `src/db/seed.ts` to include deterministic project/task fixtures.
- Add a Drizzle migration under `apps/api/drizzle/*`.
- Update `src/app.module.ts` to import new modules.
- Add e2e tests under `apps/api/test/*` for project/task authorization and visibility.

**`packages/shared`**

- Add project, project assignment, and task contract schemas.
- Export new contracts from `packages/shared/src/index.ts`.
- Refresh `packages/shared/openapi.json` after API DTO/controller changes.

## Backend / Frontend Coordination

This change does not build UI, but it creates the shared contracts future web work will consume. The API should preserve existing route conventions used by current backend e2e tests (no extra `/api` prefix in controllers), while docs can continue to describe the deployed base path separately.

## Open Questions

None for this change. GitHub sync, external-ref response exposure, and time-entry integration are intentionally deferred.
