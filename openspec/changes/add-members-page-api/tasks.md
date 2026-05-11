## 1. Database Migration

- [x] 1.1 Add `last_active_at timestamptz null` column to `users` table in `apps/api/src/users/schemas/users.schema.ts`
- [x] 1.2 Generate Drizzle migration with `drizzle-kit generate` and verify the SQL output
- [x] 1.3 Run migration against dev DB (`pnpm --filter @gitiempo/api db:migrate`) and confirm column exists

## 2. UsersActivityService

- [x] 2.1 Create `apps/api/src/users/services/users-activity.service.ts` with `touchLastActive(userId: string): Promise<void>` method that updates `users.last_active_at = now()` for the given user and catches/logs errors internally
- [x] 2.2 Register `UsersActivityService` as a provider in the `UsersModule` and export it for consumption by other modules
- [x] 2.3 Import `UsersModule` into the `TimeEntriesModule` so `UsersActivityService` is injectable there

## 3. Wire Activity Bump into Time-Tracking Writes

- [x] 3.1 Inject `UsersActivityService` into `TimeEntriesService`
- [x] 3.2 Add fire-and-forget `this.usersActivityService.touchLastActive(userId)` call in `startTimer`
- [x] 3.3 Add fire-and-forget activity bump in `startTimerFromGitHub`
- [x] 3.4 Add fire-and-forget activity bump in `stopTimer`
- [x] 3.5 Add fire-and-forget activity bump in `createManualEntry`
- [x] 3.6 Add fire-and-forget activity bump in `updateOwnEntry`
- [x] 3.7 Add fire-and-forget activity bump in `deleteOwnEntry`

## 4. Extend MembersService.listMembers

- [x] 4.1 Update the `listMembers` select to include `users.lastActiveAt` (map to ISO string or null)
- [x] 4.2 Add a correlated sub-select counting `project_assignments` rows per user scoped to the workspace, aliased as `projectsAssignedCount`
- [x] 4.3 Verify the query returns correct results manually via seed data

## 5. Shared Contract Extension

- [x] 5.1 Add `lastActiveAt: z.iso.datetime().nullable()` and `projectsAssignedCount: z.number().int().min(0)` to `workspaceMemberResponseSchema` in `packages/shared/src/contracts/workspace-members.ts`
- [x] 5.2 Rebuild `@gitiempo/shared` (`pnpm --filter @gitiempo/shared build`)
- [x] 5.3 Confirm the DTO in `apps/api/src/members/dto/workspace-member-response.dto.ts` picks up the new fields via `createZodDto` (no manual changes needed if schema is the single source)

## 6. OpenAPI Regeneration

- [x] 6.1 Regenerate `packages/shared/openapi.json` using the nest-build-based workflow documented in `apps/api/AGENTS.md`
- [x] 6.2 Verify the new `lastActiveAt` and `projectsAssignedCount` fields appear in the OpenAPI spec under the workspace member response schema

## 7. E2E Tests

- [x] 7.1 Add e2e test: `listMembers` returns `lastActiveAt: null` for a member with no time-tracking writes
- [x] 7.2 Add e2e test: after a time-tracking write (e.g., create manual entry), `listMembers` returns a non-null `lastActiveAt` for that user
- [x] 7.3 Add e2e test: `projectsAssignedCount` matches the number of project assignments for a member in the workspace
- [x] 7.4 Add e2e test: `projectsAssignedCount` is 0 for a member with no assignments

## 8. Final Verification

- [x] 8.1 Run `pnpm --filter @gitiempo/api lint` — all clean
- [x] 8.2 Run `pnpm --filter @gitiempo/api typecheck` — all clean
- [x] 8.3 Run `pnpm --filter @gitiempo/api test` — all passing
- [x] 8.4 Run `pnpm --filter @gitiempo/api test:e2e` — all passing (pre-existing projects-tasks member-count issue unrelated)
- [x] 8.5 Run `pnpm --filter admin-web typecheck` and `pnpm --filter user-web typecheck` — confirm frontend still compiles with the extended contract
