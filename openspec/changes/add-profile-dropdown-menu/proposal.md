## Why

The authenticated top-bar profile area currently exposes identity and sign-out affordances inconsistently across pages, making it unclear where users should access settings or end their session. A compact profile dropdown gives both user-web and admin-web a predictable header interaction that matches the approved `.pen` open-state designs.

## What Changes

- Add a profile/avatar dropdown to authenticated shell headers in both `user-web` and `admin-web`.
- Show two menu actions in the dropdown: `Settings` and `Sign out`.
- Route `Settings` to the app-appropriate settings/profile destination.
- Run `Sign out` through each app's existing logout cleanup flow.
- Preserve existing top-bar layout behavior, including the user-web compact timer center region and admin-web scope display.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `layout`: authenticated shell top-bar identity actions gain a profile dropdown menu for user-web and admin-web.

## Impact

- Affected frontend shell/header code in `apps/user-web` and `apps/admin-web`.
- May use or extract a shared PrimeVue-based dropdown/menu leaf in `packages/web-shared` if both apps can share the same stable component contract.
- Reuses existing auth logout/session cleanup behavior; no backend API or contract changes are expected.
- Must match the approved `GITiempo.pen` full-page dropdown-open designs for user and admin dashboard contexts.
