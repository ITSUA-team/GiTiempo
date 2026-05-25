## Why

The authenticated top-bar profile area currently exposes identity and sign-out affordances inconsistently across pages, making it unclear where users should access settings or end their session. A compact profile dropdown gives both user-web and admin-web a predictable header interaction that matches the approved `.pen` open-state designs.

## What Changes

- Add a profile/avatar dropdown to authenticated shell headers in both `user-web` and `admin-web`.
- Show app-owned menu actions in the dropdown: user-web uses `Profile` with the profile nav icon plus `Sign out`, and admin-web uses `Settings` plus `Sign out`.
- Include the counterpart workspace action at the top of the profile dropdown on all breakpoints, replacing the standalone top-bar workspace link.
- Route the first action to the app-appropriate settings/profile destination.
- Run `Sign out` through each app's existing logout cleanup flow and redirect to that app's login route.
- Remove duplicate Profile/Settings sidebar navigation entries and the duplicate user Profile page sign-out action because those actions now live in the dropdown.
- Preserve existing top-bar layout behavior, including the user-web compact timer center region and admin-web scope display.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `layout`: authenticated shell top-bar identity actions gain a profile dropdown menu for user-web and admin-web.
- `frontend-shared-leaves`: shared authenticated header chrome owns the common dropdown shell while app shells keep route, auth, and workspace-link orchestration local.

## Impact

- Affected frontend shell/header code in `apps/user-web`, `apps/admin-web`, and the shared `WorkspaceHeader` component in `packages/web-shared`.
- Shared header ownership remains limited to the common PrimeVue trigger/dropdown shell; app shells still own route names, first-action targets, auth-store logout, and login redirects.
- The existing counterpart workspace URL resolver remains the source of truth for the dropdown workspace action.
- Reuses existing auth logout/session cleanup behavior; no backend API or contract changes are expected.
- Must match the approved `GITiempo.pen` full-page dropdown-open designs for user and admin dashboard contexts.
