## MODIFIED Requirements

### Requirement: Shared Auth Request Contracts

The shared contracts MUST define request payload schemas for authentication and registration flows so that backend validation and frontend clients use the same shapes.

#### Scenario: Login request schema

- **GIVEN** a client constructs a login request
- **WHEN** the request payload is validated against the shared login schema
- **THEN** the payload requires a non-empty Firebase identity token field
- **AND** the payload rejects unknown additional fields

#### Scenario: Refresh request schema

- **GIVEN** a client constructs a refresh request
- **WHEN** the request payload is validated against the shared refresh schema
- **THEN** the payload requires a non-empty refresh token field
- **AND** the payload rejects unknown additional fields

#### Scenario: Logout request schema

- **GIVEN** a client constructs a logout request
- **WHEN** the shared schema validates the payload
- **THEN** the payload requires a non-empty refresh token field
- **AND** the payload rejects unknown additional fields

#### Scenario: Registration request schema

- **GIVEN** a client constructs a first-owner registration request
- **WHEN** the request payload is validated against the shared registration schema
- **THEN** the payload requires `email`, `fullName`, `workspaceName`, `password`, and `ownerAcknowledgement`
- **AND** `ownerAcknowledgement` must be `true`
- **AND** the payload rejects unknown additional fields

### Requirement: Shared Token Pair Response Contract

The shared contracts MUST define a single response shape for endpoints that issue API session credentials, so that backend responses and frontend consumers agree on the payload.

#### Scenario: Successful login response

- **GIVEN** the backend has issued a new API session after login
- **WHEN** the response is produced
- **THEN** the response matches the shared token pair response contract
- **AND** the contract exposes an access token, a refresh token, and the access-token expiry information

#### Scenario: Successful refresh response

- **GIVEN** the backend has rotated an API session via refresh
- **WHEN** the response is produced
- **THEN** the response matches the shared token pair response contract

#### Scenario: Successful registration response

- **GIVEN** the backend has issued a new API session after first-owner registration
- **WHEN** the response is produced
- **THEN** the response matches the shared token pair response contract
- **AND** frontend consumers can use the same token storage path as login

## ADDED Requirements

### Requirement: Shared Registration Error Contract
The shared contracts SHALL define stable registration error identifiers for frontend error mapping.

#### Scenario: Registration errors use shared identifiers
- **WHEN** registration fails for an expected user-correctable or retryable reason
- **THEN** the frontend can map the failure to one of `duplicate_email`, `weak_password`, `invalid_workspace_name`, `workspace_name_unavailable`, `rate_limited`, or `registration_service_unavailable`
- **AND** the API response does not require the frontend to parse provider-specific error messages

#### Scenario: Registration errors use the standard API envelope
- **WHEN** the backend returns a mapped registration failure
- **THEN** the response body includes the standard API error fields `statusCode`, `error`, and `message`
- **AND** the stable frontend-visible registration identifier is carried in `code`
- **AND** `error` remains the HTTP-category label rather than the registration-specific identifier
