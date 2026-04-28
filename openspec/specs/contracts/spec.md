# Shared Contracts Specification

## Purpose

Define the shared cross-layer contract behavior that backend and frontend code consume through `packages/shared`.

## Requirements

### Requirement: Shared Public User Contract

The shared contracts MUST define a public user shape that both frontend applications and the backend can rely on.

#### Scenario: Current user response uses shared public schema

- GIVEN the backend returns current-user data
- WHEN frontend code consumes the response
- THEN the payload matches the shared public user contract
- AND the contract includes workspace role
- AND the contract excludes internal-only auth provider identifiers

### Requirement: Shared Current User Update Validation

The shared contracts SHALL define validation rules for current-user profile updates.

#### Scenario: Valid mutable profile update

- GIVEN a request updates display name or avatar URL
- WHEN the request payload satisfies the shared validation rules
- THEN the backend can accept the payload using the shared schema

#### Scenario: Empty mutable profile update

- GIVEN a request sends no mutable profile fields
- WHEN the shared schema validates the payload
- THEN the payload is rejected as invalid

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

### Requirement: Shared Frontend App Identity Contract

The shared contracts MUST provide stable identifiers for frontend application identity where cross-package behavior depends on them.

#### Scenario: Shared web app name usage

- GIVEN shared configuration needs to distinguish frontend applications
- WHEN the app identity is read from shared contracts
- THEN the value resolves to one of the supported web application names

### Requirement: Shared Workspace Contract

The shared contracts SHALL define stable workspace and workspace-settings shapes for backend and frontend consumers.

#### Scenario: Workspace response uses shared schema

- **GIVEN** the backend returns current workspace or workspace settings data
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload matches the shared workspace contract for that endpoint

### Requirement: Shared Workspace Member Contract

The shared contracts SHALL define stable shapes for listing workspace members and changing member roles.

#### Scenario: Workspace member admin flow uses shared schema

- **GIVEN** the backend accepts or returns workspace member administration data
- **WHEN** the payload is validated or consumed
- **THEN** it matches the shared workspace member contract

### Requirement: Shared Workspace Invite Contract

The shared contracts SHALL define stable shapes for invite creation, listing, cancellation, and acceptance.

#### Scenario: Invite flow uses shared schema

- **GIVEN** the backend accepts or returns workspace invite data
- **WHEN** the payload is validated or consumed
- **THEN** it matches the shared workspace invite contract
