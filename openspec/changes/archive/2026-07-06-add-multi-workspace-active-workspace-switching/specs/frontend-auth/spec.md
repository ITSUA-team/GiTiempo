## ADDED Requirements

### Requirement: Frontend Active Workspace Switch Session Handling

The web frontends MUST switch active workspace context through the shared auth session layer by replacing the current token pair and refreshing authenticated session data.

#### Scenario: Workspace switch replaces local session tokens

- **GIVEN** an authenticated web session has loaded another available workspace membership
- **WHEN** the user selects that workspace and the switch API returns a token pair
- **THEN** the frontend replaces the in-memory access token with the returned access token
- **AND** the frontend replaces the persisted refresh token with the returned refresh token
- **AND** stale workspace-scoped server state is cleared before reloading shell data

#### Scenario: Workspace switch reloads current user and workspace data

- **GIVEN** a workspace switch has succeeded
- **WHEN** the frontend resumes authenticated rendering
- **THEN** the frontend reloads the current user profile for the selected workspace role
- **AND** the frontend reloads the active workspace identity
- **AND** the visible shell workspace label reflects the selected workspace

#### Scenario: Workspace switch failure preserves current session

- **GIVEN** an authenticated user attempts to switch workspaces
- **WHEN** the switch API rejects the request or the request fails
- **THEN** the frontend keeps the existing access token and refresh token
- **AND** the frontend keeps the current workspace context active
- **AND** the frontend surfaces retryable feedback without signing the user out

#### Scenario: Admin app redirects after selecting non-admin workspace role

- **GIVEN** an authenticated admin-web user switches to a workspace where their role cannot access admin routes
- **WHEN** the switch succeeds
- **THEN** admin-web redirects the user to the accessible user-web dashboard for the selected workspace context

#### Scenario: User app remains in user app after switch

- **GIVEN** an authenticated user-web user switches to another accessible workspace
- **WHEN** the switch succeeds
- **THEN** user-web keeps the user in user-web
- **AND** user-web reloads the current authenticated route or falls back to the user dashboard when the route is no longer valid
