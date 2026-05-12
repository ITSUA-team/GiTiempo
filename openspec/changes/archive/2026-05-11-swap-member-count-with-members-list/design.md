## Context

The project list and single-project GET endpoints currently include a `memberCount: number` scalar, computed via a correlated SQL subquery joining `project_assignments` and `workspace_members`. Consumers now need the full list of assigned members (id, display name, email, avatar, role) to render team rosters without extra round-trips.

The `projectAssignmentResponseSchema` already defines a rich member shape in `packages/shared/src/contracts/projects.ts`. The existing `GET /workspaces/:id/projects/:projectId/assignments` endpoint returns full assignment data, but requiring a separate call per project is expensive for list views.

The change is purely additive-then-removative: swap `memberCount` out and `members` in across the contract, service query, DTO, and any tests.

## Goals / Non-Goals

**Goals:**
- Replace `memberCount: number` with `members: ProjectMember[]` in the project response schema (contract, DTO, service).
- Compute `members` via a single correlated JSON aggregation (or lateral join with `json_agg`) per project row — no N+1 queries.
- Update or replace E2E tests that assert `memberCount` to assert the `members` array shape.
- Update any frontend code that consumes `memberCount` (none found currently, but verify at implementation time).

**Non-Goals:**
- Pagination or filtering of the `members` array (full list per project is acceptable given typical team sizes).
- Changing assignment write endpoints (`POST/DELETE /assignments`).
- Changing the dedicated `GET /assignments` endpoint — it remains available for detailed assignment data.
- Any frontend UI changes (no current consumers of `memberCount` detected in `apps/user-web` or `apps/admin-web`).

## Decisions

### D1: Use `json_agg` correlated subquery for members

**Decision**: Replace the `COUNT(*)` correlated subquery with a `json_agg` correlated subquery that returns a JSON array of member objects, then parse it in the service layer.

**Alternatives considered**:
- *Lateral join*: Idiomatic Drizzle (`.lateral()` is available in drizzle-orm ≥0.30, project uses 0.45.x) but requires building the lateral subquery object separately and is less familiar in this codebase; `json_agg` subquery works cleanly with the existing `sql<>` escape hatch already used for `totalHours` and `source`.
- *Separate query + in-memory join*: Would require fetching all assignments for all visible projects and merging in JS — avoids SQL complexity but introduces N+1 risk and more code surface.

**Rationale**: The codebase already uses `sql<>` template literals for complex correlated subqueries (`totalHours`, `memberCount`). A `json_agg` subquery is consistent with this pattern and keeps query count at 1 per list/get call.

### D2: Member shape reuses `projectAssignmentResponseSchema` fields (subset)

**Decision**: Each member in the array exposes: `userId`, `displayName`, `email`, `avatarUrl`, `role`. This is a subset of `ProjectAssignmentResponse` — no new types needed beyond a `ProjectMember` alias extracted from the existing schema.

**Rationale**: Reusing the existing assignment shape keeps the contract consistent. The `id`, `assignedBy`, `assignedAt`, `workspaceId`, `projectId` fields are not needed for roster display and would bloat the project list response.

### D3: Shared contract change — remove `memberCount`, add `members`

**Decision**: Modify `projectResponseSchema` in `packages/shared/src/contracts/projects.ts` to remove `memberCount` and add `members: z.array(projectMemberSchema)`.

**Rationale**: The shared contract is the single source of truth for the API shape. Both the NestJS DTO (via `createZodDto`) and any frontend consumers derive from it automatically.

## Risks / Trade-offs

- **Response payload size**: Large projects with many members will now return more data per project row in list responses. → Acceptable for typical workspace sizes; can add pagination later if needed.
- **`json_agg` null handling**: If no members exist, `json_agg` returns `NULL` in PostgreSQL. → Must `COALESCE(json_agg(...), '[]'::json)` in the subquery and handle null in the service mapper.
- **Breaking change**: `memberCount` is removed. Any client that reads `memberCount` directly will break. → No frontend consumers found; document as breaking in proposal. Clients should use `members.length` instead.
- **E2E test drift**: Existing E2E tests assert `memberCount`; they must be updated. → Covered in tasks.
