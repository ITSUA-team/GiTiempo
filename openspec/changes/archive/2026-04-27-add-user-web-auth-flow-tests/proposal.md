## Why

The user-web app already implements login routing, session bootstrap, token refresh restoration, and protected-route redirects, but the expected auth journey is not yet captured in a main frontend auth spec and is only lightly verified. We need a dedicated change now so the critical user-web auth flow is both specified and covered by focused frontend tests before more authenticated pages build on top of it.

## What Changes

- Add a new OpenSpec capability for user-web frontend auth behavior, covering login outcomes, bootstrap restoration, guest/authenticated redirects, and logout cleanup.
- Define the expected verification surface for the user-web auth journey so frontend tests clearly map to the supported behavior.
- Add focused user-web test coverage for login success and failure handling, refresh-based session restoration, route guard redirects, and logout state cleanup.
- Document any remaining gaps between focused frontend tests and future browser-level end-to-end coverage.

## Capabilities

### New Capabilities

- `frontend-auth`: Defines user-web frontend authentication behavior for login, session restoration, route-guard redirects, and logout cleanup.

### Modified Capabilities

- None.

## Impact

- `apps/user-web/src/stores/*` auth store behavior and test coverage.
- `apps/user-web/src/router/*` redirect and guard verification.
- `apps/user-web/src/views/LoginView.vue` and related login-flow tests.
- `apps/user-web/src/**/*.test.ts` or equivalent focused Vitest coverage.
- `openspec/specs/frontend-auth/spec.md` as the new source of truth for this behavior.
