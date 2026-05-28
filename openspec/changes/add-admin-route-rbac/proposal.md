## Why

`admin-web` currently protects product routes only by authentication state, so any authenticated workspace member can enter the admin shell and trigger admin-only or PM-only surfaces before the API rejects requests with 403. Adding route-level RBAC aligns the admin SPA with the backend role model and gives users a predictable deny flow instead of request-error driven navigation.

## What Changes

- Add route metadata for role eligibility on authenticated `admin-web` routes.
- Update the admin router guard to check the bootstrapped profile role after authentication succeeds.
- Redirect signed-in users without an allowed role to the existing standalone `/403` route.
- Filter admin shell navigation entries so users only see routes available to their role.
- Preserve existing guest-only login behavior, redirect preservation, standalone 403/404 routing, and API enforcement.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `admin-routing`: authenticated admin routing gains route-level role authorization and deny redirects.
- `admin-pages`: admin shell navigation becomes role-aware so unavailable admin pages are not offered to lower-privilege roles.

## Impact

- Affects `apps/admin-web/src/router/*` route metadata, navigation guard behavior, and router tests.
- Affects `apps/admin-web/src/components/layout/AdminAppShell.vue` navigation filtering and shell tests.
- Uses existing shared workspace role contracts from `@gitiempo/shared`; no backend API, database, OpenAPI, or dependency changes are required.
- Requires admin-web lint, typecheck, and focused tests because router/auth-shell behavior changes.
