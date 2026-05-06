## Why

The project endpoints currently return a scalar `memberCount` field computed via a correlated SQL subquery. Consumers (admin dashboards, PM views) need the full list of assigned members — not just a count — to display team rosters, avatars, and member details without additional per-project requests. Replacing the count with a members array makes the API more useful without increasing round-trips.

## What Changes

- **Remove** the `memberCount` scalar from project response objects.
- **Add** a `members` array to every project response (list and single-project GET), where each element contains the workspace member's user id, display name, and role.
- The `members` array is computed via a correlated subquery / lateral join on `project_assignments` joined with `workspace_members` and `users`.
- Update the shared Zod contract to replace `memberCount: number` with `members: ProjectMember[]`.
- Update OpenAPI export to reflect the new response shape.
- Update or replace existing E2E tests that asserted `memberCount` to instead assert the `members` array shape and values.

## Capabilities

### New Capabilities

- `project-members-list`: Project responses include a `members` array of assigned workspace members (id, display name, role) replacing the previous `memberCount` scalar.

### Modified Capabilities

- `project-management`: The project response schema changes from `memberCount: number` to `members: ProjectMember[]`. Both list and single-project GET endpoints are affected.

## Impact

- **API layer**: `apps/api/src/projects/` — service queries (swap subquery count for JSON aggregation or lateral join), response DTOs, OpenAPI schema.
- **Contracts**: `packages/shared/` — project response Zod schema: remove `memberCount`, add `members` array with member shape.
- **Tests**: existing E2E tests asserting `memberCount` must be updated to assert `members` array; new assertions for member shape and correctness.
- **Frontend**: any consumer of `memberCount` in `apps/user-web` or `apps/admin-web` must be updated to use `members.length` or render the member list.
