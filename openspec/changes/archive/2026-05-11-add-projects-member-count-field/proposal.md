## Why

The project list and single-project endpoints do not expose how many workspace members are assigned to each project. Consumers (admin dashboards, PM views) need this count to display team size without a separate request per project.

## What Changes

- Add a computed `memberCount` field to every project response (list and single-project GET) that reflects the number of active assignments for that project via a correlated SQL subquery on `project_assignments`.
- Expose `isActive` on the project response (already stored on the `projects` table; ensure it surfaces in all response DTOs).
- Add E2E / integration tests for both the list and single-project endpoints that assert the correct `memberCount` value is returned.

## Capabilities

### New Capabilities

- `project-member-count`: Augment project response objects with a `memberCount` field computed as a SQL subquery count of rows in `project_assignments` matching the project's id.

### Modified Capabilities

- `project-management`: The project response schema now includes `memberCount` (integer ≥ 0) and surfaces `isActive` explicitly. The list and get-by-id endpoints are affected.

## Impact

- **API layer**: `apps/api/src/projects/` — service queries, response DTOs, and OpenAPI schema.
- **Contracts**: `packages/shared/` — project response Zod schema gains `memberCount` and `isActive`.
- **Tests**: new E2E test file (or extension of existing) covering `GET /workspaces/:id/projects` and `GET /workspaces/:id/projects/:projectId` asserting correct `memberCount`.
- No frontend changes required in this change; field will be available for future UI consumption.
