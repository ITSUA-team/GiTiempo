## 1. Shared frontend: promote `StatCard` and `ManagementTableShell`

- [x] 1.1 Add `packages/web-shared/src/components/StatCard.vue` mirroring the markup of `apps/admin-web/src/components/ProjectStatCard.vue`, with `defineProps<{ label: string; value: number | string }>()`.
- [x] 1.2 Add `packages/web-shared/src/components/ManagementTableShell.vue` that owns the outer rounded border, the 44px custom header row (driven by a `columns` prop with `{ key, label, width?: number | 'fill', align?: 'start' | 'end' }`), the stripped `DataTable` body via slots (`#row`, `#expansion`, `#empty`), and the `gt-action-btn` link button styles.
- [x] 1.3 Re-export both components from `packages/web-shared/src/components/index.ts` and the package barrel `packages/web-shared/src/index.ts`.
- [x] 1.4 Refactor `apps/admin-web/src/views/ProjectsView.vue` and `apps/admin-web/src/components/ProjectsTable.vue` to consume `StatCard` and `ManagementTableShell` from `@gitiempo/web-shared` without behavior change. Delete `apps/admin-web/src/components/ProjectStatCard.vue` once unreferenced.
- [x] 1.5 Run `pnpm --filter user-web lint && pnpm --filter user-web typecheck` and `pnpm --filter admin-web lint && pnpm --filter admin-web typecheck` and confirm all green.
- [ ] 1.6 Visually verify the Projects screen against the `.pen` design (`6iAjf`) so parity is preserved before adding Members.

## 2. Admin web: Members data layer

- [x] 2.1 Add `apps/admin-web/src/services/admin-members-client.ts` exposing `listMembers`, `updateMemberRole`, `removeMember`, `listInvites`, `createInvite`, and `cancelInvite` via the shared `requestJson` helper, matching the existing `admin-projects-client.ts` style.
- [x] 2.2 Add a thin browser-only invite form schema at `packages/web-shared/src/validation/workspace-invite-form.ts` that wraps `createWorkspaceInviteSchema` from `@gitiempo/shared` and exposes a UI-friendly Zod helper plus error mapping, re-exporting from the package barrel.

## 3. Admin web: `MembersView` page composition

- [x] 3.1 Replace the placeholder body of `apps/admin-web/src/views/MembersView.vue` with the full page composition: `StatsHeader` (title `Members`, description, `#actions` slot containing the `Invite Member` primary `<Button>`), three `StatCard` instances for Active Members, Pending Invites, and PMs Assigned, and a `SurfaceCard padding-class="p-5"` wrapping the members table.
- [x] 3.2 Mount a single `<ConfirmDialog />` at the view root per `docs/ui/patterns.md`.
- [x] 3.3 Implement parallel data loading on mount through `admin-members-client` (members + invites) and `adminProjectsClient.listProjects` (active projects, used by the inline assignment expansion).
- [x] 3.4 Compute counters: `activeMembers = members.length`, `pendingInvites = invites.filter(i => i.status === 'pending').length`, `pmsAssigned = members.filter(m => m.role === 'pm').length`. Refresh on invite creation.

## 4. Admin web: Members table and inline panels

- [x] 4.1 Add `apps/admin-web/src/components/MembersTable.vue` rendering through `ManagementTableShell` with columns `Member`, `Role`, `Projects Assigned`, `Last Active`, `Actions`. Member cell shows `<Avatar>` plus name and email. Last Active cell renders `—` (API does not provide this field yet). Projects Assigned is computed client-side from the projects list.
- [x] 4.2 Implement actions per row:
  - `Assign PM` (only when `role !== 'admin'`) toggles inline expansion that renders `MemberAssignPmPanel`.
  - `Edit` toggles inline expansion that renders `MemberEditForm`.
  - `Remove` opens `useConfirm()` destructive confirm and calls `admin-members-client.removeMember`.
- [x] 4.3 Add `apps/admin-web/src/components/MemberAssignPmPanel.vue` rendering a `PM assignment` panel with `<Checkbox>` + label per active project, pre-checked from current assignments. Footer: `Cancel` (secondary outlined) + `Save Assignments` (primary). Save computes the assignment diff and calls `adminProjectsClient.assignMember` / `removeAssignment` per project.
- [x] 4.4 Add `apps/admin-web/src/components/MemberEditForm.vue` rendering Name, Email, Role fields. Name and Email use disabled `<InputText>` with a small helper note; Role uses `<Select>` with options `Member`/`PM`/`Admin`. Footer: `Cancel` + `Save`. Save calls `admin-members-client.updateMemberRole`.
- [x] 4.5 Wire toast notifications for success and error paths in all three flows (invite create, assignment save, role update, member remove) using the existing `useToast()` pattern.

## 5. Admin web: Invite Member dialog

- [x] 5.1 Add `apps/admin-web/src/components/MemberInviteDialog.vue` using PrimeVue `<Dialog>` (`modal`, `:style="{ width: '480px' }"`) with `<InputText>` for email and `<Select>` for role (options `Member`/`PM`/`Admin`).
- [x] 5.2 Validate the form payload against the shared invite form schema added in 2.2 before submitting; render field-level error helpers on validation failure.
- [x] 5.3 On submit, call `admin-members-client.createInvite`. Close the dialog on success, trigger a background refresh. On failure, keep the dialog open and surface the error via toast.

## 6. Verification

- [x] 6.1 Build a written parity checklist from the `.pen` Members screen (`sBfSO`) covering states, required fields, field order, actions, spacing, radii, and responsive structure, and confirm each item against the implementation.
- [x] 6.2 Run `pnpm --filter admin-web lint && pnpm --filter admin-web typecheck`.
- [x] 6.3 Run `pnpm --filter user-web lint && pnpm --filter user-web typecheck` because `packages/web-shared` changed.
- [x] 6.4 In the final review, explicitly state the documented PrimeVue/API parity compromise: the inline edit form keeps Name and Email fields visible per the design but renders them disabled because no admin-side endpoint exists to update them today. The Last Active column renders `—` because the API does not return `lastActiveAt` yet.
