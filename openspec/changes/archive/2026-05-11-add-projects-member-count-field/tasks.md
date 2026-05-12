## 1. Shared Contract Update

- [x] 1.1 Add `memberCount: z.number().int().min(0)` to `projectResponseSchema` in `packages/shared/src/contracts/projects.ts`
- [x] 1.2 Verify `ProjectResponse` and `ProjectListResponse` types automatically include `memberCount` after the schema change
- [x] 1.3 Build shared package to confirm no type errors: `pnpm --filter @gitiempo/shared build`

## 2. Service Layer

- [x] 2.1 Extend `ProjectResponseRow` type in `apps/api/src/projects/services/projects.service.ts` to include `memberCount: number | string | null`
- [x] 2.2 Add `memberCount` correlated subquery to `projectResponseSelection()`:
  ```ts
  memberCount: sql<number>`(SELECT COUNT(*) FROM "project_assignments" WHERE "project_assignments"."project_id" = "projects"."id")`
  ```
- [x] 2.3 Map `memberCount` in `toProjectResponse()` using the existing `toNumber()` helper

## 3. Verification

- [x] 3.1 Run lint and typecheck for the API: `pnpm --filter @gitiempo/api lint && pnpm --filter @gitiempo/api typecheck`
- [x] 3.2 Run existing unit tests: `pnpm --filter @gitiempo/api test`

## 4. E2E Tests

- [x] 4.1 In `apps/api/test/projects-tasks.e2e-spec.ts`, add a `describe` block (or extend the existing project list describe block) for `memberCount` assertions
- [x] 4.2 Write test: list projects endpoint returns correct `memberCount` for each project (0 for unassigned, N for assigned)
- [x] 4.3 Write test: single-project GET endpoint returns correct `memberCount`
- [x] 4.4 Ensure seed data or test fixtures create a known number of assignments so assertions are deterministic
- [x] 4.5 Run e2e tests: `pnpm --filter @gitiempo/api test:e2e`

## 5. OpenAPI Export

- [x] 5.1 Regenerate `packages/shared/openapi.json` using the build-based workflow (not `pnpm openapi:export` directly, per known `tsx` tooling issue in AGENTS.md)
- [x] 5.2 Verify `memberCount` appears in the generated OpenAPI spec for project response schemas
