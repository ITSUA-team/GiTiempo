## Context

Workspace settings currently expose `currency` and `defaultHourlyRate` through `GET /workspace/settings` and `PATCH /workspace/settings`. `defaultHourlyRate` already exists in the Drizzle schema, the initial migration, seed data, shared Zod contracts, OpenAPI output, and API e2e tests.

The missing piece is a workspace-level time zone. The backend stores timestamps as PostgreSQL timestamptz values, but calendar concepts such as "today", "this week", report ranges, dashboard periods, and invoice periods need a stable workspace calendar interpretation. The user chose `UTC` as the default time zone.

Affected areas:

- `apps/api`: NestJS workspace settings controller/service, Drizzle schema, migration, seed, and e2e tests.
- `packages/shared`: Workspace settings Zod contracts consumed by backend DTOs and future frontend clients.
- `packages/shared/openapi.json`: Generated API schema after DTO/controller changes.
- `docs` and OpenSpec specs: data model, API endpoint descriptions, technical requirements, and admin settings page scope.

## Goals / Non-Goals

**Goals:**

- Persist `workspace_settings.time_zone` as a required workspace setting with default `UTC`.
- Return `timeZone` from `GET /workspace/settings` and accept it in `PATCH /workspace/settings`.
- Validate `timeZone` as an IANA time-zone identifier at the shared contract layer.
- Keep `defaultHourlyRate` behavior unchanged while documenting that it is a nullable billing default copied into invoice creation flows as a snapshot value.
- Preserve existing admin-only authorization for settings reads and updates.

**Non-Goals:**

- Do not implement reports, invoices, dashboard period calculations, or UI rendering in this change.
- Do not add user-level time-zone preferences.
- Do not change how timestamps are stored; persisted event times remain timestamptz/UTC-normalized database values.
- Do not add project/member-specific rates or billing policies.
- Do not convert existing date filters to workspace-time-zone-aware calculations in this change unless required by tests touched for the contract update.

## Decisions

### Store an IANA identifier, not an offset

Use `timeZone` in API contracts and `time_zone varchar(64) not null default 'UTC'` in PostgreSQL.

Rationale: offsets such as `+02:00` do not encode daylight-saving transitions and are insufficient for calendar grouping over time. IANA identifiers such as `UTC`, `Europe/Kyiv`, and `America/New_York` are stable enough for backend and frontend date libraries.

Alternative considered: store a numeric UTC offset. Rejected because DST and historical offset changes would make reports and invoices incorrect around transitions.

### Default to UTC for schema, migration, and seed

Both the database default and seeded workspace settings should use `UTC`.

Rationale: `UTC` is deterministic, environment-independent, and matches the user's explicit decision. Existing rows can be backfilled safely without needing deployment-local assumptions.

Alternative considered: seed `Europe/Kyiv` for the product owner's local context. Rejected because the product default should not assume a specific geography unless the workspace admin sets it.

### Validate time zone in shared Zod contracts

Add `timeZone` to `workspaceSettingsResponseSchema` and `updateWorkspaceSettingsSchema` in `packages/shared/src/contracts/workspaces.ts`. Validation should reject unknown or malformed values before service logic persists them.

Rationale: API DTOs wrap shared Zod schemas, so contract-level validation keeps backend validation, future frontend form validation, and OpenAPI shape aligned.

Implementation should prefer a runtime check based on `Intl.DateTimeFormat(undefined, { timeZone })` or an equivalent environment-supported IANA validation method that works in Node and browser test environments. Keep the validation helper small and local to the shared contract unless it becomes reusable.

Alternative considered: only validate string length and defer correctness. Rejected because invalid time zones would later break date calculations at runtime.

### Keep settings endpoint split from workspace identity endpoint

`PATCH /workspace` continues to update workspace identity fields such as `name`; `PATCH /workspace/settings` updates billing/calendar settings such as `currency`, `defaultHourlyRate`, and `timeZone`.

Rationale: this matches the existing API and avoids introducing an aggregate endpoint before the admin settings page requires atomic full-form saves.

Alternative considered: add a combined endpoint for name plus settings. Rejected as unnecessary scope expansion.

### Do not recalculate existing invoice or report data

`timeZone` is a setting for future interpretation of calendar periods. Changing it should not rewrite timestamps or existing persisted invoice snapshots.

Rationale: workspace settings are defaults and interpretation rules, not a data migration over historical time entries.

Alternative considered: migrate historical dates or invoice periods on time-zone changes. Rejected because no such derived persisted fields are in scope.

## Risks / Trade-offs

- Existing consumers of `WorkspaceSettingsResponse` must handle the new required `timeZone` field -> Coordinate contract update with API response mapping and OpenAPI regeneration in the same change.
- `Intl` time-zone support may differ in constrained runtimes -> Use a validation approach covered by shared contract tests and API e2e tests in the current Node/Vite environment.
- Existing databases need a non-null backfill -> Use a migration with `DEFAULT 'UTC' NOT NULL` so existing rows receive a safe value.
- Time-zone setting may create an expectation that all reports already use workspace calendar boundaries -> Document that this change stores and exposes the setting; follow-up report/dashboard/invoice logic can consume it explicitly.

## Migration Plan

1. Update Drizzle schema with `timeZone` mapped to `time_zone`.
2. Generate a Drizzle migration that adds `workspace_settings.time_zone varchar(64) default 'UTC' not null`.
3. Update seed to upsert `timeZone: 'UTC'` for the default workspace settings row.
4. Update shared contracts, DTO-backed service mapping, e2e tests, docs, and OpenAPI output.
5. Deploy by applying the migration before starting the updated API build.

Rollback strategy:

- Application rollback to the previous API build is safe while the extra `time_zone` column remains unused.
- Dropping the column should only be done through a follow-up migration if the feature is explicitly removed.

## Open Questions

- None for this change. The default time zone is `UTC` by decision.
