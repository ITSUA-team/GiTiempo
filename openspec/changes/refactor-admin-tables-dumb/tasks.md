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

- [x] 3.1 Update `ProjectsTable.vue` so desktop and mobile `Archive` actions emit `archive` with the selected project instead of opening confirmation or calling project APIs.
- [x] 3.2 Update `ProjectsTable.vue` so desktop and mobile `Unarchive` actions emit `unarchive` with the selected project instead of calling project APIs.
- [x] 3.3 Remove `ProjectsTable.vue` dependencies on admin API clients, auth store, confirmation helpers, and toast helpers.
- [x] 3.4 Keep Projects table filtering, desktop/mobile rendering, edit expansion, row collapse behavior, active/archived action visibility, labels, tooltips, and `data-testid` values unchanged.
- [x] 3.5 Move archive confirmation, access-token early return, `{ isActive: false }` update, success toast, error toast, and projects/summary refresh orchestration into `ProjectsView.vue` or a focused projects-page composable.
- [x] 3.6 Move unarchive access-token early return, `{ isActive: true }` update, success toast, error toast, and projects/summary refresh orchestration into `ProjectsView.vue` or the same focused projects-page composable.
- [x] 3.7 Wire `ProjectsView.vue` to handle the table's `archive` and `unarchive` intents while preserving existing `edit-saved` refresh behavior.

## 4. Tests

- [x] 4.1 Update `MembersTable.spec.ts` to remove member client, auth store, toast, and confirmation mocks from table-level mutation tests.
- [x] 4.2 Add or update `MembersTable.spec.ts` coverage proving desktop and mobile `Remove` actions emit `remove-member` with the selected member and do not require orchestration services.
- [x] 4.3 Add or update `MembersView.spec.ts` or a members-page composable spec for successful confirmed member removal, cancellation without a request, and failed removal error feedback.
- [x] 4.4 Update `ProjectsTable.spec.ts` to remove project client, auth store, toast, and confirmation mocks from table-level archive/unarchive tests.
- [x] 4.5 Add or update `ProjectsTable.spec.ts` coverage proving desktop and mobile `Archive` and `Unarchive` actions emit the selected project and do not require orchestration services.
- [x] 4.6 Add or update `ProjectsView.spec.ts` or a projects-page composable spec for successful confirmed archive, archive cancellation without a request, failed archive feedback, successful unarchive, and failed unarchive feedback.
- [x] 4.7 Preserve existing table filter, expansion, desktop/mobile rendering, and page loading/error tests.

## 5. Verification

- [x] 5.1 Run `pnpm --filter admin-web test` and fix any regressions.
- [x] 5.2 Run `pnpm --filter admin-web lint` and fix new lint warnings or formatting issues.
- [x] 5.3 Run `pnpm --filter admin-web typecheck` and fix type errors.
- [x] 5.4 Perform a final admin Members and Projects design parity review against the approved `.pen` frames and document any PrimeVue-only deviations.
- [x] 5.5 Run `openspec status --change "refactor-admin-tables-dumb"` and confirm the change remains apply-ready.
