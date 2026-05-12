## 1. Shared Contract

- [x] 1.1 In `packages/shared/src/contracts/projects.ts`, add a `projectMemberSchema` object (fields: `userId`, `displayName`, `email`, `avatarUrl`, `role`) and export a `ProjectMember` type.
- [x] 1.2 Replace `memberCount: z.number().int().min(0)` with `members: z.array(projectMemberSchema)` in `projectResponseSchema`.
- [x] 1.3 Remove the `ProjectResponse` `memberCount` property from any exported type aliases and add `members: ProjectMember[]`.
- [x] 1.4 Run `pnpm typecheck` at repo root to confirm no contract consumers are broken.

## 2. API Service Query

- [x] 2.1 In `apps/api/src/projects/services/projects.service.ts`, replace the `memberCount` correlated subquery with a `json_agg` correlated subquery that returns a JSON array of member objects (`userId`, `displayName`, `email`, `avatarUrl`, `role`) using the same `project_assignments` + `workspace_members` join (and joining `users` for display fields).
- [x] 2.2 Wrap the `json_agg` with `COALESCE(..., '[]'::json)` to handle projects with no assignments.
- [x] 2.3 Update the `ProjectResponseRow` internal type (line ~34) to replace `memberCount?: number | string | null` with `members?: unknown` (raw JSON from Drizzle).
- [x] 2.4 Update `toProjectResponse()` mapper to parse the raw JSON array into `ProjectMember[]` instead of mapping `memberCount`.

## 3. API DTO

- [x] 3.1 Verify `ProjectResponseDto` in `apps/api/src/projects/dto/project-response.dto.ts` derives automatically from the updated `projectResponseSchema` — no manual changes needed if using `createZodDto`.
- [x] 3.2 Run `pnpm --filter @gitiempo/api build` (or `pnpm build`) to confirm compilation succeeds.

## 4. Tests

- [x] 4.1 In the API E2E test file(s) that assert project list/get responses, find all assertions on `memberCount` and replace them with assertions on the `members` array shape (array length, presence of `userId`/`role` fields).
- [x] 4.2 Add a scenario asserting `members` is `[]` when a project has no assignments.
- [x] 4.3 Add a scenario asserting `members` contains correct member fields when assignments exist.
- [x] 4.4 Run `pnpm test` and `pnpm test:e2e` to confirm all tests pass.

## 5. OpenAPI Export

- [x] 5.1 Run `pnpm openapi:export` and verify the generated OpenAPI schema reflects `members` array (with `projectMemberSchema` inlined or referenced) and no longer includes `memberCount`.

## 6. Frontend Audit

- [x] 6.1 Search `apps/user-web/src` and `apps/admin-web/src` for any usage of `.memberCount` on project objects — update any found usages to use `.members.length` or render the members array.
- [x] 6.2 Run `pnpm typecheck` again after any frontend changes to confirm clean types across the monorepo.
