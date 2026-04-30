## Why

`apps/user-web` and `apps/admin-web` now contain near-identical frontend leaf code for auth HTTP clients, refresh-token storage, cross-app workspace links, parallel auth/runtime wiring, and repeated login/shell UI regions. Leaving these copies in place raises future support cost because every auth-flow, app-link, validation, or shared UI change now needs to be applied twice and can drift silently between the two SPAs.

The current frontend UI also has several standard raw HTML controls where project rules call for PrimeVue. This refactor should make the shared frontend package component-aware so both SPAs can consume the same small PrimeVue-based UI components and browser-only Zod validation schemas where the behavior is shared.

Follow-up inspection also found one deprecated Zod error helper usage and a few remaining duplicated frontend micro-regions that should be captured in the same change before the shared frontend surface is considered stable.

## What Changes

- Refactor frontend-only shared leaf logic out of `apps/user-web` and `apps/admin-web` into `@gitiempo/web-shared` for both SPAs to consume.
- Evaluate current duplicated SPA code and extract only the pieces that are already behaviorally identical or intentionally parallel.
- Make `@gitiempo/web-shared` the home for shared Vue components used by both web SPAs, starting with small PrimeVue-based auth/profile/shell blocks rather than full pages.
- Replace standard raw app UI controls in the affected shared regions with PrimeVue components and token-based styling.
- Add shared Zod validation for frontend-only form payloads used by both SPAs, while keeping contract-facing schemas in `@gitiempo/shared`.
- Replace deprecated Zod error formatting helpers with non-deprecated Zod v4 APIs in shared frontend validation code.
- Evaluate and extract additional repeated user/admin micro-components such as placeholder-page scaffolds and login hero/supporting-card blocks when the structure is still stable after parameterization.
- Adopt `@primevue/forms` for shared PrimeVue-based auth forms so Zod resolver wiring, field state, and error rendering are standardized across both SPAs.
- Evaluate the duplicated authenticated header chrome in both SPAs and extract a shared prop-driven header component when app-local stores, route names, and environment-derived counterpart URLs can remain outside the shared package.
- Run a canonical Tailwind class review on new or touched shared header components and replace arbitrary utilities with documented equivalents when they exist.
- Register `@gitiempo/web-shared` source files with each SPA's Tailwind v4 CSS entry so utility classes used only inside shared Vue components are generated in consuming app stylesheets.
- Evaluate the duplicated authenticated shell navigation in both SPAs and extract a shared text-only navigation component for sidebar and mobile navigation using `user-web` as the presentational base.
- Remove the settings/profile action from the shared authenticated header so counterpart workspace link, display name, and avatar remain the only shared header identity controls.
- Add targeted Tailwind ESLint rules for the frontend apps and `@gitiempo/web-shared` so class ordering and obvious canonical utility issues are surfaced during normal lint runs.
- Use the new Tailwind ESLint warnings to clean up touched shared/frontend shell markup with autofix-first class reordering and a small manual pass for safe canonical replacements.
- Keep app-specific router, store, page, and role-specific UX behavior local unless two concrete call sites justify sharing.
- Avoid backend, API contract, database, OpenAPI, or auth-semantics changes as part of this change.

## Capabilities

### New Capabilities
- `frontend-shared-leaves`: defines which identical cross-SPA frontend utilities, shared Vue components, browser-only Zod form schemas, and validation helper patterns must be shared instead of maintained as duplicated app-local copies.

### Modified Capabilities
- `frontend-auth`: require both SPAs to consume the same shared frontend auth leaf utilities where the login, refresh, logout, and current-user client behavior is identical.
- `frontend-routing`: require both SPAs to consume the same shared cross-app workspace-link resolution behavior where navigation to the counterpart SPA follows the same rules.

## Impact

- Affected code: `apps/user-web/src/services/*`, `apps/admin-web/src/services/*`, `apps/user-web/src/lib/*`, `apps/admin-web/src/lib/*`, `apps/*/src/views/LoginView.vue`, `apps/*/src/components/layout/*Shell.vue`, `apps/*/src/assets/main.css`, `apps/*/src/components/app/PlaceholderPage.vue`, `apps/user-web/src/views/ProfileView.vue`, `eslint.config.mjs`, and `@gitiempo/web-shared`.
- No backend endpoint, database, or OpenAPI changes.
- Contract-facing shared Zod schemas may be extended only if the frontend payload is also an API contract; browser-only form schemas stay in `@gitiempo/web-shared`.
- Frontend verification will need focused lint, typecheck, shared package checks, and auth/router/component regression tests in both SPAs after the shared extraction.
