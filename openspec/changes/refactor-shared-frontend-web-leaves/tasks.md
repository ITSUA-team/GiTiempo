## 1. Shared Frontend Package Setup

- [x] 1.1 Create `@gitiempo/web-shared` as the dedicated shared frontend package for browser-only SPA helpers and small Vue building blocks.
- [x] 1.2 Define package exports for the initial shared leaf APIs without moving backend-safe contracts or theme/bootstrap code into the new package.

## 2. Shared Leaf Extraction

- [x] 2.1 Extract the duplicated auth HTTP request helpers used by `apps/user-web` and `apps/admin-web` into the shared frontend package.
- [x] 2.2 Extract the duplicated current-user client helper used by both SPAs into the shared frontend package.
- [x] 2.3 Extract the duplicated auth runtime wiring used by both SPAs into the shared frontend package while keeping app-local Firebase configuration and auth store orchestration.
- [x] 2.4 Extract the duplicated refresh-token storage helper used by both SPAs into the shared frontend package.
- [x] 2.5 Extract the duplicated counterpart-workspace link resolver used by both SPAs into the shared frontend package.
- [x] 2.6 Update both SPAs to consume the shared leaf modules and remove the superseded app-local copies.

## 3. Shared Component Review

- [x] 3.1 Compare the current `user-web` and `admin-web` login views and authenticated shell regions to identify any structurally identical sub-regions with two stable call sites.
- [x] 3.2 Extract only any justified shared micro-components for those reviewed regions, while keeping full-page login and shell composition app-local.
- [x] 3.3 Leave product-specific copy, navigation shape, and app-only layout behavior local where the comparison shows meaningful divergence.

## 4. App Boundary Preservation

- [x] 4.1 Keep `stores/auth.ts`, `router/index.ts`, route maps, and app-specific page orchestration local in both SPAs after the extraction.
- [x] 4.2 Confirm the refactor does not change frontend auth semantics, redirect behavior, or cross-app navigation behavior.

## 5. Verification

- [x] 5.1 Run `pnpm --filter user-web lint`, `pnpm --filter user-web typecheck`, and `pnpm --filter user-web test`.
- [x] 5.2 Run `pnpm --filter admin-web lint`, `pnpm --filter admin-web typecheck`, and `pnpm --filter admin-web test`.
- [x] 5.3 Run `pnpm --filter @gitiempo/web-shared lint`, `pnpm --filter @gitiempo/web-shared typecheck`, `pnpm --filter @gitiempo/web-shared test`, and `pnpm --filter @gitiempo/web-shared build`.
- [x] 5.4 Verify both SPAs build against the new shared frontend package surface without leaving duplicated helper implementations behind.

## 6. Regression Test Hardening

- [x] 6.1 Add an `admin-web` login view component test that exercises email/password and Google sign-in through the public UI, verifies redirect-to-requested-route or dashboard on success, and verifies visible error handling without navigation on failure.
- [x] 6.2 Add service-level tests for the shared auth HTTP leaf modules and current-user client helper to verify request paths, auth headers, payload shapes, response parsing, and error propagation against mocked `fetch` boundaries.
- [x] 6.3 Add service-level tests for the shared auth runtime helper to verify email/password sign-in, Google sign-in, identity-provider sign-out, and no-Firebase-config sign-out behavior.
- [x] 6.4 Add service-level tests for the shared workspace-link resolver to verify configured app URLs, localhost port fallback, same-origin fallback, no-window fallback, and both user-to-admin and admin-to-user target configurations.
- [x] 6.5 Add `admin-web` logout/auth-shell behavior tests that verify logout clears guest state after both successful and failed API logout, signs out the identity provider, and preserves visible counterpart-workspace links on login and authenticated shell surfaces.

## 7. Shared PrimeVue Component And Zod Validation Proposal

- [x] 7.1 Make `@gitiempo/web-shared` component-aware for shared `.vue` exports, including TypeScript/Vue typechecking and package export paths for components.
- [x] 7.2 Add a shared PrimeVue auth sign-in form component for the duplicated `user-web` and `admin-web` login form region, with typed props/emits and no app-local store/router imports.
- [x] 7.3 Add shared browser-only Zod validation for the email/password form payload used by both login views, or place the schema in `@gitiempo/shared` only if it becomes contract-facing.
- [x] 7.4 Update `apps/user-web/src/views/LoginView.vue` and `apps/admin-web/src/views/LoginView.vue` to consume the shared form component while keeping full-page copy, hero content, redirect handling, and counterpart links app-local.
- [x] 7.5 Replace standard raw controls in `apps/user-web/src/views/ProfileView.vue` with PrimeVue `InputText`, `Button`, `Tag`, and `Avatar`, extracting any repeated stable blocks to `@gitiempo/web-shared` if there are two call sites.
- [x] 7.6 Replace shell account/profile raw button regions in both app shells with a shared PrimeVue-based identity/avatar component if the compared regions remain structurally identical.
- [x] 7.7 Remove raw hex classes from affected Vue templates and use shared token utilities or PrimeVue severity styling.
- [x] 7.8 Add or update component tests for the shared auth sign-in form and consuming login views, covering validation errors, email/password submit, Google submit, disabled/loading state, and visible error rendering.
- [x] 7.9 Verify with `pnpm --filter @gitiempo/web-shared lint`, `pnpm --filter @gitiempo/web-shared typecheck`, `pnpm --filter user-web lint`, `pnpm --filter user-web typecheck`, `pnpm --filter user-web test`, `pnpm --filter admin-web lint`, `pnpm --filter admin-web typecheck`, and `pnpm --filter admin-web test`.

## 8. Follow-Up Shared Frontend Cleanup Proposal

- [x] 8.1 Replace deprecated `ZodError.flatten()` usage in the shared auth sign-in form with a non-deprecated Zod v4 error collection approach.
- [x] 8.2 Add `@primevue/forms` to the shared frontend package and update the shared auth sign-in form to use PrimeVue form orchestration with the Zod resolver.
- [x] 8.3 Compare `apps/user-web/src/components/app/PlaceholderPage.vue` and `apps/admin-web/src/components/app/PlaceholderPage.vue` and extract a shared prop-driven placeholder scaffold into `@gitiempo/web-shared` if no meaningful structural divergence exists.
- [x] 8.4 Compare the login hero/supporting-card regions in `apps/user-web/src/views/LoginView.vue` and `apps/admin-web/src/views/LoginView.vue` and extract any stable presentational micro-components that remain duplicated after parameterization.
- [x] 8.5 Verify affected package/app lint, typecheck, and tests after any follow-up extraction or deprecated-API cleanup.

## 9. Shared Authenticated Header Proposal

- [x] 9.1 Compare `apps/user-web/src/components/layout/AppShell.vue` and `apps/admin-web/src/components/layout/AdminAppShell.vue` header regions and confirm the header chrome can be parameterized without moving auth-store reads, route names, counterpart href resolution, sidebars, or router-view composition into shared code.
- [x] 9.2 Add a shared `WorkspaceHeader` component in `@gitiempo/web-shared` for the sticky top bar, product mark/name, workspace name, counterpart workspace link, display name, avatar, and optional settings/profile action.
- [x] 9.3 Update both app shells to consume the shared header while keeping app-local auth store access, environment-derived counterpart hrefs, route targets, navigation, and shell composition.
- [x] 9.4 Run `suggestCanonicalClasses` on new/touched shared header markup and replace arbitrary classes with canonical equivalents when available, including `rounded-[10px]` to `rounded-lg`.
- [x] 9.5 Add or update component/shell tests for shared header rendering, visible counterpart workspace links, avatar/display identity, and optional settings/profile action behavior.
- [x] 9.6 Verify `@gitiempo/web-shared`, `user-web`, and `admin-web` lint, typecheck, and tests after the header extraction.

## 10. Shared Tailwind Source Registration Proposal

- [x] 10.1 Confirm Tailwind v4 app CSS entries do not currently scan `packages/web-shared/src`, causing classes used only by shared components to be missing from generated app CSS.
- [x] 10.2 Add Tailwind `@source` registration for `../../../../packages/web-shared/src` to `apps/user-web/src/assets/main.css` and `apps/admin-web/src/assets/main.css`.
- [x] 10.3 Document the shared-source registration requirement in `docs/ui/setup.md` for future shared frontend component packages or moved shared UI.
- [x] 10.4 Verify both SPA builds generate shared component utility classes and run affected lint/typecheck checks.

## 11. Shared Authenticated Navigation Proposal

- [x] 11.1 Compare the remaining authenticated navigation regions in `apps/user-web/src/components/layout/AppShell.vue` and `apps/admin-web/src/components/layout/AdminAppShell.vue` and confirm the sidebar/mobile navigation can be parameterized without moving nav item definitions, route names, active-state logic, or shell composition into shared code.
- [x] 11.2 Remove the shared header settings/profile action from `WorkspaceHeader` and from both consuming app shells, updating related tests.
- [x] 11.3 Add a shared text-only `WorkspaceNavigation` component in `@gitiempo/web-shared` using the current `user-web` nav as the presentational base for both sidebar and mobile navigation.
- [x] 11.4 Update `AppShell.vue` and `AdminAppShell.vue` to consume the shared navigation component, dropping admin nav icons and keeping app-local nav item arrays, optional `to` overrides, active-state logic, and `RouterView` composition.
- [x] 11.5 Add or update component/shell tests for shared navigation rendering, active-state styling, mobile navigation behavior, and header simplification after removing the shared settings/profile action.
- [x] 11.6 Verify `@gitiempo/web-shared`, `user-web`, and `admin-web` lint, typecheck, and tests after the navigation extraction.
