# Backend Current User Specification

## Purpose

Define backend behavior for reading and updating the authenticated current user profile.

## Requirements

### Requirement: Current User Read Endpoint

The backend MUST provide a current-user endpoint that returns the authenticated user's public profile and workspace role. The authenticated user MUST be resolved from the verified access token rather than from any development-time placeholder.

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

### Requirement: Users Table Stores Last Activity Timestamp

The users data model SHALL include a nullable last-activity timestamp column that records when the user last performed a tracked write operation.

#### Scenario: Column exists with null default

- **GIVEN** the users table schema
- **WHEN** a new user record is created
- **THEN** the last-activity timestamp is null by default

#### Scenario: Column accepts timestamp updates

- **GIVEN** an existing user record
- **WHEN** the system updates the user's last-activity timestamp
- **THEN** the new timestamp value is persisted

### Requirement: Stable Frontend Current User Contract

The backend MUST shape current-user responses according to the shared public user contract.

#### Scenario: Public contract excludes internal auth identifiers and includes role

- **GIVEN** the backend serializes the authenticated current user
- **WHEN** the response body is produced
- **THEN** fields like internal Firebase UID are excluded
- **AND** the user's workspace role is included
- **AND** only the public user contract fields are returned

### Requirement: Current User Workspace Membership List

The backend SHALL provide an authenticated current-user endpoint that lists every workspace membership available to the authenticated user for active-workspace switching.

#### Scenario: Authenticated user lists workspace memberships

- **GIVEN** an authenticated user has one or more workspace memberships
- **WHEN** the user requests their workspace membership list
- **THEN** the backend returns every active workspace membership for that user
- **AND** each item includes the workspace ID, workspace name, role, and current-workspace marker

#### Scenario: Membership list marks current workspace

- **GIVEN** an authenticated request carries a valid workspace ID claim
- **WHEN** the user requests their workspace membership list
- **THEN** the membership matching the access-token workspace ID is marked as current
- **AND** all other memberships are marked as not current

#### Scenario: Unauthenticated user cannot list memberships

- **GIVEN** no valid authenticated user context is available
- **WHEN** the current-user workspace membership list is requested
- **THEN** the backend rejects the request as unauthorized
