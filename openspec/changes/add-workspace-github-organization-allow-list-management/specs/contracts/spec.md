## ADDED Requirements

### Requirement: Shared Workspace GitHub Organization Policy Contracts
The shared contracts SHALL define stable request and response shapes for workspace GitHub organization allow-list management.

#### Scenario: Allowed organization response uses shared schema
- **GIVEN** the backend returns a workspace allowed GitHub organization
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload matches the shared allowed organization contract
- **AND** the payload includes an identifier, workspace identifier, organization login, created timestamp, and creating user identifier when available
- **AND** the payload excludes GitHub token material

#### Scenario: Organization list response uses shared schema
- **GIVEN** the backend returns the workspace GitHub organization policy list
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload matches the shared organization list response contract
- **AND** the payload contains an array of allowed organization items

#### Scenario: Add organization request validates login
- **GIVEN** a client constructs an add allowed GitHub organization request
- **WHEN** the payload is validated against the shared schema
- **THEN** the payload requires a non-empty GitHub organization login
- **AND** the payload rejects unknown additional fields

#### Scenario: Invalid organization login is rejected by shared schema
- **GIVEN** a client constructs an add allowed GitHub organization request with an empty or whitespace-only login
- **WHEN** the payload is validated against the shared schema
- **THEN** the payload is rejected as invalid

