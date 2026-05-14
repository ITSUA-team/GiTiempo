## 1. Shared Contracts

- [x] 1.1 Add a small IANA time-zone validation helper in `packages/shared/src/contracts/workspaces.ts`.
- [x] 1.2 Add required `timeZone` to `workspaceSettingsResponseSchema`.
- [x] 1.3 Add optional `timeZone` to `updateWorkspaceSettingsSchema` and keep the existing at-least-one-field refinement aware of it.
- [x] 1.4 Add or update shared contract tests for valid and invalid workspace settings time-zone payloads if this package already has nearby contract test coverage.

## 2. Database And Seed

- [x] 2.1 Add `timeZone` mapped to `time_zone varchar(64) default 'UTC' not null` in `apps/api/src/workspaces/schemas/workspace-settings.schema.ts`.
- [x] 2.2 Generate a Drizzle migration for `workspace_settings.time_zone` with default `UTC` and non-null backfill behavior.
- [x] 2.3 Update `apps/api/src/db/seed.ts` so the default workspace settings upsert writes `timeZone: 'UTC'`.

## 3. API Behavior

- [x] 3.1 Update `WorkspacesService` settings update mapping to persist `timeZone` when provided.
- [x] 3.2 Update `WorkspacesService` settings response mapping to return `timeZone`.
- [x] 3.3 Preserve existing admin-only guards and existing `defaultHourlyRate` semantics.

## 4. API Tests And OpenAPI

- [x] 4.1 Update `apps/api/test/workspace-settings.e2e-spec.ts` to assert `timeZone` in GET responses and seeded default `UTC`.
- [x] 4.2 Add e2e coverage for updating `timeZone` to a valid IANA value.
- [x] 4.3 Add e2e coverage for invalid `timeZone` returning 400.
- [x] 4.4 Regenerate `packages/shared/openapi.json` after DTO/contract changes.

## 5. Documentation

- [x] 5.1 Update `docs/DATA-MODEL.md` with `workspace_settings.time_zone` and the `UTC` default.
- [x] 5.2 Update `docs/API-ENDPOINTS.md` so `/workspace/settings` documents `timeZone` in GET/PATCH behavior.
- [x] 5.3 Update `docs/TECHNICAL-REQUIREMENTS.md` and relevant UI docs so Admin Settings includes the time-zone field.
- [x] 5.4 Document `defaultHourlyRate` as a nullable workspace billing default whose value is copied into invoice flows as a snapshot, not retroactively applied.

## 6. Verification

- [x] 6.1 Run `pnpm --filter @gitiempo/shared build` if needed before API checks.
- [x] 6.2 Run `pnpm --filter @gitiempo/api lint`.
- [x] 6.3 Run `pnpm --filter @gitiempo/api typecheck`.
- [x] 6.4 Run `pnpm --filter @gitiempo/api test`.
- [x] 6.5 Run focused API e2e tests for workspace settings if the required test database is available; otherwise document the skipped verification and prerequisite.

Focused e2e attempted with `pnpm --filter @gitiempo/api test:e2e -- test/workspace-settings.e2e-spec.ts`, but the local test database has not applied migration `0009_motionless_red_wolf.sql`; PostgreSQL reported missing column `workspace_settings.time_zone`. Prerequisite before rerunning: apply API migrations to the e2e database, then seed it.
