## ADDED Requirements

### Requirement: Active Workspace Switch Issues Token Pair

The backend SHALL allow an authenticated user to switch the active workspace to another existing membership by issuing a fresh API token pair for the selected workspace context.

#### Scenario: Switch succeeds for another active membership

- **GIVEN** an authenticated user has an active membership in the current workspace
- **AND** the same user has an active membership in another workspace
- **WHEN** the user requests an active-workspace switch to the other workspace
- **THEN** the backend validates the target membership
- **AND** the backend returns a fresh access token and refresh token pair
- **AND** the new access token carries the selected workspace ID and the user's role in that selected workspace

#### Scenario: Switch rejects workspace without membership

- **GIVEN** an authenticated user does not have an active membership in a target workspace
- **WHEN** the user requests an active-workspace switch to that workspace
- **THEN** the backend rejects the request as forbidden
- **AND** no new token pair is issued

#### Scenario: Switch to current workspace is idempotent

- **GIVEN** an authenticated user requests an active-workspace switch to the workspace already carried by the current access token
- **WHEN** the backend validates that membership
- **THEN** the backend returns a fresh access token and refresh token pair for the same workspace context

### Requirement: Refresh Preserves Selected Workspace Context

The backend MUST refresh credentials for the workspace context associated with the refresh session and MUST NOT silently move the session to another workspace.

#### Scenario: Refresh after workspace switch

- **GIVEN** a user has switched the active workspace and received a new refresh token
- **WHEN** the client refreshes that switched session
- **THEN** the backend returns a new token pair for the selected workspace context
- **AND** the new access token keeps the selected workspace ID and selected-workspace role claims

#### Scenario: Refresh rejects removed selected membership

- **GIVEN** a refresh token belongs to a selected workspace membership that has been removed
- **WHEN** the client attempts to refresh that session
- **THEN** the backend rejects the request as unauthorized
- **AND** the backend does not automatically select another workspace membership for the user
