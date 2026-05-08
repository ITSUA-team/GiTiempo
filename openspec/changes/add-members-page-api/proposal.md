## Why

The Admin Members page (shipped in `add-members-page`) renders `Last Active` as `—` and computes `Projects Assigned` client-side from the projects list because the API does not provide these fields. The client-side count will break when server-side pagination is added, and `Last Active` cannot be derived at all without a backend write path. Adding these to the API completes the data contract and makes the members table truthful.

## What Changes

- Add a `last_active_at timestamptz null` column to the `users` table via a Drizzle migration and expose it in the schema.
- Introduce a `UsersActivityService` helper that bumps `users.last_active_at = now()` for a given user ID.
- Wire the activity bump into all time-tracking write paths: timer start, timer start-from-github, timer stop, time-entry create, time-entry update, time-entry delete.
- Update `MembersService.listMembers` to join `users.last_active_at` and count project assignments per member, returning `lastActiveAt` and `projectsAssignedCount` on each row.
- Extend `workspaceMemberResponseSchema` in `packages/shared/src/contracts/workspace-members.ts` with `lastActiveAt: z.iso.datetime().nullable()` and `projectsAssignedCount: z.number().int().min(0)`.
- Update the NestJS response DTOs (`workspace-member-response.dto.ts`) to include the new fields and confirm `ZodSerializerDto` maps them through.
- Rebuild `@gitiempo/shared` and regenerate `packages/shared/openapi.json` using the nest build path.
- Add e2e tests asserting `lastActiveAt` is null until a time-tracking write occurs, and `projectsAssignedCount` matches the assigned set.

## Capabilities

### New Capabilities

- `user-activity-tracking`: Track per-user last-activity timestamp and update it from time-tracking write paths so downstream consumers (admin Members table) have truthful activity data.

### Modified Capabilities

- `workspace-membership`: Extend the `listMembers` response contract with `lastActiveAt` and `projectsAssignedCount` so admin UIs can render activity and assignment context without N+1 fetches or client-side derivation.
- `users`: Add `last_active_at` column to the users data model, exposed via the existing user schema.

## Impact

- **Backend (`apps/api`)**: new `users.last_active_at` column + Drizzle migration; new `UsersActivityService`; touch points in time-entries and timers write paths; `MembersService.listMembers` query extended with join + count; response DTOs updated.
- **Shared contracts (`packages/shared`)**: `workspaceMemberResponseSchema` gains `lastActiveAt` and `projectsAssignedCount`; `openapi.json` regenerated.
- **Frontend (`apps/admin-web`)**: No code changes in this change — the frontend already handles `lastActiveAt` being absent (shows `—`) and computes projects client-side. A follow-up frontend task can wire the new fields.
- **No new third-party dependencies** are introduced.
