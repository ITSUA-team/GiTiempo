## Why

The user Project page needs to render its header from a stable backend contract instead of reconstructing project metadata, tracked totals, provider display, and assignment context from multiple client-side sources. The current single-project response shares the list-row shape and lacks editable project description plus detail-level summary fields required by the approved Project View design.

## What Changes

- Add a detail-oriented shared response contract for `GET /projects/:id` while keeping `GET /projects` list responses lightweight.
- Make project `description` a persisted, editable project field accepted by create and update project contracts.
- Extend the single-project backend response with provider summary, tracked-time summary, and assigned-members summary suitable for the user Project page header.
- Keep provider-specific identifiers in `project_external_refs`; expose only display-safe summary fields on the detail response.
- Keep assigned-member context assignment-based; do not introduce a dedicated PM owner field.
- Update API DTOs, serializers, OpenAPI output, and regression coverage for the new contract.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `contracts`: Shared project contracts add editable description fields and a reusable single-project detail response shape.
- `project-management`: Single-project reads return detail summary information derived from project metadata, assignments, provider references, and completed time entries.
- `data-model`: Project records store a nullable editable description as provider-neutral project metadata.

## Impact

- `packages/shared/src/contracts/projects.ts` — project create/update schemas, list response contract, and new detail response contract/types.
- `apps/api/src/projects/*` — DTOs, controller return type, service selection/mapping, and project create/update handling.
- `apps/api/src/projects/schemas/projects.schema.ts` and Drizzle migration metadata — nullable `description` column on `projects`.
- `apps/api/src/db/seed.ts` — seed project descriptions for local/dev data.
- `apps/api/test/projects-tasks.e2e-spec.ts` and focused service tests — contract and aggregation coverage.
- `packages/shared/openapi.json` — regenerated API schema after DTO/contract changes.
