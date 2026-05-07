## Why

GiTiempo needs a backend foundation for connecting user GitHub accounts through the approved GitHub App user-to-server OAuth flow. This separates OAuth state, encrypted token storage, and token refresh lifecycle from later GitHub data browsing and task sync features.

## What Changes

- Add GitHub connection endpoints for status, auth URL generation, OAuth callback handling, and disconnect.
- Store per-user GitHub connection metadata and encrypted GitHub access/refresh tokens.
- Support automatic GitHub user access token refresh through an internal service used by future GitHub API features.
- Add server-side OAuth state handling using an unguessable opaque state id, user binding, PKCE verifier storage, expiry, and replay protection.
- Keep GitHub organization, repository, project, issue listing, and task sync out of scope for this change.

## Capabilities

### New Capabilities

- `github-oauth-foundation`: GitHub App OAuth connection, callback, encrypted token storage, token refresh, connection status, and disconnect behavior.

### Modified Capabilities

- `data-model`: Add GitHub connection and OAuth state persistence requirements.
- `contracts`: Add shared request/response contracts for GitHub connection status and auth URL responses.

## Impact

- Affects `apps/api` modules, controllers, services, env validation, migrations, and OpenAPI output.
- Affects `packages/shared` contracts for GitHub connection DTOs.
- Requires cryptographic handling for encrypted GitHub token material at rest.
- Establishes a reusable internal token service for future GitHub data and sync endpoints without implementing those endpoints yet.
