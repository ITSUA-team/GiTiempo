## 1. Admin Auth Session Layer

- [x] 1.1 Add the admin-web auth runtime/client/session-storage modules needed to support Firebase sign-in, backend token exchange, current-user loading, refresh-token restoration, and logout cleanup.
- [x] 1.2 Implement the admin-web auth store with bootstrap status, authenticated session state, login methods for email/password and Google, current-user loading, and local-session cleanup on failure.

## 2. Auth-Aware Entry And Routing

- [x] 2.1 Replace the placeholder admin login view with a real Firebase-backed login entry that offers email/password and Google sign-in, generic auth-error handling, and the documented link back to `user-web`.
- [x] 2.2 Update the admin-web router guard so it waits for auth bootstrap before resolving protected-route redirects and guest-only login redirects.
- [x] 2.3 Preserve valid redirect targets through login and restore the default authenticated destination when no valid redirect is present.
- [x] 2.4 Keep or add the documented cross-link entry points between `user-web` and `admin-web` in both shell and login surfaces.

## 3. Verification

- [x] 3.1 Add or update focused tests for the admin auth store, bootstrap restoration behavior, and router auth redirects.
- [x] 3.2 Cover these minimum regression cases in `admin-web` tests: successful refresh bootstrap, failed refresh bootstrap, successful email/password login, successful Google login, failed login exchange clearing stale state, logout cleanup on backend failure, anonymous protected-route redirect, authenticated login-route redirect, and invalid redirect fallback behavior.
- [x] 3.3 Verify the implementation against `docs/TECHNICAL-REQUIREMENTS.md`, `docs/ui/layout.md`, `docs/ui/pages-admin.md`, `apps/admin-web/AGENTS.md`, and the user-web auth behavior it is intended to mirror.
- [x] 3.4 Run `pnpm --filter admin-web lint`, `pnpm --filter admin-web typecheck`, and `pnpm --filter admin-web test` and resolve any issues.
