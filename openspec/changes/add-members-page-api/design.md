## Context

The Admin Members page (`apps/admin-web`) shipped in `add-members-page` with the `Last Active` column rendering `—` and `Projects Assigned` computed client-side by counting the user across the already-loaded projects list. The API currently returns the `workspaceMemberResponseSchema` shape: `id`, `workspaceId`, `userId`, `email`, `displayName`, `avatarUrl`, `role`, `joinedAt` — with no activity or assignment count data.

The existing `MembersService.listMembers` (in `apps/api/src/members/services/members.service.ts:104`) performs a simple select + join between `workspace_members` and `users`. The `users` table currently has no `last_active_at` column.

Project assignments live in the `project_assignments` table (`apps/api/src/projects/schemas/project-assignments.schema.ts`) with a `(project_id, user_id)` unique index and a `workspace_id` FK. This is the source of truth for counting assignments per member.

All time-tracking write operations (timer start, timer start-from-github, timer stop, time-entry create/update/delete) live in `TimeEntriesService` (`apps/api/src/time-entries/services/time-entries.service.ts`).

Reference: `apps/api/AGENTS.md` for backend conventions, verification commands, and OpenAPI regen workflow.

## Goals / Non-Goals

**Goals:**

- Add `last_active_at timestamptz null` to the `users` table via Drizzle migration.
- Expose `lastActiveAt` on the users schema so it's available for queries.
- Create a lightweight `UsersActivityService` that bumps `users.last_active_at = now()` for a given user ID.
- Wire the activity bump into all six time-tracking write paths in `TimeEntriesService`.
- Update `MembersService.listMembers` to return `lastActiveAt` (from `users.last_active_at`) and `projectsAssignedCount` (from a sub-query counting `project_assignments` rows per user in the workspace).
- Extend `workspaceMemberResponseSchema` in `packages/shared` with the two new fields.
- Update the NestJS response DTO to confirm the new shape serializes correctly via `ZodSerializerDto`.
- Rebuild `@gitiempo/shared` and regenerate `packages/shared/openapi.json`.
- Add e2e tests covering the new fields.

**Non-Goals:**

- Backfilling `last_active_at` for historical time entries. The column starts null and populates on first post-migration write.
- Updating `last_active_at` from non-time-tracking paths (login, page views, etc.). Scoped to time-tracking writes only.
- Frontend changes — the admin-web already handles missing `lastActiveAt` gracefully and can wire the fields in a follow-up.
- Admin-level user profile editing (no `PATCH /users/:id`).
- Server-side pagination on the members list.

## Decisions

### `UsersActivityService` as an isolated injectable

Create a dedicated `UsersActivityService` in `apps/api/src/users/services/users-activity.service.ts` with a single method `touchLastActive(userId: string): Promise<void>`. This keeps the activity concern isolated and testable without coupling it to `TimeEntriesService` internals.

The service performs:
```sql
UPDATE users SET last_active_at = NOW() WHERE id = $1;
```

Alternatives considered:
- _Inline the update in each `TimeEntriesService` method._ Rejected: duplicates the logic 6 times and makes it harder to broaden later (e.g., add other write paths).
- _Use a Drizzle `.$onUpdate` hook._ Rejected: hooks don't exist on the `pgTable` definition level in Drizzle; this would require a custom wrapper.
- _Event-based (emit an event, listener bumps)._ Rejected: over-engineered for a single `UPDATE` call; adds async indirection and testing complexity for no clear benefit at this scale.

### Fire-and-forget activity bump (no await in hot path)

The activity bump is non-critical — if it fails, the time-tracking operation should still succeed. Each write method calls `this.usersActivityService.touchLastActive(userId)` **without** `await` so it doesn't block the response. Errors are caught and logged internally by the service.

Alternatives considered:
- _Await the bump._ Rejected: adds latency to every time-tracking write for a non-critical side effect.
- _Queue it._ Rejected: no queue infrastructure exists; the fire-and-forget pattern is sufficient given the low cost of a single indexed UPDATE.

### Sub-query for `projectsAssignedCount` in `listMembers`

Extend the `listMembers` query with a correlated sub-select:

```sql
SELECT ...,
  users.last_active_at,
  (SELECT COUNT(*)::int FROM project_assignments pa
   WHERE pa.user_id = workspace_members.user_id
     AND pa.workspace_id = workspace_members.workspace_id) AS projects_assigned_count
FROM workspace_members
INNER JOIN users ON users.id = workspace_members.user_id
WHERE workspace_members.workspace_id = $1;
```

Alternatives considered:
- _LEFT JOIN + GROUP BY._ Considered but correlated sub-select is simpler for Drizzle's query builder syntax and avoids grouping all other columns. Performance is equivalent for the small result sets expected (workspace members are typically <100).
- _Separate query and merge._ Rejected: unnecessary round-trip.

### Migration naming convention

Migration file: `NNNN_add_users_last_active_at.ts` (sequential number from `drizzle-kit generate`). Single `ALTER TABLE users ADD COLUMN last_active_at timestamptz NULL;` — no default, no backfill.

### Contract extension is additive (non-breaking)

Adding `lastActiveAt: z.iso.datetime().nullable()` and `projectsAssignedCount: z.number().int().min(0)` to `workspaceMemberResponseSchema` is additive. Existing consumers that don't use these fields are unaffected. The frontend already handles `undefined`/missing gracefully for `lastActiveAt` (renders `—`).

## Risks / Trade-offs

- [Fire-and-forget failures are silent] → Mitigation: the `UsersActivityService.touchLastActive` catches errors and logs them at `warn` level. A persistent failure (e.g., DB constraint issue) would surface in logs without breaking time-tracking.
- [Correlated sub-select performance at scale] → Mitigation: `project_assignments` already has an index on `(user_id)` and `(workspace_id)`. For workspaces with <1000 members this is negligible. If scale becomes a concern, a materialized count column can be introduced later.
- [`last_active_at` is null for all existing users] → Mitigation: the frontend already renders `—` for null. The column populates naturally as users perform time-tracking operations.
- [OpenAPI regen requires build-based workflow] → Mitigation: per `apps/api/AGENTS.md`, use the nest-build path for regeneration, not `pnpm openapi:export` directly (due to `tsx` metadata limitation).
- [Adding two fields to shared contract requires rebuilding `@gitiempo/shared`] → Mitigation: standard workflow — `pnpm --filter @gitiempo/shared build` before running API typecheck.

## Migration Plan

1. Generate Drizzle migration adding `users.last_active_at` column.
2. Run migration against dev DB (`pnpm --filter @gitiempo/api db:migrate`).
3. Implement `UsersActivityService` and wire into `TimeEntriesService` write paths.
4. Update `MembersService.listMembers` query to include the two new fields.
5. Extend `workspaceMemberResponseSchema` in `packages/shared`, rebuild package.
6. Regenerate `packages/shared/openapi.json` via build-based workflow.
7. Update/add e2e tests.
8. Run full verification: `pnpm --filter @gitiempo/api lint && typecheck && test && test:e2e`.

Rollback: `ALTER TABLE users DROP COLUMN last_active_at;` + revert the contract extension and regenerate. The column is nullable and has no downstream FK references, so removal is safe.

## Open Questions

- Should the activity bump be debounced (e.g., skip if `last_active_at` was updated within the last N minutes)? Current decision: no debouncing — the single UPDATE is cheap and the column being "more accurate" has no downside. Revisit only if DB write pressure becomes a concern.
