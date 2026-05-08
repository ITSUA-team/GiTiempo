## Why

The `apps/admin-web` Members route is currently a `PlaceholderPage`, but the Admin Members screen exists as an approved design in `GITiempo.pen` (`sBfSO`) and the supporting backend endpoints (`GET/POST/DELETE /invites`, `GET /members`, `PATCH /members/:id/role`, `DELETE /members/:id`, `GET /projects`, `POST/DELETE /projects/:id/assignments`) are already shipped. The page is also explicitly required by `openspec/specs/admin-pages/spec.md` ("Members management view") and by `docs/ui/pages-admin.md`, and the task brief asks for parity with the Projects page in both behavior and visual treatment.

A cross-design audit of `GITiempo.pen` (Projects `6iAjf`, Members `sBfSO`, plus the other admin/user screens) shows that the Stat card (`bg-surface rounded-lg shadow-card p-4`, label + 28px value) and the boxed management table chrome (custom 44px header row + DataTable body with stripped chrome + `gt-action-btn` link buttons) are now used in two stable admin call sites. Per `packages/web-shared/AGENTS.md` and `openspec/specs/frontend-shared-leaves`, these belong in `packages/web-shared` once a second consumer is real. Building the Members page is the moment that second consumer becomes real, so this change ships the page and promotes those leaves at the same time.

## What Changes

- Replace the `MembersView` placeholder in `apps/admin-web` with the full Members page rendered from the approved design (`sBfSO`):
  - `StatsHeader` (already shared) with title `Members`, description, and a top-right primary `Invite Member` action.
  - Three stat cards in the header row: `Active Members`, `Pending Invites`, `PMs Assigned` — values derived from `GET /members` and `GET /invites`.
  - A `Members Table` card (`SurfaceCard` wrapper) using the same boxed table chrome as `ProjectsTable` with columns `Member`, `Role`, `Projects Assigned`, `Last Active`, `Actions`.
  - Inline expansion under non-admin member rows for `Assign PM` (PrimeVue `Checkbox` group of workspace projects, pre-filled with current assignments) with `Cancel` / `Save Assignments` actions, wired to `POST /projects/:id/assignments` and `DELETE /projects/:id/assignments/:userId`.
  - `Edit` action opens the same inline expansion pattern as `ProjectEditForm` with the member form (Name, Email, Role); only Role is editable for MVP — Name and Email are rendered read-only because the API exposes no admin-side update for those fields. This deviation is documented in `design.md`.
  - `Remove` action opens the same destructive PrimeVue `<ConfirmDialog>` pattern used by Projects archive (per `docs/ui/patterns.md`) and calls `DELETE /members/:id`.
  - `Invite Member` opens a PrimeVue `<Dialog>` matching the bottom-left dialog in the design (Email input, Role select with `Member`/`PM`/`Admin`, Cancel + Send Invite buttons), validated with a shared Zod form schema that wraps `createWorkspaceInviteSchema` and submitted to `POST /invites`. On success the dialog closes, a toast confirms delivery, and the `Pending Invites` counter is incremented locally and re-fetched.
- Promote two repeating UI leaves into `packages/web-shared`:
  - `StatCard` extracted from `apps/admin-web/src/components/ProjectStatCard.vue` (also replaces the inline stat card markup defined in the Members `.pen` design and matches the documented "stat card" pattern).
  - `ManagementTableShell` extracted from the boxed-table chrome of `ProjectsTable.vue` (outer rounded border, custom 44px header row, stripped DataTable body, `gt-action-btn` link button styles, expansion row chrome) so both `ProjectsTable` and the new `MembersTable` render through it.
  - `ProjectsView` is updated to consume the promoted shared components without behavior changes; this is a pure refactor so Projects parity is preserved.
- Extend the workspace member API response with `lastActiveAt: string | null` and a `projectsAssignedCount: number` so the Members table `Last Active` and `Projects Assigned` columns are first-class data instead of derived guesses:
  - Add a `last_active_at` timestamp column to `users` (nullable) and update it from time-entry / timer write paths.
  - Update `WorkspaceMemberResponse` Zod schema in `@gitiempo/shared` and `MembersService.listMembers` to return both fields, joined with the projects-per-member count.
  - Regenerate `packages/shared/openapi.json` after the contract change.

## Capabilities

### New Capabilities

- `admin-members-page`: End-to-end behavior of the admin-web Members page — stats header, Invite Member dialog, members table with role/projects/last-active columns, inline PM assignment, edit-role flow, and remove-with-confirm flow.

### Modified Capabilities

- `admin-pages`: Replace the single "Members management view" scenario with an explicit set of scenarios covering header, stat counters, invite dialog, inline PM assignment, edit row, and remove confirmation, mirroring how the Projects page is already specified.
- `workspace-membership`: Extend the listMembers response contract with `lastActiveAt` and `projectsAssignedCount` so admin UIs can render activity and assignment context without N+1 fetches.
- `users`: Track per-user last-activity timestamp and update it on time-tracking write paths.
- `frontend-shared-leaves`: Add `StatCard` and `ManagementTableShell` to the documented set of shared leaves, matching the existing rule that doc-defined repeated UI patterns become shared once a second consumer ships.

## Impact

- **Backend (`apps/api`)**: new `users.last_active_at` column + migration; touch points in `time-entries`/`timers` write paths to bump it; `MembersService.listMembers` query joins projects-per-member; new fields in DTOs; OpenAPI regen.
- **Shared contracts (`packages/shared`)**: `workspaceMemberResponseSchema` gains `lastActiveAt` and `projectsAssignedCount`; `openapi.json` regenerated.
- **Shared frontend (`packages/web-shared`)**: new `StatCard.vue` and `ManagementTableShell.vue` components plus barrel exports.
- **Admin web (`apps/admin-web`)**: full `MembersView.vue` implementation, new `MembersTable`, `MemberInviteDialog`, `MemberAssignPmPanel`, `MemberEditForm` components and a new `admin-members-client.ts` service; `ProjectsTable.vue` and `ProjectsView.vue` refactored to consume the shared `StatCard` / `ManagementTableShell`.
- **No new third-party dependencies** are introduced.
