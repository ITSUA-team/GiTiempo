## ADDED Requirements

### Requirement: Admin Active Workspace Switch Session Handling

The `admin-web` frontend MUST switch active workspace context through the shared auth session layer by replacing the current token pair only after a successful switch response and by preserving the existing session when the switch fails.

#### Scenario: Admin workspace switch replaces local session tokens

- **GIVEN** an authenticated `admin-web` session has loaded another available workspace membership
- **WHEN** the user selects that workspace and the switch API returns a token pair
- **THEN** the frontend replaces the in-memory access token with the returned access token
- **AND** the frontend replaces the persisted refresh token with the returned refresh token
- **AND** stale workspace-scoped server state is cleared before reloading shell data

#### Scenario: Admin workspace switch failure preserves current session

- **GIVEN** an authenticated `admin-web` user attempts to switch workspaces
- **WHEN** the switch API rejects the request or the request fails
- **THEN** the frontend keeps the existing access token and refresh token
- **AND** the frontend keeps the current workspace context active
- **AND** the frontend surfaces retryable feedback without returning the user to guest state
