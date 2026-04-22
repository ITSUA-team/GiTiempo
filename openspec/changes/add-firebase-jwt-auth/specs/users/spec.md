## MODIFIED Requirements

### Requirement: Current User Read Endpoint

The backend MUST provide a current-user endpoint that returns the authenticated user's public profile. The authenticated user MUST be resolved from the verified access token rather than from any development-time placeholder.

#### Scenario: Authenticated user requests own profile

- **GIVEN** an authenticated API request is made to the current-user endpoint
- **WHEN** the backend resolves the authenticated user
- **THEN** the backend uses the subject claim of the verified access token to look up the local user
- **AND** the response returns the user's public profile fields
- **AND** internal-only identity fields are not exposed in the response body

#### Scenario: Unauthenticated request to current-user endpoint

- **GIVEN** no valid access token is presented
- **WHEN** the current-user endpoint is requested
- **THEN** the backend rejects the request as unauthorized
- **AND** no placeholder or fallback user is returned

#### Scenario: Access token references missing user

- **GIVEN** a valid access token whose subject no longer matches any local user record
- **WHEN** the current-user endpoint is requested
- **THEN** the backend rejects the request as unauthorized

### Requirement: Current User Update Validation

The backend SHALL allow updates only to mutable current-user profile fields defined by the shared contracts. Updates MUST be scoped to the authenticated user resolved from the access token and MUST NOT allow a client to target another user's record.

#### Scenario: Update display name or avatar

- **GIVEN** an authenticated user sends a valid current-user update payload
- **WHEN** the backend processes the request
- **THEN** the backend updates only the mutable profile fields of the authenticated user
- **AND** the updated public profile is returned

#### Scenario: Empty current-user update payload

- **GIVEN** an authenticated user sends an empty current-user update payload
- **WHEN** the backend validates the request
- **THEN** the request is rejected as invalid

#### Scenario: Unauthenticated current-user update

- **GIVEN** no valid access token is presented
- **WHEN** a current-user update request is received
- **THEN** the backend rejects the request as unauthorized
