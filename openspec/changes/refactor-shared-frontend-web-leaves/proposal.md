## Why

`apps/user-web` and `apps/admin-web` now contain near-identical frontend leaf code for auth HTTP clients, refresh-token storage, cross-app workspace links, and parallel auth/runtime wiring. Leaving these copies in place raises future support cost because every auth-flow or app-link change now needs to be applied twice and can drift silently between the two SPAs.

## What Changes

- Refactor frontend-only shared leaf logic out of `apps/user-web` and `apps/admin-web` into `@gitiempo/web-shared` for both SPAs to consume.
- Evaluate current duplicated SPA code and extract only the pieces that are already behaviorally identical or intentionally parallel.
- Keep app-specific router, store, page, and role-specific UX behavior local unless two concrete call sites justify sharing.
- Avoid backend, API contract, database, OpenAPI, or auth-semantics changes as part of this change.

## Capabilities

### New Capabilities
- `frontend-shared-leaves`: defines which identical cross-SPA frontend utilities and small UI building blocks must be shared instead of maintained as duplicated app-local copies.

### Modified Capabilities
- `frontend-auth`: require both SPAs to consume the same shared frontend auth leaf utilities where the login, refresh, logout, and current-user client behavior is identical.
- `frontend-routing`: require both SPAs to consume the same shared cross-app workspace-link resolution behavior where navigation to the counterpart SPA follows the same rules.

## Impact

- Affected code: `apps/user-web/src/services/*`, `apps/admin-web/src/services/*`, `apps/user-web/src/lib/*`, `apps/admin-web/src/lib/*`, and the new `@gitiempo/web-shared` frontend package.
- No backend endpoint, shared Zod contract, database, or OpenAPI changes.
- Frontend verification will need focused lint, typecheck, and auth/router regression tests in both SPAs after the shared extraction.
