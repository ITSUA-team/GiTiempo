## 1. Context And Parity

- [x] 1.1 Open the approved `GITiempo.pen` design and inspect the admin Members and Projects table frames before editing UI files.
- [x] 1.2 Use `docs/ui/INDEX.md`, `docs/ui/components.md`, `docs/ui/pages-admin.md`, `docs/ui/patterns.md`, and `apps/admin-web/AGENTS.md` as the implementation sources of truth.
- [x] 1.3 Confirm the refactor does not require backend, database, OpenAPI, route, shared contract, theme, or token changes.

## 2. Members Table Ownership

- [x] 2.1 Update `MembersTable.vue` so the desktop and mobile `Remove` actions emit `remove-member` with the selected member instead of opening confirmation or calling member APIs.
- [x] 2.2 Remove `MembersTable.vue` dependencies on admin API clients, auth store, confirmation helpers, and toast helpers.
- [x] 2.3 Keep Members table filtering, desktop/mobile rendering, assign expansion, edit expansion, row collapse behavior, labels, tooltips, and `data-testid` values unchanged except where event names must change.
- [x] 2.4 Move member removal confirmation, access-token early return, `adminMembersClient.removeMember`, success toast, error toast, and member refresh orchestration into `MembersView.vue` or a focused members-page composable.
- [x] 2.5 Wire `MembersView.vue` to handle the table's `remove-member` intent while preserving existing `role-updated` and `assignments-updated` refresh behavior.

## 3. Projects Table Ownership

- [x] 3.1 Keep `ProjectsTable.vue` archive and unarchive controls out of desktop and mobile row/card actions, with status actions rendered by page-owned inline project settings content.
- [x] 3.2 Update inline project settings archive and unarchive actions so they emit `archive` or `unarchive` with the selected project instead of calling project APIs.
- [x] 3.3 Remove `ProjectsTable.vue` dependencies on admin API clients, auth store, confirmation helpers, and toast helpers.
- [x] 3.4 Keep Projects table filtering, desktop/mobile rendering, edit expansion, row collapse behavior, inline settings action visibility, labels, tooltips, and `data-testid` values unchanged.
- [x] 3.5 Move archive confirmation, access-token early return, `{ isActive: false }` update, success toast, error toast, and projects/summary refresh orchestration into `ProjectsView.vue` or a focused projects-page composable.
- [x] 3.6 Move unarchive access-token early return, `{ isActive: true }` update, success toast, error toast, and projects/summary refresh orchestration into `ProjectsView.vue` or the same focused projects-page composable.
- [x] 3.7 Wire `ProjectsView.vue` to handle inline settings `archive` and `unarchive` intents while preserving existing `edit-saved` refresh behavior.

## 4. Tests

- [x] 4.1 Update `MembersTable.spec.ts` to remove member client, auth store, toast, and confirmation mocks from table-level mutation tests.
- [x] 4.2 Add or update `MembersTable.spec.ts` coverage proving desktop and mobile `Remove` actions emit `remove-member` with the selected member and do not require orchestration services.
- [x] 4.3 Add or update `MembersView.spec.ts` or a members-page composable spec for successful confirmed member removal, cancellation without a request, and failed removal error feedback.
- [x] 4.4 Update `ProjectsTable.spec.ts` to remove project client, auth store, toast, and confirmation mocks from table-level archive/unarchive tests.
- [x] 4.5 Add or update `ProjectsTable.spec.ts` coverage proving desktop and mobile table rendering does not own Archive or Unarchive orchestration services.
- [x] 4.6 Add or update `ProjectsView.spec.ts` or a projects-page composable spec for successful confirmed archive, archive cancellation without a request, failed archive feedback, successful unarchive, and failed unarchive feedback.
- [x] 4.7 Preserve existing table filter, expansion, desktop/mobile rendering, and page loading/error tests.

## 5. Verification

- [x] 5.1 Run `pnpm --filter admin-web test` and fix any regressions.
- [x] 5.2 Run `pnpm --filter admin-web lint` and fix new lint warnings or formatting issues.
- [x] 5.3 Run `pnpm --filter admin-web typecheck` and fix type errors.
- [x] 5.4 Perform a final admin Members and Projects design parity review against the approved `.pen` frames and document any PrimeVue-only deviations.
- [x] 5.5 Run `openspec status --change "refactor-admin-tables-dumb"` and confirm the change remains apply-ready.

## 6. Stricter Members Table Boundary

- [x] 6.1 Move Members table filters, filter options, filtered rows, empty-state copy, expansion state, and expansion mode out of `MembersTable.vue` into `MembersView.vue` or a focused members-table composable.
- [x] 6.2 Change `MembersTable.vue` to receive prepared rows/filter/expansion props and emit filter updates plus Assign PM, Edit, and Remove row intents without internal reactive state, computed derivation, watchers, or form rendering.
- [x] 6.3 Move `MemberAssignPmPanel` and `MemberEditForm` rendering to the Members page owner while preserving save/cancel collapse and member refresh behavior.
- [x] 6.4 Update table tests so `MembersTable.spec.ts` covers presentational rendering and emitted intents only.
- [x] 6.5 Update Members page or composable tests to cover moved filtering, expansion pruning, Assign PM/Edit expansion save/cancel behavior, and existing removal orchestration.
- [x] 6.6 Re-run `pnpm --filter admin-web test`, `pnpm --filter admin-web lint`, `pnpm --filter admin-web typecheck`, and `openspec status --change "refactor-admin-tables-dumb"`.

## 7. All Admin Table Boundary Audit

- [x] 7.1 Audit admin table components (`MembersTable.vue`, `ProjectsTable.vue`, and `reports/ReportsTable.vue`) for admin API clients, auth stores, toast helpers, confirmation helpers, and mutation orchestration.
- [x] 7.2 Move Projects table filters, filter options, filtered rows, empty-state copy, and expansion state out of `ProjectsTable.vue` into `ProjectsView.vue` or a focused projects-table composable.
- [x] 7.3 Change `ProjectsTable.vue` to receive prepared rows/filter/expansion props and emit filter updates plus Edit row intents without internal reactive state, computed derivation, watchers, form rendering, or archive/unarchive row actions.
- [x] 7.4 Move `ProjectEditForm` rendering to the Projects page owner while preserving save/cancel collapse, project refresh, and summary refresh behavior.
- [x] 7.5 Move member assignment save, member role save, and project settings save API/toast orchestration out of inline expansion forms into `MembersView.vue` and `ProjectsView.vue`.
- [x] 7.6 Update table, form, view, and composable tests for dumb table/form boundaries and moved orchestration.
- [x] 7.7 Re-run `pnpm --filter admin-web test`, `pnpm --filter admin-web lint`, `pnpm --filter admin-web typecheck`, focused boundary grep checks, and `openspec status --change "refactor-admin-tables-dumb"`.
