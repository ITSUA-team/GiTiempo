## Why

Workspace Settings can currently expose GitHub organization setup before the current user has connected a GitHub account. That makes the setup path confusing because organization validation depends on the user's existing GitHub connection.

## What Changes

- Add a GitHub account status section to Admin Workspace Settings for the current user.
- Show whether the current user's GitHub account is connected, disconnected, loading, or failed to load.
- Hide the `Add organization` form/action in GitHub Workspace Access until the account status is connected.
- Show explanatory guidance when GitHub is disconnected or the connection status cannot be loaded.
- Keep saved organization policy rows and remove behavior available when organization policy data can be loaded.
- Keep the existing GitHub OAuth/auth model unchanged; this is a frontend gating/settings flow using existing GitHub connection status APIs.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `admin-settings-page`: Add current-user GitHub account status to Workspace Settings and gate organization setup UI by connection state.
- `workspace-github-organization-policy`: Require organization add/setup UI to be available only when the current user has an active GitHub account connection.
- `github-oauth-foundation`: Reuse existing connection status behavior from Admin Settings without changing the OAuth model or exposing token material.

## Impact

- `apps/admin-web` Settings page, Settings components, settings composables, settings client, query keys, and focused tests.
- Existing `GET /github/connection` contract and shared `GitHubConnectionStatusResponse` schema are reused.
- No backend schema migration, auth model rewrite, token handling change, or OpenAPI contract change is expected.
- Documentation updates are needed so `docs/ui/pages-admin.md` reflects connection-gated organization setup.
