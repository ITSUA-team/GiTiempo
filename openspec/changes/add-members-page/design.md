## Context

The Members route in `apps/admin-web` currently renders a `PlaceholderPage`. The approved design lives in `GITiempo.pen` as the `Admin Members` frame (`sBfSO`) and the supporting backend already exposes the bulk of what the page needs:

- `GET /members`, `PATCH /members/:id/role`, `DELETE /members/:id` (admin-guarded by `WorkspaceAdminGuard`).
- `GET /invites`, `POST /invites`, `DELETE /invites/:id` (admin-guarded).
- `GET /projects`, `POST /projects/:id/assignments`, `DELETE /projects/:id/assignments/:userId` (admin-guarded for mutations, used by `ProjectsView` already).

The Projects page (`apps/admin-web/src/views/ProjectsView.vue`, `components/ProjectsTable.vue`, `components/ProjectEditForm.vue`, `components/ProjectStatCard.vue`) is the closest live reference. Its boxed-table chrome (custom 44px header + DataTable body with PrimeVue chrome stripped + `gt-action-btn` link buttons + edge-to-edge expansion row) matches the Members table 1:1 in the `.pen` design. The stat card markup also matches the Members `Active Members / Pending Invites / PMs Assigned` cards 1:1.

This change must therefore both (a) ship the Members page pixel-aligned to the `.pen` and (b) promote the two repeating leaves (`StatCard`, table chrome) to `packages/web-shared` so Projects and Members share a single implementation. Both `apps/admin-web/AGENTS.md` and `packages/web-shared/AGENTS.md` already direct us to extract docs-defined repeated UI patterns once a second consumer ships, and `frontend-shared-leaves` codifies that rule.

The page also needs two backend extensions to render the table truthfully: `Last Active` (currently no field exists on `users` or `workspace_members`) and `Projects Assigned` per member (today only resolvable by counting from `GET /projects` on the client). These are added at the contract level rather than left as client-side derivations because (a) `Last Active` requires a real DB write path that does not yet exist and (b) sending counts from the server keeps the table honest with future server-side pagination.

## Goals / Non-Goals

**Goals:**

- Render the Admin Members page (`apps/admin-web/src/views/MembersView.vue`) pixel-aligned to `.pen` node `sBfSO`, with PrimeVue components and `pt`/Tailwind tokens per `docs/ui/components.md` and `docs/ui/patterns.md`.
- Reuse `StatsHeader` (already in `packages/web-shared`) for the page header and counter row.
- Promote `ProjectStatCard` to `packages/web-shared` as `StatCard` and use it for both Projects and Members stat cards.
- Promote the boxed-table chrome and `gt-action-btn` link button styles from `ProjectsTable.vue` to a new `packages/web-shared/src/components/ManagementTableShell.vue`. Both `ProjectsTable` and the new `MembersTable` render through it.
- Implement the Invite Member dialog wired to `POST /invites`, with Zod-validated form payload and toast feedback.
- Implement inline PM assignment expansion under non-admin rows, wired to `POST/DELETE /projects/:id/assignments`, mirroring the inline expansion pattern of `ProjectEditForm`.
- Implement edit (role change) via inline expansion using `PATCH /members/:id/role`.
- Implement remove via PrimeVue `<ConfirmDialog>` and `useConfirm()` per `docs/ui/patterns.md`, wired to `DELETE /members/:id`.
- Add `users.last_active_at` and update it from time-tracking write paths so the `Last Active` column has truthful data.
- Extend the workspace member contract with `lastActiveAt` and `projectsAssignedCount` and regenerate `packages/shared/openapi.json`.

**Non-Goals:**

- Editing a member's `displayName` or `email` from the admin UI. There is no admin-side endpoint for those fields today (only `PATCH /users/me`). The edit form renders Name and Email read-only and only Role is editable. Adding admin-side identity edits is intentionally deferred to a follow-up change.
- Soft-archive of members; `Remove` continues to be a hard delete via `DELETE /members/:id` per the existing endpoint.
- Server-side pagination, search, or sort on the members table. Both Projects and Members render the full list client-side for MVP, identical to current Projects behavior.
- Splitting `WorkspaceAdminGuard` to allow PMs to access this page. The Members page stays admin-only.
- Mobile-specific layout work beyond what PrimeVue and Tailwind tokens already provide. Desktop-first parity is the bar, matching `apps/admin-web/AGENTS.md`.
- Last-activity backfill across pre-existing time entries; the column starts as `null` until the first new write occurs after the migration.

## Decisions

### Promote `StatCard` and `ManagementTableShell` to `packages/web-shared`

`apps/admin-web/AGENTS.md` requires us to "search for reusable components before leaving repeated page sections app-local, especially page headers, card shells, section headers". `packages/web-shared/AGENTS.md` allows extraction once a second consumer is real, which it is on the day Members ships.

- `StatCard.vue`: stable contract `defineProps<{ label: string; value: number | string }>()`. Identical to the existing `ProjectStatCard.vue` markup. Replaces both Projects and Members stat cards.
- `ManagementTableShell.vue`: wraps the outer rounded border, custom 44px header row built from a `columns` prop (`{ key, label, width?: number | 'fill', align?: 'start' | 'end' }`), the stripped `DataTable` body via slots, and the `gt-action-btn` link button styles. Slots: `#row` (per-row body cells), `#expansion` (inline panel), `#empty`.

Alternatives considered:

- _Keep table chrome inline in `ProjectsTable` and copy it into `MembersTable`._ Rejected: violates the docs-driven extraction rule and produces two parallel CSS overrides that must stay synchronized for visual parity.
- _Build a fully generic `<DataTable>` wrapper._ Rejected: too large a contract for two consumers; risks hiding product-specific differences and breaks the "smallest proven-identical leaf" rule from `frontend-shared-leaves`.

### Reuse existing `StatsHeader`, `SurfaceCard`, `useConfirm()` patterns instead of inventing new ones

- The page header is `StatsHeader` from `@gitiempo/web-shared` (already used by `ProjectsView`).
- The Members table card is wrapped in `SurfaceCard padding-class="p-5"` (matches Projects).
- Member removal uses `useConfirm().require({ ... acceptProps: { severity: 'danger' } })` per `docs/ui/patterns.md`. The `<ConfirmDialog>` host stays at the route or `AdminAppShell` level — not inside `MembersTable` — per the same doc.
- No bespoke confirm modal is built; the same `<ConfirmDialog>` pattern Projects already exposes is used.

### Invite dialog is a PrimeVue `<Dialog>` form with shared Zod validation

- Width 480px per `docs/ui/patterns.md` (`Common widths: 480px for forms`).
- Footer order Cancel + `Send Invite` (primary) per the design.
- Email is `<InputText>`; Role is `<Select>` with options `Member`, `PM`, `Admin` (mapping to `member`/`pm`/`admin`).
- Form payload validated by a thin browser-only schema in `packages/web-shared/src/validation/workspace-invite-form.ts` that re-uses `createWorkspaceInviteSchema` from `@gitiempo/shared`. Rationale: contract validation already exists in `@gitiempo/shared`; the wrapper exists only for UI-level error mapping and to keep the Zod helper next to the form, mirroring the auth form schema layout in `web-shared`.
- Submit calls `adminMembersClient.createInvite(token, payload)` which uses the shared `requestJson` helper with `workspaceInviteResponseSchema`. On success: close dialog, toast `Invite sent`, append to local `invites` ref so `Pending Invites` increments without an extra round-trip, then trigger a background refresh.

### Inline PM assignment expansion

- Only members with `role !== 'admin'` show the inline `Assign PM` action that expands the row. `Edit` is offered for every non-self member (current user excluded to avoid editing own role into trouble); `Remove` is offered for every non-self member.
- The expansion panel renders the same chrome as `ProjectEditForm` (the existing edit panel below `ProjectsTable` rows) with the Members-specific contents:
  - Section title `PM assignment`.
  - A wrapping flex of `<Checkbox>` + label per project (active projects only, sourced from `GET /projects` already loaded by the page).
  - Pre-checked from `projects[].members[].userId === selectedMember.userId`.
  - Footer: `Cancel` (secondary outlined) + `Save Assignments` (primary, with loading state).
- On save, the diff between the pre-existing assignment set and the next set is applied via `POST /projects/:projectId/assignments` (additions) and `DELETE /projects/:projectId/assignments/:userId` (removals) — the same pattern used by `ProjectEditForm.handleSave`.

### Edit row scope = role only; Name and Email rendered read-only

- The expansion panel shows three fields per the design (Name, Email, Role), but Name and Email are `<InputText>` with `disabled` and `readonly` and a small helper `Editing name and email is not yet supported`. Role is editable via `<Select>` (`Member`/`PM`/`Admin`).
- Save calls `PATCH /members/:id/role`. On success: collapse the row, toast `Member updated`, refresh.
- This is the documented PrimeVue/API parity compromise that `apps/admin-web/AGENTS.md` requires us to call out in the final review.

### Backend: `users.last_active_at` + `lastActiveAt` and `projectsAssignedCount` on the member contract

- Add `last_active_at timestamptz null` to `users` (Drizzle migration).
- Bump `users.last_active_at` from time-tracking write paths only (start timer, stop timer, create entry, update entry, delete entry). This avoids an N+1 update on read paths and keeps the column meaningful (it tracks "tracked time", which is what the design's `Last Active` column communicates). A future change can broaden it to other write paths.
- Update `workspaceMemberResponseSchema` in `packages/shared/src/contracts/workspace-members.ts` to include `lastActiveAt: z.iso.datetime().nullable()` and `projectsAssignedCount: z.number().int().min(0)`.
- `MembersService.listMembers` joins `project_assignments` (or `workspace_members.user_id` against `projects.members`, whichever the existing `Project` data model uses) and `count()`s assignments per user in a single query, and selects `users.last_active_at`.
- Run `pnpm openapi:export` (or the equivalent build-based regen path noted in `apps/api/AGENTS.md`) to refresh `packages/shared/openapi.json`.

Alternatives considered:

- _Compute `projectsAssignedCount` and `lastActiveAt` on the client by scanning `GET /projects`._ Rejected for `lastActiveAt` because no `last_active_at` field exists anywhere today. Rejected for `projectsAssignedCount` because keeping it server-derived avoids the assumption that the projects list is fully loaded (eventual server-side pagination breaks the client-only count).

### `MembersView` mounts `<ConfirmDialog />` at the view root, like Projects already does

`AdminAppShell` does not currently render a global `<ConfirmDialog>` host (Projects relies on the toast service registered globally and uses `useConfirm()` only when applicable). To stay aligned with `docs/ui/patterns.md` ("keep the `<ConfirmDialog>` host at the route, page-shell, or app-shell level"), `MembersView.vue` mounts a single `<ConfirmDialog />` at its root. This change is local to Members and does not move the host into `MembersTable` or rows.

## Risks / Trade-offs

- [Schema drift if OpenAPI regen is skipped] → The PR description includes a checklist item to regenerate `packages/shared/openapi.json` per `apps/api/AGENTS.md`. The `pnpm openapi:export` gotcha (tsx vs nest build) is documented there and the maintainer-preferred regen path is the build-based one.
- [`last_active_at` is null for all existing users on first deploy] → Mitigation: render `—` in the `Last Active` cell when null and document that the column populates as users start tracking after the migration. No backfill is attempted.
- [Pixel parity drift between `ProjectsTable` and `MembersTable` after the shared shell extraction] → Mitigation: refactor `ProjectsTable` to consume `ManagementTableShell` in the same change, and verify both screens by snapshot/visual review against the `.pen`. The shared component owns the chrome so both consumers cannot drift.
- [Edit form Name/Email being read-only is visually different from the design] → Mitigation: keep field shape and order identical (Name, Email, Role) so the layout still matches; disabled state is the only deviation, called out explicitly in the final review per `apps/admin-web/AGENTS.md`.
- [Last-admin protection regressions when removing a member] → The backend already enforces "Last admin cannot be removed" (`workspace-membership` spec, `MembersService.assertCanLoseAdminRole`). The UI surfaces the resulting 409 message via the existing toast pattern and does not attempt to pre-disable the action; this matches Projects' approach to backend-enforced invariants.
- [Promoting `ManagementTableShell` could leak product-specific behavior into a shared component] → Mitigation: the shell only exposes column descriptors, body row slot, expansion slot, empty slot, and link-button styles. Filter selects and product-specific columns stay in the consumer (e.g., the assigned-member filter remains in `ProjectsTable`; nothing similar exists for Members today).

## Migration Plan

1. Backend: add the `users.last_active_at` migration and the `MembersService.listMembers` projection update; wire `last_active_at` updates from time-entry/timer write paths.
2. Shared contracts: extend `workspaceMemberResponseSchema` with the two new fields; rebuild `@gitiempo/shared`; regenerate `packages/shared/openapi.json`.
3. Shared frontend: add `StatCard` and `ManagementTableShell` to `packages/web-shared`; export them from the package entry.
4. Admin web refactor: update `ProjectStatCard` consumers to import `StatCard` from `@gitiempo/web-shared` and refactor `ProjectsTable.vue` to render through `ManagementTableShell`. Verify Projects parity visually before adding Members.
5. Admin web feature: ship `MembersView.vue`, `MembersTable.vue`, `MemberInviteDialog.vue`, `MemberAssignPmPanel.vue`, `MemberEditForm.vue`, and `services/admin-members-client.ts`.
6. Run `pnpm --filter admin-web lint && pnpm --filter admin-web typecheck && pnpm --filter admin-web test`, `pnpm --filter user-web lint && pnpm --filter user-web typecheck` (web-shared touched), and `pnpm --filter @gitiempo/api lint && pnpm --filter @gitiempo/api typecheck && pnpm --filter @gitiempo/api test`, plus `pnpm --filter @gitiempo/api test:e2e` for the member/invite suites.

Rollback: revert the migration and the contract change (the SQL drop of `users.last_active_at` is reversible). The frontend additions are net-new files plus a refactor; reverting the change reinstates the placeholder page.

## Open Questions

- Should `Active Members` exclude PMs? The design caption ("Manage team roles, project assignments, and member activity") and the existing `members` endpoint both treat the count as "all active memberships". This change uses `members.length` and notes that PMs are counted (the dedicated `PMs Assigned` card already breaks them out). Confirm during review.
- Should `Last Active` reflect any authenticated request (including web shell visits) or only time-tracking writes? This change scopes it to time-tracking writes for now (see Decisions); broaden in a follow-up if product wants a "last seen in app" semantic.
