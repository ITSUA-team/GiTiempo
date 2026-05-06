## Context

The project list (`GET /workspaces/:id/projects`) and single-project (`GET /workspaces/:id/projects/:projectId`) endpoints return `ProjectResponse` objects. These already include `isActive` in both the Zod schema (`packages/shared/src/contracts/projects.ts`) and the Drizzle selection (`projectResponseSelection()` in `projects.service.ts`). However, they lack a `memberCount` field showing how many workspace members are actively assigned.

The service currently uses a shared private method `projectResponseSelection()` that returns a Drizzle selection object with correlated SQL subqueries (e.g. `totalHours`, `source`). This pattern is the correct place to add `memberCount`.

## Goals / Non-Goals

**Goals:**
- Add `memberCount: number` (integer ≥ 0) to `projectResponseSchema` in `packages/shared`.
- Add a correlated subquery for `memberCount` inside `projectResponseSelection()` in the service.
- Map `memberCount` through `toProjectResponse()` and `ProjectResponseRow`.
- Add E2E tests asserting correct `memberCount` on list and single-project endpoints.
- Regenerate `packages/shared/openapi.json`.

**Non-Goals:**
- No frontend changes.
- No changes to assignment logic or `project_assignments` table.
- `isActive` is already present end-to-end; no additional work needed.

## Decisions

### Correlated subquery vs. join + GROUP BY

**Decision**: Use a correlated SQL subquery in `projectResponseSelection()`, matching the pattern already used for `totalHours` and `source`.

**Rationale**: The service's `listProjects` has two branches (admin vs. non-admin) with different join conditions already. Adding `memberCount` as a correlated subquery keeps both branches identical in their selection and avoids group-by complexity that would interfere with the existing left-join on `projectAssignments` (used for visibility filtering for non-admin).

**Alternative considered**: Add a join + `COUNT(DISTINCT pa2.user_id)` with `GROUP BY projects.id`. Rejected because the non-admin branch already left-joins `projectAssignments` for filtering, making a second aggregating join error-prone and harder to read.

### Subquery definition

```sql
SELECT COUNT(*)
FROM "project_assignments"
WHERE "project_assignments"."project_id" = "projects"."id"
```

Typed as `sql<number>` consistent with other numeric subquery columns. Cast to `int` in the `toProjectResponse` mapper via the existing `toNumber()` helper.

### Schema change location

`packages/shared/src/contracts/projects.ts` — add `memberCount: z.number().int().min(0)` to `projectResponseSchema`. This automatically propagates to `ProjectResponse`, `ProjectListResponse`, `ProjectResponseDto`, and `ProjectListResponseDto` (all derived from the shared schema).

### Test scope

New E2E tests in `apps/api/src/projects/` (or existing e2e spec file if one exists) using the seeded DB. Tests must:
1. Assert that `memberCount` equals the count of assignments for that project.
2. Cover the list endpoint and the single-project GET endpoint.
3. Use the canonical fake token `test:admin-uid:admin@example.com` per API AGENTS.md conventions.

## Risks / Trade-offs

- **Correlated subquery per row**: For large project lists this adds N subqueries. Acceptable at current scale; a materialized count column or denormalization can be addressed later if profiling reveals a problem.
- **Type cast**: Drizzle returns `sql<number>` values as strings from pg; `toNumber()` already handles this. No new risk.
- **openapi:export workaround**: Per AGENTS.md, `pnpm openapi:export` has a known issue with `tsx`/decorator metadata. Regeneration must use the build-based workflow.
