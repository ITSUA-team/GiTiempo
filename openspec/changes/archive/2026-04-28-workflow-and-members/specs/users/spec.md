## MODIFIED Requirements

### Requirement: Current User Read Endpoint
The backend MUST provide a current-user endpoint that returns the authenticated user's public profile and workspace role.

#### Scenario: Authenticated user requests own profile
- **GIVEN** an authenticated API request is made to the current-user endpoint
- **WHEN** the backend resolves the authenticated user
- **THEN** the response returns the user's public profile fields
- **AND** the response includes the user's current workspace role
- **AND** internal-only identity fields are not exposed in the response body

#### Scenario: Unauthenticated request to current-user endpoint
- **GIVEN** no valid authenticated user context is available
- **WHEN** the current-user endpoint is requested
- **THEN** the backend rejects the request as unauthorized

### Requirement: Stable Frontend Current User Contract
The backend MUST shape current-user responses according to the shared public user contract.

#### Scenario: Public contract excludes internal auth identifiers and includes role
- **GIVEN** the backend serializes the authenticated current user
- **WHEN** the response body is produced
- **THEN** fields like internal Firebase UID are excluded
- **AND** the user's workspace role is included
- **AND** only the public user contract fields are returned
