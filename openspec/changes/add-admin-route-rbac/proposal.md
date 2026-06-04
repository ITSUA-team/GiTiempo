## Why

`admin-web` currently protects product routes only by authentication state, so any authenticated workspace member can enter the admin shell and trigger admin-only or PM-only surfaces before the API rejects requests with 403. Adding route-level RBAC aligns the admin SPA with the backend role model and gives users a predictable deny flow instead of request-error driven navigation.

## What Changes

- Add route metadata for role eligibility on authenticated `admin-web` routes.
- Update the admin router guard to check the bootstrapped profile role after authentication succeeds.
- Redirect signed-in users without an allowed role to the existing standalone `/403` route.
- Filter admin shell navigation entries so users only see routes available to their role.
- Extract the identical protected-router factory and auth-guard flow into `@gitiempo/web-shared` while preserving app-local route maps and `user-web` routing behavior.
- Preserve existing guest-only login behavior, redirect preservation, standalone 403/404 routing, and API enforcement.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `admin-routing`: authenticated admin routing gains route-level role authorization and deny redirects.
- `admin-pages`: admin shell navigation becomes role-aware so unavailable admin pages are not offered to lower-privilege roles.
- `frontend-shared-leaves`: shared frontend routing leaves gain a protected-router factory used by both web SPAs.

## Impact

- Affects `apps/admin-web/src/router/*` route metadata, navigation guard behavior, and router tests.
- Affects `apps/admin-web/src/components/layout/AdminAppShell.vue` navigation filtering and shell tests.
- Affects `packages/web-shared` routing exports and shared protected-router tests.
- Affects `apps/user-web/src/router/*` only to consume the shared factory while preserving existing invite, login, protected-route, and authenticated 403/404 behavior.
- Uses existing shared workspace role contracts from `@gitiempo/shared`; no backend API, database, OpenAPI, or dependency changes are required.
- Requires `@gitiempo/web-shared`, `admin-web`, and `user-web` lint/typecheck plus focused tests because shared router/auth-shell behavior changes.
