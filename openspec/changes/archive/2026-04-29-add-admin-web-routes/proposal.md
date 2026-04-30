## Why

`apps/admin-web` now has a real route map and protected shell structure, but the current auth entry flow still does not match the documented frontend direction. The docs require both SPAs to use the same Firebase sign-in, backend token exchange, refresh-token bootstrap, and logout cleanup model. In practice, `admin-web` still ships a placeholder login surface and a no-op auth store, so the user-web and admin-web experiences diverge at the exact point where the docs say they should stay aligned.

Updating this change keeps `add-admin-web-routes` focused on the actual remaining flaw: making the admin route entry and session behavior consistent with the current docs and the working user-web pattern rather than preserving a route-only change that no longer describes the repo state.

## What Changes

- Expand `add-admin-web-routes` from route scaffolding into the full admin auth-aware entry flow expected by the current docs.
- Add an `admin-auth` capability covering Firebase login, backend token exchange at `POST /auth/login`, refresh-token bootstrap through `POST /auth/refresh`, profile bootstrap through `GET /users/me`, and logout cleanup through `POST /auth/logout`.
- Update the `admin-routing` capability so protected-route resolution waits for session bootstrap before redirecting, matching the user-web guard behavior.
- Update the admin login entry requirements so `admin-web` provides a real Firebase-backed login screen instead of a placeholder follow-up notice.
- Keep the documented cross-links between `user-web` and `admin-web` on both login and shell surfaces.
- Reuse the existing user-web auth behavior and contracts where practical instead of introducing a separate admin-only auth model.

## Capabilities

### New Capabilities

- `admin-auth`: Defines admin-web login exchange, refresh-based session restoration, logout cleanup, and auth-state normalization behavior.

### Modified Capabilities

- `admin-routing`: Extend the route behavior to depend on normalized auth state before protected navigation resolves.
- `admin-pages`: Add the admin login entry requirements and the expectation that admin pages are reached through the authenticated shell route tree.

## Impact

- `apps/admin-web/src/stores/*` for session state, bootstrap status, and login/logout flows.
- `apps/admin-web/src/services/*` and `src/lib/*` for Firebase auth runtime, token exchange, current-user loading, and refresh-token persistence.
- `apps/admin-web/src/router/*` and `src/views/LoginView.vue` for auth-aware entry and redirect behavior.
- `openspec/specs/admin-auth/spec.md`, `openspec/specs/admin-routing/spec.md`, and `openspec/specs/admin-pages/spec.md` as the source of truth after the change is applied.
- Verification against `docs/TECHNICAL-REQUIREMENTS.md`, `docs/ui/layout.md`, `docs/ui/pages-admin.md`, and `apps/admin-web/AGENTS.md` during implementation.
