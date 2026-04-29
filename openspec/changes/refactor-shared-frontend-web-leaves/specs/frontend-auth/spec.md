## ADDED Requirements

### Requirement: Shared Frontend Auth Leaves Across Web SPAs
The `user-web` and `admin-web` frontends MUST consume the same shared frontend leaf modules for auth request/response handling and auth runtime wiring when the login exchange, refresh flow, logout request, current-user lookup, identity-provider sign-in, and identity-provider sign-out behavior are identical.

#### Scenario: Shared login and refresh client behavior
- **WHEN** either SPA performs backend token exchange, token refresh, logout, or current-user loading
- **THEN** it uses the same shared frontend auth leaf implementation for the identical HTTP and response-validation behavior
- **AND** both SPAs continue to follow the existing frontend auth contract and runtime semantics

#### Scenario: Shared auth runtime behavior
- **WHEN** either SPA signs in through email/password or Google, signs out of the identity provider, or composes the default auth runtime used by its auth store
- **THEN** it uses the same shared frontend auth runtime implementation for identical Firebase and auth-client behavior
- **AND** app-specific auth store orchestration, route handling, and Firebase configuration ownership remain local to each SPA

#### Scenario: Shared refresh-token storage behavior
- **WHEN** either SPA persists, reads, or clears the browser refresh token for the web auth flow
- **THEN** it uses the same shared frontend storage helper
- **AND** refresh-token lifecycle behavior stays consistent across both SPAs
