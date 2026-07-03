## ADDED Requirements

### Requirement: Shared Workspace Switch Contracts

The shared contracts MUST define request and response schemas for switching the active workspace so backend validation and frontend clients agree on the payload.

#### Scenario: Switch request schema

- **GIVEN** a client constructs an active-workspace switch request
- **WHEN** the request payload is validated against the shared schema
- **THEN** the payload requires a valid `workspaceId`
- **AND** the payload requires the current non-empty `refreshToken`
- **AND** the payload rejects unknown additional fields

#### Scenario: Switch response uses token pair schema

- **GIVEN** the backend accepts an active-workspace switch request
- **WHEN** the response body is produced
- **THEN** the response matches the shared token pair response contract

### Requirement: Shared Current User Workspace Membership Contracts

The shared contracts SHALL define stable response shapes for listing the authenticated user's accessible workspace memberships.

#### Scenario: Membership list response schema

- **GIVEN** the backend returns the authenticated user's workspace memberships
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload contains an `items` array
- **AND** each item includes `workspaceId`, `workspaceName`, `role`, and `isCurrent`
- **AND** each `role` value matches the existing workspace role enum

#### Scenario: Exactly one current workspace in membership list

- **GIVEN** the backend returns at least one workspace membership for an authenticated user
- **WHEN** the membership list response is produced
- **THEN** exactly one returned item has `isCurrent` set to `true`
