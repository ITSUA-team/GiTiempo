## Why

Workspace admins currently see GitHub organization setup controls before the current user has a confirmed GitHub account connection. That makes setup ambiguous because organization validation depends on the requesting admin's connected GitHub account permissions.

## What Changes

- Add a GitHub Account settings card that shows the current user's GitHub connection status without exposing token material.
- Hide the `Add organization` setup form/action in GitHub Workspace Access until the account status is loaded as connected.
- Populate organization setup from GitHub organizations visible to the current user's connected account, excluding organizations already allowed for the workspace.
- Show explanatory guidance while GitHub is disconnected, loading, or failed to load.
- Keep saved organization policy rows, remove behavior, policy loading/error states, and recovery cards available when workspace policy data can be loaded.
- Keep the existing GitHub OAuth/auth model unchanged; backend add validation remains authoritative.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `admin-settings-page`: add current-user GitHub account status to Workspace Settings and gate organization setup UI by connection state.
- `admin-pages`: align Settings GitHub Workspace Access scenarios with the gated selector flow so archived specs do not require an always-available add form.
- `github-data-browsing-api`: add a setup-only current-user GitHub organizations listing that is not filtered by the workspace allow-list and does not expose token material.
- `workspace-github-organization-policy`: require organization add/setup to use a connected requesting admin account while preserving existing policy reads/removals.
- `github-oauth-foundation`: reuse existing connection status behavior from Admin Settings without changing OAuth or exposing token material.

## Impact

- `apps/admin-web`: Settings page, Settings GitHub components, settings composables, settings client, query keys, and focused tests.
- `apps/api`: GitHub controller/service exposes setup-only `GET /github/organizations` when needed and keeps add enforcement server-side.
- `packages/shared`: existing `GitHubConnectionStatusResponse` and `GitHubOwnerListResponse` schemas/types are reused.
- Documentation/OpenSpec/OpenAPI: Settings requirements, endpoint docs, and OpenAPI route documentation for `GET /github/organizations`.
- No backend schema migration, auth model rewrite, or token handling change is expected.
