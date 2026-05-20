## 1. Source Review And Shared Pattern Inventory

- [x] 1.1 Read `AGENTS.md`, `apps/user-web/AGENTS.md`, `apps/admin-web/AGENTS.md`, `packages/web-shared/AGENTS.md`, `docs/ui/INDEX.md`, `docs/ui/layout.md`, `docs/ui/components.md`, and `docs/ui/pages-user.md` before implementation.
- [x] 1.2 Inspect `GITiempo.pen` frames `User Dashboard` (`obxTM`), `Time Entries` (`R2FI0`), and `Projects List` (`yAu6B`) and record a parity checklist for desktop table/card content, actions, spacing, hierarchy, and mobile adaptation constraints.
- [x] 1.3 Re-inspect the admin mobile table/card pattern in `ProjectsTable.vue`, `MembersTable.vue`, `ReportsTable.vue`, `useIsMobileViewport.ts`, and `MobileRecordCard.vue` before extracting or copying any behavior.

## 2. Shared Mobile Leaves

- [x] 2.1 Move or recreate the mobile viewport helper in `packages/web-shared` with the existing `<640px` breakpoint and no-window fallback behavior.
- [x] 2.2 Move or recreate the neutral mobile record card wrapper in `packages/web-shared` with token-based surface styling and an optional actions slot.
- [x] 2.3 Export the new shared leaves through the appropriate `packages/web-shared` component/runtime entry points without exposing unrelated low-level helpers from the root barrel unless already consistent with package conventions.
- [x] 2.4 Update admin-web imports to use the shared leaves while preserving existing mobile card behavior and desktop table behavior.

## 3. User-Web Mobile Card Rendering

- [x] 3.1 Update `DashboardRecentEntriesCard.vue` so mobile viewports render one card per recent entry with task title, project name, time range, duration, highlighted state, and the existing `View all` action.
- [x] 3.2 Keep `DashboardRecentEntriesCard.vue` rendering the existing DataTable at and above the mobile breakpoint without changing desktop column content or widths.
- [x] 3.3 Update `ProjectsTaskSection.vue` so mobile viewports render one card per task with task title, status tag, updated metadata, and icon-only edit/delete actions with accessible labels.
- [x] 3.4 Keep `ProjectsTaskSection.vue` rendering the existing `ManagementTableShell` at and above the mobile breakpoint without changing desktop columns, empty state, or actions.
- [x] 3.5 Update `TimeEntriesDaySection.vue` so mobile viewports render one card per entry with task title, optional description, project name, time range, duration, and running-entry highlight.
- [x] 3.6 Preserve completed-entry edit/delete actions and running-entry no-edit/no-delete behavior in the mobile `TimeEntriesDaySection.vue` card branch.
- [x] 3.7 Keep `TimeEntriesDaySection.vue` rendering the existing `ManagementTableShell` at and above the mobile breakpoint without changing desktop columns or running-entry table behavior.

## 4. Responsive Tests

- [x] 4.1 Add or update `DashboardRecentEntriesCard.spec.ts` with viewport mocks proving mobile cards render below `640px`, desktop table rendering remains at non-mobile widths, highlighted entries remain identifiable, and `View all` still emits.
- [x] 4.2 Add or update `ProjectsTaskSection.spec.ts` with viewport mocks proving mobile cards render task fields/actions, desktop table rendering remains, edit/delete actions stay icon-only and accessible, and empty state remains distinct.
- [x] 4.3 Add or update `TimeEntriesDaySection.spec.ts` with viewport mocks proving mobile cards render entry fields, completed-entry edit/delete emits still work, running entries show the top-bar stop guidance, and running entries do not expose edit/delete actions.
- [x] 4.4 Update admin responsive table/card tests only as needed for shared import-path changes, preserving existing viewport coverage.

## 5. Design Parity And Verification

- [x] 5.1 Perform a desktop parity review against `GITiempo.pen` frames `obxTM`, `R2FI0`, and `yAu6B` and confirm desktop table behavior did not regress.
- [x] 5.2 Perform a mobile adaptation review against `docs/ui/layout.md`, `docs/ui/components.md`, the user-page specs, and the admin mobile pattern; document any PrimeVue-only compromise.
- [x] 5.3 Update `docs/ui/pages-user.md` so Dashboard recent entries, Projects task sections, and Time Entries day groups explicitly document the desktop-table/mobile-card split below `640px`.
- [x] 5.4 Run `pnpm --filter user-web lint` and fix all new warnings/errors.
- [x] 5.5 Run `pnpm --filter user-web typecheck` and fix all type errors.
- [x] 5.6 Run `pnpm --filter user-web test` and fix regressions in component/view tests.
- [x] 5.7 If `packages/web-shared` changes, run `pnpm --filter admin-web lint`, `pnpm --filter admin-web typecheck`, and `pnpm --filter admin-web test`, then fix regressions.
- [x] 5.8 Attach the recorded `.pen` parity checklist, any PrimeVue-only compromises, and the exact verification commands/results to `verification.md` before archiving this change.
