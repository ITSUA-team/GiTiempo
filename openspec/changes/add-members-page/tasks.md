## 1. Backend: last-activity tracking and member contract enrichment

- [x] 1.1 Add a Drizzle migration that introduces `users.last_active_at timestamptz null` and update `apps/api/src/users/schemas/users.schema.ts` to expose the column.
- [x] 1.2 Add a small `UsersActivityService` (or extend `UsersService`) helper in `apps/api/src/users` that bumps `users.last_active_at = now()` for a given `userId` in a single update.
- [x] 1.3 Wire the activity bump into time-tracking write paths: timer start, timer start-from-github, timer stop, time-entry create, time-entry update, and time-entry delete in `apps/api/src/time-entries/services/*` and `apps/api/src/time-entries/controllers/time-entries.controller.ts`.
- [x] 1.4 Update `MembersService.listMembers` in `apps/api/src/members/services/members.service.ts` to (a) select `users.last_active_at` and (b) join the project assignments source of truth and `count()` per user, returning `lastActiveAt` and `projectsAssignedCount` on each row.
- [x] 1.5 Update `apps/api/src/members/dto/workspace-member-response.dto.ts` (and the list response DTO) to include the two new fields and confirm the Zod-derived DTO maps them through `ZodSerializerDto`.
- [x] 1.6 Extend `apps/api/test` and e2e suites under `apps/api/test/e2e` for members listing to assert `lastActiveAt` is null until the first time-tracking write and is updated afterward, and that `projectsAssignedCount` matches the assigned set.
- [ ] 1.7 Run `pnpm --filter @gitiempo/api lint && pnpm --filter @gitiempo/api typecheck && pnpm --filter @gitiempo/api test` and `pnpm --filter @gitiempo/api test:e2e` and confirm all green.

## 2. Shared contracts: workspace member fields and OpenAPI regen

- [x] 2.1 Update `packages/shared/src/contracts/workspace-members.ts` so `workspaceMemberResponseSchema` includes `lastActiveAt: z.iso.datetime().nullable()` and `projectsAssignedCount: z.number().int().min(0)`.
- [ ] 2.2 Rebuild `@gitiempo/shared` (`pnpm --filter @gitiempo/shared build`) and confirm downstream type names still resolve.
- [ ] 2.3 Regenerate `packages/shared/openapi.json` using the build-based regen path documented in `apps/api/AGENTS.md` (the `pnpm openapi:export` tsx caveat applies; use the `nest build` path if needed).

## 3. Shared frontend: promote `StatCard` and `ManagementTableShell`

- [x] 3.1 Add `packages/web-shared/src/components/StatCard.vue` mirroring the markup of `apps/admin-web/src/components/ProjectStatCard.vue`, with `defineProps<{ label: string; value: number | string }>()`.
- [x] 3.2 Add `packages/web-shared/src/components/ManagementTableShell.vue` that owns the outer rounded border, the 44px custom header row (driven by a `columns` prop with `{ key, label, width?: number | 'fill', align?: 'start' | 'end' }`), the stripped `DataTable` body via slots (`#row`, `#expansion`, `#empty`), and the `gt-action-btn` link button styles.
- [x] 3.3 Re-export both components from `packages/web-shared/src/components/index.ts` and the package barrel `packages/web-shared/src/index.ts`.
- [x] 3.4 Refactor `apps/admin-web/src/views/ProjectsView.vue` and `apps/admin-web/src/components/ProjectsTable.vue` to consume `StatCard` and `ManagementTableShell` from `@gitiempo/web-shared` without behavior change. Delete `apps/admin-web/src/components/ProjectStatCard.vue` once unreferenced.
- [x] 3.5 Run `pnpm --filter user-web lint && pnpm --filter user-web typecheck` and `pnpm --filter admin-web lint && pnpm --filter admin-web typecheck` and confirm all green.
- [ ] 3.6 Visually verify the Projects screen against the `.pen` design (`6iAjf`) so parity is preserved before adding Members.

## 4. Admin web: Members data layer

- [x] 4.1 Add `apps/admin-web/src/services/admin-members-client.ts` exposing `listMembers`, `updateMemberRole`, `removeMember`, `listInvites`, `createInvite`, and `cancelInvite` via the shared `requestJson` helper, matching the existing `admin-projects-client.ts` style.
- [x] 4.2 Add a thin browser-only invite form schema at `packages/web-shared/src/validation/workspace-invite-form.ts` that wraps `createWorkspaceInviteSchema` from `@gitiempo/shared` and exposes a UI-friendly Zod helper plus error mapping, re-exporting from the package barrel.

## 5. Admin web: `MembersView` page composition

- [x] 5.1 Replace the placeholder body of `apps/admin-web/src/views/MembersView.vue` with the full page composition: `StatsHeader` (title `Members`, description, `#actions` slot containing the `Invite Member` primary `<Button>`), three `StatCard` instances for Active Members, Pending Invites, and PMs Assigned, and a `SurfaceCard padding-class="p-5"` wrapping the members table.
- [x] 5.2 Mount a single `<ConfirmDialog />` at the view root per `docs/ui/patterns.md`.
- [x] 5.3 Implement parallel data loading on mount through `admin-members-client` (members + invites) and `adminProjectsClient.listProjects` (active projects, used by the inline assignment expansion).
- [x] 5.4 Compute counters: `activeMembers = members.length`, `pendingInvites = invites.length`, `pmsAssigned = members.filter(m => m.role === 'pm').length`. Increment local state optimistically on invite creation, then refresh.

## 6. Admin web: Members table and inline panels

- [x] 6.1 Add `apps/admin-web/src/components/MembersTable.vue` rendering through `ManagementTableShell` with columns `Member`, `Role`, `Projects Assigned`, `Last Active`, `Actions`. Member cell shows `<Avatar>` plus name and email. Last Active cell formats relative or short date and renders `—` when null.
- [x] 6.2 Implement actions per row:
  - `Assign PM` (only when `role !== 'admin'`) toggles inline expansion that renders `MemberAssignPmPanel`.
  - `Edit` toggles inline expansion that renders `MemberEditForm`.
  - `Remove` opens `useConfirm()` destructive confirm and calls `admin-members-client.removeMember`.
- [x] 6.3 Add `apps/admin-web/src/components/MemberAssignPmPanel.vue` rendering a `PM assignment` panel with `<Checkbox>` + label per active project, pre-checked from current assignments. Footer: `Cancel` (secondary outlined) + `Save Assignments` (primary). Save computes the assignment diff and calls `adminProjectsClient.assignMember` / `removeAssignment` per project as `ProjectEditForm.handleSave` already does.
- [x] 6.4 Add `apps/admin-web/src/components/MemberEditForm.vue` rendering Name, Email, Role fields. Name and Email use disabled `<InputText>` with a small helper note; Role uses `<Select>` with options `Member`/`PM`/`Admin`. Footer: `Cancel` + `Save`. Save calls `admin-members-client.updateMemberRole`.
- [x] 6.5 Wire toast notifications for success and error paths in all three flows (invite create, assignment save, role update, member remove) using the existing `useToast()` pattern.

## 7. Admin web: Invite Member dialog

- [x] 7.1 Add `apps/admin-web/src/components/MemberInviteDialog.vue` using PrimeVue `<Dialog>` (`modal`, `:style="{ width: '480px' }"`) with `<InputText>` for email and `<Select>` for role (options `Member`/`PM`/`Admin`).
- [x] 7.2 Validate the form payload against the shared invite form schema added in 4.2 before submitting; render field-level error helpers on validation failure.
- [x] 7.3 On submit, call `admin-members-client.createInvite`. Close the dialog on success, append the returned invite to the local invites ref so `Pending Invites` increments without a round-trip, then trigger a background refresh. On failure, keep the dialog open and surface the error via toast.

## 8. Verification

- [x] 8.1 Build a written parity checklist from the `.pen` Members screen (`sBfSO`) covering states, required fields, field order, actions, spacing, radii, and responsive structure, and confirm each item against the implementation.
- [x] 8.2 Run `pnpm --filter admin-web lint && pnpm --filter admin-web typecheck && pnpm --filter admin-web test`.
- [x] 8.3 Run `pnpm --filter user-web lint && pnpm --filter user-web typecheck` because `packages/web-shared` changed.
- [ ] 8.4 Run `pnpm --filter @gitiempo/api lint && pnpm --filter @gitiempo/api typecheck && pnpm --filter @gitiempo/api test` and `pnpm --filter @gitiempo/api test:e2e`.
- [ ] 8.5 Confirm `packages/shared/openapi.json` was regenerated and is committed.
- [x] 8.6 In the final review, explicitly state the documented PrimeVue/API parity compromise: the inline edit form keeps Name and Email fields visible per the design but renders them disabled because no admin-side endpoint exists to update them today.
