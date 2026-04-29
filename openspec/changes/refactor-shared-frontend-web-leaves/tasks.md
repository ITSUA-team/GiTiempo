## 1. Shared Frontend Package Setup

- [ ] 1.1 Create `@gitiempo/web-shared` as the dedicated shared frontend package for browser-only SPA helpers and small Vue building blocks.
- [ ] 1.2 Define package exports for the initial shared leaf APIs without moving backend-safe contracts or theme/bootstrap code into the new package.

## 2. Shared Leaf Extraction

- [ ] 2.1 Extract the duplicated auth HTTP request helpers used by `apps/user-web` and `apps/admin-web` into the shared frontend package.
- [ ] 2.2 Extract the duplicated current-user client helper used by both SPAs into the shared frontend package.
- [ ] 2.3 Extract the duplicated auth runtime wiring used by both SPAs into the shared frontend package while keeping app-local Firebase configuration and auth store orchestration.
- [ ] 2.4 Extract the duplicated refresh-token storage helper used by both SPAs into the shared frontend package.
- [ ] 2.5 Extract the duplicated counterpart-workspace link resolver used by both SPAs into the shared frontend package.
- [ ] 2.6 Update both SPAs to consume the shared leaf modules and remove the superseded app-local copies.

## 3. Shared Component Review

- [ ] 3.1 Compare the current `user-web` and `admin-web` login views and authenticated shell regions to identify any structurally identical sub-regions with two stable call sites.
- [ ] 3.2 Extract only any justified shared micro-components for those reviewed regions, while keeping full-page login and shell composition app-local.
- [ ] 3.3 Leave product-specific copy, navigation shape, and app-only layout behavior local where the comparison shows meaningful divergence.

## 4. App Boundary Preservation

- [ ] 4.1 Keep `stores/auth.ts`, `router/index.ts`, route maps, and app-specific page orchestration local in both SPAs after the extraction.
- [ ] 4.2 Confirm the refactor does not change frontend auth semantics, redirect behavior, or cross-app navigation behavior.

## 5. Verification

- [ ] 5.1 Run `pnpm --filter user-web lint`, `pnpm --filter user-web typecheck`, and `pnpm --filter user-web test`.
- [ ] 5.2 Run `pnpm --filter admin-web lint`, `pnpm --filter admin-web typecheck`, and `pnpm --filter admin-web test`.
- [ ] 5.3 Run `pnpm --filter @gitiempo/web-shared lint`, `pnpm --filter @gitiempo/web-shared typecheck`, `pnpm --filter @gitiempo/web-shared test`, and `pnpm --filter @gitiempo/web-shared build`.
- [ ] 5.4 Verify both SPAs build against the new shared frontend package surface without leaving duplicated helper implementations behind.

## 6. Regression Test Hardening

- [ ] 6.1 Add an `admin-web` login view component test that exercises email/password and Google sign-in through the public UI, verifies redirect-to-requested-route or dashboard on success, and verifies visible error handling without navigation on failure.
- [ ] 6.2 Add service-level tests for the shared auth HTTP leaf modules and current-user client helper to verify request paths, auth headers, payload shapes, response parsing, and error propagation against mocked `fetch` boundaries.
- [ ] 6.3 Add service-level tests for the shared auth runtime helper to verify email/password sign-in, Google sign-in, identity-provider sign-out, and no-Firebase-config sign-out behavior.
- [ ] 6.4 Add service-level tests for the shared workspace-link resolver to verify configured app URLs, localhost port fallback, same-origin fallback, no-window fallback, and both user-to-admin and admin-to-user target configurations.
- [ ] 6.5 Add `admin-web` logout/auth-shell behavior tests that verify logout clears guest state after both successful and failed API logout, signs out the identity provider, and preserves visible counterpart-workspace links on login and authenticated shell surfaces.
