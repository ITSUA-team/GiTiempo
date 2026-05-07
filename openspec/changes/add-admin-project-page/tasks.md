## 1. Shared `StatsHeader` Component

- [ ] 1.1 Create `packages/web-shared/src/components/StatsHeader.vue` with props `title: string` and `description: string`, an `actions` slot on the right of the title row, and a `stats` slot rendered as a full-width row below the title row.
- [ ] 1.2 Title row layout: horizontal flex with `justify-content: space-between`; title and description stacked vertically on the left with `gap: 6px`; `actions` slot on the right.
- [ ] 1.3 Stats slot row: horizontal flex, `gap: 16px`, fixed height `96px`.
- [ ] 1.4 Apply correct typography tokens — title `Inter 600 28px $color-text-dark`, description `Inter regular 14px $color-text-muted`.
- [ ] 1.5 Export `StatsHeader` from `packages/web-shared/src/index.ts`.

## 2. Admin-local `ProjectStatCard` Component

- [ ] 2.1 Create `apps/admin-web/src/components/ProjectStatCard.vue` with props `label: string` and `value: number`.
- [ ] 2.2 Card shell: `$color-surface` fill, `$radius-lg` radius, box-shadow `0 1px 3px rgba(0,0,0,0.08)`, `padding: 16px`, `gap: 8px`, vertical layout, `height: 100%`.
- [ ] 2.3 Render label as `Inter 500 13px $color-text-muted` and value as `Inter 600 28px $color-text-dark`.

## 3. Admin-local `ProjectEditForm` Component

- [ ] 3.1 Create `apps/admin-web/src/components/ProjectEditForm.vue` with props `project: ProjectResponse` and `allMembers: WorkspaceMemberListResponse`; emits `saved` (carrying the updated `ProjectResponse`) and `cancelled`.
- [ ] 3.2 Initialise internal state: `selectedMemberIds` from `project.members.map(m => m.userId)` and `selectedVisibility` from `project.visibility`.
- [ ] 3.3 Wrapper layout: `$color-app-bg` fill, `padding: 16px`, `gap: 10px`, vertical flex, top border `1px solid $color-divider`; "Project settings" label `Inter 600 13px $color-text-dark`.
- [ ] 3.4 Fields row: horizontal flex, `gap: 10px`, `align-items: end` — PrimeVue `MultiSelect` (full-width, placeholder "Select members") bound to `selectedMemberIds` with options mapped from `allMembers` as `{ label: m.displayName ?? m.email, value: m.userId }`; PrimeVue `Select` (width 180px, label "Visibility") bound to `selectedVisibility` with options `[{ label: 'Public', value: 'public' }, { label: 'Private', value: 'private' }]`.
- [ ] 3.5 Actions row right-aligned: PrimeVue `Button` severity `secondary` "Cancel" emits `cancelled`; PrimeVue `Button` severity `primary` "Save" triggers `handleSave`.
- [ ] 3.6 `handleSave`: call `PATCH /projects/:id` with `{ visibility: selectedVisibility }` using the existing admin-web HTTP helpers; compute `toAdd` (selected ids absent from `project.members`) and `toRemove` (current member ids absent from selection); call `POST /projects/:id/assignments` with `{ userId }` for each `toAdd` and `DELETE /projects/:id/assignments/:userId` for each `toRemove` sequentially; emit `saved` with the updated project from the PATCH response.
- [ ] 3.7 Do not use optional chaining (`?.`) or optional prop types (`prop?: Type`) anywhere in the component's props interface or internal type annotations.

## 4. Admin-local `ProjectsTable` Component

- [ ] 4.1 Create `apps/admin-web/src/components/ProjectsTable.vue` with props `projects: ProjectListResponse`, `members: WorkspaceMemberListResponse`, `loading: boolean`; emits `edit-saved`, `archive`, `unarchive`.
- [ ] 4.2 Internal state: `expandedRows` map keyed by project id, `selectedMemberId` (nullable string) for the member filter.
- [ ] 4.3 Computed `filteredProjects`: when `selectedMemberId` is set return only projects whose `members` array contains that userId; otherwise return all projects unmodified.
- [ ] 4.4 Above the PrimeVue `DataTable`, render a header row (horizontal flex, `justify-content: space-between`): left "Projects Table" `Inter 600 18px $color-text-dark`; right PrimeVue `Select` (width 260px, placeholder "Assigned member") bound to `selectedMemberId`, options from `members` mapped as `{ label: m.displayName ?? m.email, value: m.userId }`.
- [ ] 4.5 DataTable columns in order with cell padding `0 12px` and row height `56px`: Project (fill-width, name `Inter 600 14px` — `$color-text-muted` when `!row.isActive`, else `$color-text-dark`); Source (140px, `'github' → 'GitHub Repo' | 'manual' → 'Manual'`, `$color-text-muted`); Assigned members (220px, `${row.members.length} members`, `$color-text-muted`); Hours (120px, `${row.totalHours}h`, `Inter 600 13px $color-text-dark`); Visibility (120px, PrimeVue `Tag` — public styled brand-tint, private styled warn); Actions (150px, right-aligned).
- [ ] 4.6 Actions column: for active rows render PrimeVue `Button` text variant "Edit" in brand color that sets `expandedRows[row.id] = true`, and PrimeVue `Button` text variant "Archive" in destructive color that calls `handleArchive(row)`; for archived rows render only PrimeVue `Button` text variant "Unarchive" in muted color that calls `handleUnarchive(row)`.
- [ ] 4.7 DataTable row expansion slot renders `ProjectEditForm` passing `project` and `allMembers` (the full `members` prop); on `saved` close the expanded row and emit `edit-saved`; on `cancelled` close the expanded row.
- [ ] 4.8 Strip DataTable expanded-row cell padding to `0` using a scoped `:deep(.p-datatable-row-expansion td) { padding: 0; }` rule so `ProjectEditForm` sits flush.
- [ ] 4.9 Table head row height `44px` with `$color-app-bg` background; DataTable `loading` prop wired to the `loading` prop.
- [ ] 4.10 `handleArchive`: call `PATCH /projects/:id` with `{ isActive: false }` using existing HTTP helpers; on success emit `archive`.
- [ ] 4.11 `handleUnarchive`: call `PATCH /projects/:id` with `{ isActive: true }` using existing HTTP helpers; on success emit `unarchive`.

## 5. `AddProjectMockView` and Route Registration

- [ ] 5.1 Create `apps/admin-web/src/views/AddProjectMockView.vue` using `PlaceholderPage` from `@gitiempo/web-shared` with copy indicating the add-project form is coming soon.
- [ ] 5.2 Add `addProject: 'admin-add-project'` to the `routeNames` map in `apps/admin-web/src/router/index.ts`.
- [ ] 5.3 Register the route `{ path: '/admin/projects/new', name: routeNames.addProject, component: AddProjectMockView, meta: { requiresAuth: true } }` inside the `AdminAppShell` children array before any catch-all route.

## 6. `ProjectsView` Composition

- [ ] 6.1 Replace the `PlaceholderPage` contents of `apps/admin-web/src/views/ProjectsView.vue` with a composition-only view that imports `StatsHeader` from `@gitiempo/web-shared` and `ProjectStatCard`, `ProjectsTable` from `@/components`.
- [ ] 6.2 Declare refs `projects: ProjectListResponse`, `summary: ManagementProjectSummaryResponse`, `members: WorkspaceMemberListResponse`, and `loading: boolean` using `ref`; no Pinia store.
- [ ] 6.3 `fetchAll()` on `onMounted`: fetch `GET /projects`, `GET /projects/management-summary`, and `GET /workspace-members` in parallel using existing admin-web HTTP helpers; set `loading` appropriately.
- [ ] 6.4 `refresh()`: re-fetch `GET /projects` and `GET /projects/management-summary` only (member list is stable for the session).
- [ ] 6.5 Computed `sortedProjects`: active projects (`isActive: true`) first, archived last.
- [ ] 6.6 Template: `StatsHeader` with title "Projects" and description "Manage project visibility, member assignments, and manual project creation."; `#actions` slot contains PrimeVue `Button` "New Project" that calls `router.push({ name: routeNames.addProject })`; `#stats` slot contains three `ProjectStatCard` instances for `summary.activeProjects`, `summary.privateProjects`, `summary.publicProjects`.
- [ ] 6.7 `ProjectsTable` below with `:projects="sortedProjects"`, `:members="members"`, `:loading="loading"`, `@edit-saved="refresh"`, `@archive="refresh"`, `@unarchive="refresh"`.
- [ ] 6.8 Page wrapper: `padding: 24px`, vertical flex layout, `gap: 24px` between `StatsHeader` and `ProjectsTable` card — matching the `.pen` design node `6iAjf` content area.
- [ ] 6.9 Projects card shell wrapping `ProjectsTable`: `$color-surface`, `$radius-lg`, shadow `0 1px 3px rgba(0,0,0,0.08)`, `padding: 20px`, `gap: 16px`, vertical layout.

## 7. Design Parity Review

- [ ] 7.1 Verify page padding `24px`, stats row height `96px` and `gap: 16px`, stat card padding `16px` and `gap: 8px` match the `.pen` design node `6iAjf`.
- [ ] 7.2 Verify projects card: `padding: 20px`, `gap: 16px`, `$radius-lg` radius, shadow present.
- [ ] 7.3 Verify table head row height `44px` with `$color-app-bg` background; data row height `56px`; cell padding `0 12px`; expansion row cell padding `0`.
- [ ] 7.4 Verify action buttons `Edit` and `Archive` cell padding `4px 6px`; Actions column `150px` and right-aligned.
- [ ] 7.5 Verify visibility badge: public uses `$color-accent-tint` background with `$color-brand` text; private uses `$color-status-warn-bg` with `$color-status-warn-text`.
- [ ] 7.6 Verify archived rows: project name in `$color-text-muted`; only "Unarchive" action shown with muted text; no "Edit" or "Archive" buttons present.
- [ ] 7.7 Document any PrimeVue-only compromises that prevent exact pixel parity before marking the change complete.

## 8. Verification

- [ ] 8.1 Run `pnpm --filter @gitiempo/web-shared typecheck` after adding `StatsHeader`.
- [ ] 8.2 Run `pnpm --filter admin-web lint` and fix any newly introduced warnings.
- [ ] 8.3 Run `pnpm --filter admin-web typecheck` and fix any type errors.
- [ ] 8.4 Because `packages/web-shared` export surface changed, run `pnpm --filter user-web typecheck` to confirm no regressions in the user SPA.
- [ ] 8.5 Confirm no API contract, shared schema, HTTP helper, or backend files were modified.
