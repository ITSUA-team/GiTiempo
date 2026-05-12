## 1. Data Model And Migration

- [x] 1.1 Add nullable `description` to `apps/api/src/projects/schemas/projects.schema.ts` as provider-neutral project metadata.
- [x] 1.2 Generate a Drizzle migration for `projects.description text` under `apps/api/drizzle/` and inspect the generated SQL and metadata for correctness.
- [x] 1.3 Update `apps/api/src/db/seed.ts` so seeded projects include representative descriptions and conflict updates preserve them.
- [x] 1.4 Do not run migrations against a database unless the user explicitly approves applying them.

## 2. Shared Contracts

- [x] 2.1 Update `packages/shared/src/contracts/projects.ts` so `projectResponseSchema` includes `description: string | null`.
- [x] 2.2 Update `createProjectSchema` and `updateProjectSchema` to accept optional nullable `description` with an appropriate max length.
- [x] 2.3 Add project detail summary schemas: provider summary, tracked summary, assigned-members summary, and `projectDetailResponseSchema`.
- [x] 2.4 Export `ProjectDetailResponse` and any supporting inferred types needed by backend/frontend consumers.
- [x] 2.5 Update affected frontend/backend test fixtures that parse `ProjectResponse` so they include `description`.

## 3. API DTOs And Controller Contract

- [x] 3.1 Add `ProjectDetailResponseDto` in `apps/api/src/projects/dto/` using `createZodDto(projectDetailResponseSchema)`.
- [x] 3.2 Change `ProjectsController.getProject` to document, serialize, and type `GET /projects/:id` as `ProjectDetailResponseDto`.
- [x] 3.3 Keep `GET /projects`, `POST /projects`, and `PATCH /projects/:id` on the list/base `ProjectResponseDto` unless implementation reveals a concrete need to widen them.

## 4. Projects Service Implementation

- [x] 4.1 Extend create/update project persistence so `description` is written when supplied and cleared when explicitly set to `null`.
- [x] 4.2 Include `description` in the existing base project response selection and mapper.
- [x] 4.3 Add a detail response selection or loader for `GET /projects/:id` that computes provider summary without exposing raw provider metadata.
- [x] 4.4 Add tracked summary aggregation for a single project: `totalSeconds`, `billableSeconds`, `billableShare`, and `lastActivityAt` from completed entries only.
- [x] 4.5 Add assigned-member summary for a single project: total assignment count, up to three deterministic preview members, and remaining count.
- [x] 4.6 Ensure existing visibility rules still gate `GET /projects/:id` before returning detail summaries.
- [x] 4.7 Keep list response queries free of detail-only provider/tracked/assigned summary work.

## 5. Regression Coverage

- [x] 5.1 Update `apps/api/src/projects/services/projects.service.spec.ts` fixtures and assertions for `description` and base response mapping.
- [x] 5.2 Add or update E2E coverage proving create/update/clear project `description` behavior.
- [x] 5.3 Add E2E coverage proving `GET /projects/:id` returns provider summary for manual and GitHub-linked projects.
- [x] 5.4 Add E2E coverage proving tracked summary counts completed entries, excludes running entries, returns billable share, and uses latest completed `startedAt` for `lastActivityAt`.
- [x] 5.5 Add E2E coverage proving assigned-members summary count, preview size, and remaining count.
- [x] 5.6 Add E2E coverage confirming non-visible projects still return 404 for non-admin users and do not leak detail summaries.

## 6. Documentation, OpenAPI, And Verification

- [x] 6.1 Update `docs/API-ENDPOINTS.md` to describe editable project description and the detail summary fields on `GET /projects/:id`.
- [x] 6.2 Regenerate `packages/shared/openapi.json` using the repository-supported OpenAPI export workflow noted in `apps/api/AGENTS.md`.
- [x] 6.3 Run `pnpm --filter @gitiempo/shared build` if needed before API-focused scripts.
- [x] 6.4 Run `pnpm --filter @gitiempo/api lint` and fix reported issues.
- [x] 6.5 Run `pnpm --filter @gitiempo/api typecheck` and fix type errors.
- [x] 6.6 Run `pnpm --filter @gitiempo/api test` and fix regressions.
- [x] 6.7 If a real test database is available and migrated/seeded with approval, run the relevant API E2E suite for projects/tasks. (Not run because applying the new migration requires explicit approval.)
