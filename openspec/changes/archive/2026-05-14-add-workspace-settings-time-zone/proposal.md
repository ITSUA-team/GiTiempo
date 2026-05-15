## Why

Workspace settings already define billing defaults, but the API has no workspace-level calendar time zone. Reports, dashboard periods, invoice date ranges, and any future "today" or "this week" calculations need a stable time-zone setting instead of relying on server defaults or UTC assumptions hidden in implementation code.

## What Changes

- Add `timeZone` to workspace settings as an IANA time-zone identifier with default `UTC`.
- Expose `timeZone` through `GET /workspace/settings` and allow admins to update it through `PATCH /workspace/settings`.
- Validate workspace settings payloads so invalid time-zone identifiers are rejected with the existing request-validation behavior.
- Keep `defaultHourlyRate` as the existing nullable workspace billing default and document its snapshot/default semantics alongside `timeZone`.
- Synchronize backend schema, migrations, seed data, shared contracts, OpenAPI output, e2e coverage, and project documentation.

## Capabilities

### New Capabilities

_(none)

### Modified Capabilities

- `workspace-management`: Workspace settings now include a required `timeZone` value that admins can read and update.
- `contracts`: Shared workspace settings contracts now include `timeZone` in responses and updates.
- `data-model`: The workspace settings persistence model now stores a non-null `time_zone` column with default `UTC`.
- `api-workspace-settings-tests`: Workspace settings e2e coverage now verifies `timeZone` response, update, seed default, and validation behavior.
- `admin-pages`: The admin settings page scope now includes the workspace time-zone field.

## Impact

- `apps/api/src/workspaces` schema, DTO-backed service response mapping, settings update behavior, and e2e tests.
- Drizzle migration output under `apps/api/drizzle` for `workspace_settings.time_zone`.
- `apps/api/src/db/seed.ts` for the seeded workspace settings default.
- `packages/shared/src/contracts/workspaces.ts` and generated `packages/shared/openapi.json`.
- Documentation in `docs/DATA-MODEL.md`, `docs/API-ENDPOINTS.md`, `docs/TECHNICAL-REQUIREMENTS.md`, and relevant UI docs/specs.
