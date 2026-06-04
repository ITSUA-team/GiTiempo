## 1. User-Web Router Lazy Loading

- [x] 1.1 Replace static imports for `DashboardView`, `TimeEntriesView`, `ProjectView`, `ProfileView`, `InviteAcceptView`, `InvitePasswordSetupView`, `ForbiddenView`, and `NotFoundView` in `apps/user-web/src/router/index.ts` with Vue Router lazy route component loader constants.
- [x] 1.2 Keep `LoginView` and `AppShell` as eager imports, and preserve all existing user-web route paths, names, meta fields, child route grouping, and auth guard behavior.
- [x] 1.3 Update user-web router tests to assert non-entry route records use lazy component functions and resolve to the expected view modules where component wiring is checked.
- [x] 1.4 Update affected user-web login/invite/navigation tests to wait for lazy-route navigation completion without relying on arbitrary repeated `flushPromises()` calls.

## 2. Admin-Web Router Lazy Loading

- [x] 2.1 Replace static imports for `DashboardView`, `ReportsView`, `InvoicesView`, `MembersView`, `ProjectsView`, `AddProjectView`, `SettingsView`, `ForbiddenView`, and `NotFoundView` in `apps/admin-web/src/router/index.ts` with Vue Router lazy route component loader constants.
- [x] 2.2 Keep `LoginView` and `AdminAppShell` as eager imports, and preserve all existing admin-web route paths, names, meta fields, child route grouping, and auth guard behavior.
- [x] 2.3 Update admin-web router tests to assert non-entry route records use lazy component functions and resolve to the expected view modules where component wiring is checked.
- [x] 2.4 Update affected admin-web login/navigation tests to wait for lazy-route navigation completion without relying on arbitrary repeated `flushPromises()` calls.

## 3. Verification

- [x] 3.1 Audit both router files to confirm no non-login route view remains statically imported and no route path/name/meta changed unintentionally.
- [x] 3.2 Run `pnpm --filter user-web lint`.
- [x] 3.3 Run `pnpm --filter user-web typecheck`.
- [x] 3.4 Run `pnpm --filter user-web test`.
- [x] 3.5 Run `pnpm --filter admin-web lint`.
- [x] 3.6 Run `pnpm --filter admin-web typecheck`.
- [x] 3.7 Run `pnpm --filter admin-web test`.
- [x] 3.8 Run `pnpm --filter user-web build` and `pnpm --filter admin-web build`, then inspect Vite build output for separate route view chunk assets to verify dynamic imports emitted route-level chunks.
- [x] 3.9 Document invite route loading rationale and the accepted default chunk-load failure behavior for this change.
