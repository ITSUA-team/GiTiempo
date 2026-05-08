## Context

The Members route in `apps/admin-web` currently renders a `PlaceholderPage`. The approved design lives in `GITiempo.pen` as the `Admin Members` frame (`sBfSO`) and the supporting backend already exposes the bulk of what the page needs:

- `GET /members`, `PATCH /members/:id/role`, `DELETE /members/:id` (admin-guarded by `WorkspaceAdminGuard`).
- `GET /invites`, `POST /invites`, `DELETE /invites/:id` (admin-guarded).
- `GET /projects`, `POST /projects/:id/assignments`, `DELETE /projects/:id/assignments/:userId` (admin-guarded for mutations, used by `ProjectsView` already).

The Projects page (`apps/admin-web/src/views/ProjectsView.vue`, `components/ProjectsTable.vue`, `components/ProjectEditForm.vue`, `components/ProjectStatCard.vue`) is the closest live reference. Its boxed-table chrome (custom 44px header + DataTable body with PrimeVue chrome stripped + `gt-action-btn` link buttons + edge-to-edge expansion row) matches the Members table 1:1 in the `.pen` design. The stat card markup also matches the Members `Active Members / Pending Invites / PMs Assigned` cards 1:1.

This change must therefore both (a) ship the Members page pixel-aligned to the `.pen` and (b) promote the two repeating leaves (`StatCard`, table chrome) to `packages/web-shared` so Projects and Members share a single implementation. Both `apps/admin-web/AGENTS.md` and `packages/web-shared/AGENTS.md` already direct us to extract docs-defined repeated UI patterns once a second consumer ships, and `frontend-shared-leaves` codifies that rule.

The page also needs two pieces of data the API does not yet provide: `Last Active` (no `last_active_at` field exists on `users` or `workspace_members`) and `Projects Assigned` per member (today only resolvable by counting from `GET /projects` on the client). For this frontend-only change, `Last Active` renders `—` and `Projects Assigned` is computed client-side from the already-loaded projects list. Backend extensions to provide these fields server-side are tracked as a follow-up change.

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

**Non-Goals:**

- Editing a member's `displayName` or `email` from the admin UI. There is no admin-side endpoint for those fields today (only `PATCH /users/me`). The edit form renders Name and Email read-only and only Role is editable. Adding admin-side identity edits is intentionally deferred to a follow-up change.
- Soft-archive of members; `Remove` continues to be a hard delete via `DELETE /members/:id` per the existing endpoint.
- Server-side pagination, search, or sort on the members table. Both Projects and Members render the full list client-side for MVP, identical to current Projects behavior.
- Splitting `WorkspaceAdminGuard` to allow PMs to access this page. The Members page stays admin-only.
- Mobile-specific layout work beyond what PrimeVue and Tailwind tokens already provide. Desktop-first parity is the bar, matching `apps/admin-web/AGENTS.md`.
- Backend changes: adding `users.last_active_at`, enriching the member response with `lastActiveAt`/`projectsAssignedCount`, or regenerating `openapi.json`. These are deferred to a follow-up change.

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

### `Last Active` renders `—`; `Projects Assigned` computed client-side

The API does not return `lastActiveAt` or `projectsAssignedCount` on the member response. Rather than block the frontend on backend changes:

- `Last Active` renders `—` for all rows. When the backend adds `users.last_active_at` in a follow-up change, the column can be wired to the real field.
- `Projects Assigned` is computed client-side by counting assignments from the already-loaded `GET /projects` response. This works because the page already fetches the full project list for the PM assignment panel. When the backend adds `projectsAssignedCount` to the member response, the client-side derivation can be replaced.

### `MembersView` mounts `<ConfirmDialog />` at the view root, like Projects already does

`AdminAppShell` does not currently render a global `<ConfirmDialog>` host (Projects relies on the toast service registered globally and uses `useConfirm()` only when applicable). To stay aligned with `docs/ui/patterns.md` ("keep the `<ConfirmDialog>` host at the route, page-shell, or app-shell level"), `MembersView.vue` mounts a single `<ConfirmDialog />` at its root. This change is local to Members and does not move the host into `MembersTable` or rows.

## Risks / Trade-offs

- [Pixel parity drift between `ProjectsTable` and `MembersTable` after the shared shell extraction] → Mitigation: refactor `ProjectsTable` to consume `ManagementTableShell` in the same change, and verify both screens by snapshot/visual review against the `.pen`. The shared component owns the chrome so both consumers cannot drift.
- [Edit form Name/Email being read-only is visually different from the design] → Mitigation: keep field shape and order identical (Name, Email, Role) so the layout still matches; disabled state is the only deviation, called out explicitly in the final review per `apps/admin-web/AGENTS.md`.
- [Last-admin protection regressions when removing a member] → The backend already enforces "Last admin cannot be removed" (`workspace-membership` spec, `MembersService.assertCanLoseAdminRole`). The UI surfaces the resulting 409 message via the existing toast pattern and does not attempt to pre-disable the action; this matches Projects' approach to backend-enforced invariants.
- [Promoting `ManagementTableShell` could leak product-specific behavior into a shared component] → Mitigation: the shell only exposes column descriptors, body row slot, expansion slot, empty slot, and link-button styles. Filter selects and product-specific columns stay in the consumer (e.g., the assigned-member filter remains in `ProjectsTable`; nothing similar exists for Members today).
- [`Projects Assigned` count computed client-side may drift from truth if server-side pagination is added later] → Mitigation: documented as a known limitation; when the backend extends the member response, the client derivation can be swapped for the server-provided count.

## Migration Plan

1. Shared frontend: add `StatCard` and `ManagementTableShell` to `packages/web-shared`; export them from the package entry.
2. Admin web refactor: update `ProjectStatCard` consumers to import `StatCard` from `@gitiempo/web-shared` and refactor `ProjectsTable.vue` to render through `ManagementTableShell`. Verify Projects parity visually before adding Members.
3. Admin web feature: ship `MembersView.vue`, `MembersTable.vue`, `MemberInviteDialog.vue`, `MemberAssignPmPanel.vue`, `MemberEditForm.vue`, and `services/admin-members-client.ts`.
4. Run `pnpm --filter admin-web lint && pnpm --filter admin-web typecheck`, `pnpm --filter user-web lint && pnpm --filter user-web typecheck` (web-shared touched).

Rollback: the frontend additions are net-new files plus a refactor; reverting the change reinstates the placeholder page.

## Open Questions

- Should `Active Members` exclude PMs? The design caption ("Manage team roles, project assignments, and member activity") and the existing `members` endpoint both treat the count as "all active memberships". This change uses `members.length` and notes that PMs are counted (the dedicated `PMs Assigned` card already breaks them out). Confirm during review.
