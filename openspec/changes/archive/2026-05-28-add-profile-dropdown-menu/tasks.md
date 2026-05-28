## 1. Shared Header Dropdown

- [x] 1.1 Review `docs/ui/INDEX.md`, `docs/ui/layout.md`, `docs/ui/patterns.md`, and the approved `GITiempo.pen` frames `User Dashboard - Profile Dropdown Open` and `Admin Dashboard - Profile Dropdown Open`; capture the parity checklist before editing.
- [x] 1.2 Extend `packages/web-shared/src/components/WorkspaceHeader.vue` with app-provided settings navigation, app-specific first-action label/icon, and a sign-out event while keeping route names and auth stores app-local.
- [x] 1.3 Implement the profile/avatar trigger and popup menu using PrimeVue menu semantics, token-backed styling, open-only active trigger styling, sticky-header-pinned positioning while scrolling, a visible spacing gap below the trigger, an avatar-aligned caret pointer, and the approved app-specific first action then `Sign out` action order.
- [x] 1.4 Add the counterpart workspace action at the top of the profile dropdown on all breakpoints using the existing counterpart href/label props, replacing the standalone top-bar workspace link.
- [x] 1.5 Update `WorkspaceHeader` tests to cover the trigger active state, menu contents, counterpart workspace action, keyboard/focus semantics, first-action label/icon/navigation target, sign-out event emission, and preserved center-slot rendering.

## 2. App Shell Integration

- [x] 2.1 Wire `apps/user-web/src/components/layout/AppShell.vue` so `Profile` uses the profile icon, navigates to the existing user profile/settings surface, `Sign out` calls the user auth store logout flow before redirecting to the user login route, and the duplicate Profile navigation item is removed.
- [x] 2.2 Wire `apps/admin-web/src/components/layout/AdminAppShell.vue` so `Settings` navigates to the existing admin settings surface and `Sign out` calls the admin auth store logout flow before redirecting to the admin login route.
- [x] 2.3 Remove the duplicate user Profile page sign-out action because sign-out is owned by the header dropdown.
- [x] 2.4 Update user shell and Profile page tests to verify the dropdown wiring, login redirect, top-bar timer preservation, duplicate Profile nav removal, and page-level sign-out removal.
- [x] 2.5 Update admin shell tests to verify the dropdown wiring, login redirect, workspace name behavior, shared navigation, and duplicate Settings nav removal.

## 3. Verification

- [x] 3.1 Run `pnpm --filter @gitiempo/web-shared lint && pnpm --filter @gitiempo/web-shared typecheck && pnpm --filter @gitiempo/web-shared test`.
- [x] 3.2 Run `pnpm --filter user-web lint && pnpm --filter user-web typecheck && pnpm --filter user-web test`.
- [x] 3.3 Run `pnpm --filter admin-web lint && pnpm --filter admin-web typecheck && pnpm --filter admin-web test`.
- [x] 3.4 Perform a final design parity review against both approved `.pen` open-state frames, including the dropdown workspace action, and record any PrimeVue-only deviations.

Design parity record: no PrimeVue-only deviations are expected. The user `.pen` open-state frame's standalone `Admin workspace` top-bar text link is treated as stale context and intentionally omitted in favor of the dropdown-only workspace action required by the specs.
