## Context

`apps/admin-web` is no longer a route-less placeholder. It already mounts a dedicated router, a protected shell route, child routes for the documented admin pages, and a guest-only `/login` route. The remaining gap is that the login route is still a placeholder surface and the auth store only marks bootstrap as complete without restoring or acquiring a real session.

That creates a direct mismatch with the current project docs:

- `docs/TECHNICAL-REQUIREMENTS.md` says both SPAs use the same Firebase-to-JWT login flow and refresh-token bootstrap model.
- `apps/admin-web/AGENTS.md` explicitly forbids introducing a separate auth model for admin-web.
- `apps/user-web` already demonstrates the intended frontend auth behavior through its auth store, runtime boundary, refresh-token persistence, and login view.

This change should therefore stop describing the already-finished route scaffold as the main work and instead define the missing admin auth entry behavior around that scaffold. The scope stays frontend-only: no backend auth semantics change, but the admin SPA must consume the same auth endpoints and behave consistently with the documented web-app direction.

## Goals / Non-Goals

**Goals:**

- Keep the existing admin route inventory, but make its auth behavior match the current docs and the working user-web model.
- Define the missing admin session bootstrap, login exchange, and logout cleanup behavior.
- Replace the placeholder admin login surface with a real Firebase-backed login entry that uses the current API contract.
- Keep protected admin navigation dependent on normalized auth state before redirects finalize.
- Preserve the documented shell and cross-SPA switching patterns while avoiding a second, divergent auth implementation.

**Non-Goals:**

- Reworking the already-landed admin route inventory unless needed to support the real auth flow.
- Building the full page content for dashboard, reports, invoices, members, projects, or settings.
- Changing backend auth semantics, contracts, or role rules.
- Designing a separate admin-only auth model that diverges from user-web.
- Extracting a large shared frontend-auth package unless the minimal app-local implementation proves insufficient.

## Decisions

### D1. Add a dedicated admin-auth capability instead of overloading routing-only language

- Model the missing login exchange, session restoration, and logout cleanup behavior in a new `admin-auth` capability.
- **Why:** the current flaw is not just routing. It is the missing session-state lifecycle that the router depends on.
- **Alternatives considered:** putting all auth expectations into `admin-routing` (rejected because auth state normalization and token lifecycle are a separate concern from path inventory).

### D2. Keep the current admin route tree and make its guard semantics mirror user-web

- Preserve the existing guest `/login` route plus protected shell/child-route structure, but require the guard to await bootstrap before deciding whether a protected route is allowed.
- **Why:** route inventory is already present, and the user-web implementation has already proven the guard-plus-bootstrap pattern needed to avoid redirect flicker and invalid anonymous fallbacks.
- **Alternatives considered:** leaving the current no-op bootstrap in place until later auth work (rejected because it preserves the user/admin docs mismatch and makes the login route intentionally non-functional).

### D3. Reuse the user-web auth shape, but prefer a minimal admin-web-local implementation

- Reuse the same auth endpoints, session-storage rules, runtime boundaries, and redirect semantics already established in `apps/user-web`, but keep the first implementation local to `apps/admin-web` unless a tiny shared leaf abstraction is clearly better.
- **Why:** this follows the repo's documented single auth model without prematurely introducing a large shared frontend-auth package.
- **Alternatives considered:** extracting a shared SPA auth package immediately (rejected as unnecessary abstraction for the current scope).

### D4. Replace the placeholder admin login surface with the documented authentication methods

- The admin login page should become a real sign-in surface with email/password and Google entry paths, user-web-style error handling, and a visible link back to `user-web`.
- **Why:** the current login page explicitly says real login is a future change, which contradicts the current docs and leaves the guest route intentionally incomplete.
- **Alternatives considered:** keeping the login route informational and focusing only on route guards (rejected because the docs already require a working shared auth direction across both SPAs).

### D5. Keep shell and login cross-links explicit in both directions

- Both the admin login page and authenticated shell should expose a clear link back to `user-web`, matching the counterpart link already documented from the user side.
- **Why:** the docs treat workspace switching as a product requirement, not a nice-to-have.
- **Alternatives considered:** leaving the cross-link only on the login surface (rejected because authenticated users also need an obvious way to switch products).

### D6. Define focused regression tests around auth normalization and redirects

- The implementation should include focused unit-level and router-level tests that mirror the critical user-web auth cases adapted to admin-web.
- Proposed minimum cases:
  - bootstrap restores a session from a valid refresh token and rotates stored credentials
  - bootstrap clears state when the refresh token is missing, invalid, or rejected
  - email/password login stores tokens and loads the current user profile
  - Google login stores tokens and loads the current user profile
  - failed login exchange clears stale local session state
  - logout clears local session state even if the backend logout request fails
  - anonymous access to a protected admin route redirects to `/login` with the original destination preserved
  - authenticated access to `/login` redirects to the default admin route or a valid preserved redirect target
  - invalid redirect targets are ignored in favor of the default authenticated route
- **Why:** the largest regression risk is not static route presence, but subtle auth-state and redirect behavior drift away from the working user-web model.
- **Alternatives considered:** relying only on lint/typecheck or future browser-level tests (rejected because the core risk here is deterministic store/router behavior that focused Vitest coverage can catch cheaply).

## Risks / Trade-offs

- **[Risk] Duplicating a portion of user-web auth code in admin-web can drift later.** -> Mitigation: keep the structure intentionally parallel, cover it with focused tests, and only extract shared code when duplication becomes active maintenance pain.
- **[Risk] Admin login may expose backend membership or role failures that were previously hidden by the placeholder page.** -> Mitigation: keep error handling generic and aligned with the current backend auth contract instead of inventing admin-specific responses.
- **[Trade-off] This change broadens a route-focused proposal into auth-aware entry behavior.** Accepted because the current route scaffold already exists and the meaningful remaining product flaw is the missing admin auth flow.
