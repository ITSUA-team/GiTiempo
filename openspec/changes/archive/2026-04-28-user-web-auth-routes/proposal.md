## Why

The user-web app already mounts Vue Router and Pinia, but it has no route inventory and no auth-aware startup flow. Defining login entry, protected-route redirects, and session bootstrap now prevents later user-web pages from being built around placeholder navigation and inconsistent auth assumptions.

## What Changes

- Define the user-web route map for login and authenticated app entry.
- Define navigation-guard behavior for anonymous access to protected routes and authenticated access to the login route.
- Define where session bootstrap happens during app startup and how it interacts with initial navigation.
- Align the login entry flow with the approved Login screen in `GITiempo.pen` and the documented user-web UI requirements.
- Clarify how the authenticated app shell owns protected routes so later page work can mount into a stable layout structure.

## Capabilities

### New Capabilities

- `frontend-auth`: Frontend authentication session behavior for login, refresh-based restoration, logout, and bootstrap state management in `apps/user-web`.
- `frontend-routing`: User-web route inventory, auth-aware navigation guards, and authenticated app-shell routing structure.

### Modified Capabilities

- `user-pages`: Extend the user-facing page specification to include the login page and route-level entry expectations for authenticated pages.

## Impact

- `apps/user-web/src/main.ts` bootstrap flow and router registration.
- `apps/user-web/src/router/*` for route definitions and guards.
- `apps/user-web/src/stores/*` for auth session state and bootstrap behavior.
- `apps/user-web/src/views/*` and app-shell layout components for login and protected-route entry.
- Existing auth contracts and backend auth endpoints remain the source of truth for token exchange and refresh semantics.
