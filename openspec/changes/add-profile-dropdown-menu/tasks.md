## 1. Shared Header Dropdown

- [x] 1.1 Review `docs/ui/INDEX.md`, `docs/ui/layout.md`, `docs/ui/patterns.md`, and the approved `GITiempo.pen` frames `User Dashboard - Profile Dropdown Open` and `Admin Dashboard - Profile Dropdown Open`; capture the parity checklist before editing.
- [x] 1.2 Extend `packages/web-shared/src/components/WorkspaceHeader.vue` with app-provided settings navigation and a sign-out event while keeping route names and auth stores app-local.
- [x] 1.3 Implement the profile/avatar trigger and popup menu using PrimeVue menu semantics, token-backed styling, and the approved `Settings` then `Sign out` action order.
- [x] 1.4 Update `WorkspaceHeader` tests to cover the trigger, menu contents, settings navigation target, sign-out event emission, and preserved center-slot rendering.

## 2. App Shell Integration

- [x] 2.1 Wire `apps/user-web/src/components/layout/AppShell.vue` so `Settings` navigates to the existing user profile/settings surface and `Sign out` calls the user auth store logout flow.
- [x] 2.2 Wire `apps/admin-web/src/components/layout/AdminAppShell.vue` so `Settings` navigates to the existing admin settings surface and `Sign out` calls the admin auth store logout flow.
- [x] 2.3 Update user shell tests to verify the dropdown wiring while preserving the top-bar timer, counterpart admin workspace link, and shared navigation.
- [x] 2.4 Update admin shell tests to verify the dropdown wiring while preserving the counterpart user workspace link, workspace name behavior, and shared navigation.

## 3. Verification

- [x] 3.1 Run `pnpm --filter @gitiempo/web-shared lint && pnpm --filter @gitiempo/web-shared typecheck && pnpm --filter @gitiempo/web-shared test`.
- [x] 3.2 Run `pnpm --filter user-web lint && pnpm --filter user-web typecheck && pnpm --filter user-web test`.
- [x] 3.3 Run `pnpm --filter admin-web lint && pnpm --filter admin-web typecheck && pnpm --filter admin-web test`.
- [x] 3.4 Perform a final design parity review against both approved `.pen` open-state frames and record any PrimeVue-only deviations.
