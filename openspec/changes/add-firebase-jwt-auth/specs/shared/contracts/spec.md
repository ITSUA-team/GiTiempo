## ADDED Requirements

### Requirement: Shared Auth Request Contracts

The shared contracts MUST define request payload schemas for the authentication flow so that backend validation and frontend clients use the same shapes.

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
- **WHEN** the request payload is validated against the shared logout schema
- **THEN** the payload requires a non-empty refresh token field
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
