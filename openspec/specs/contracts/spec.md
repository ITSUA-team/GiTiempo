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

### Requirement: Shared Project Contract

The shared contracts SHALL define stable project request and response shapes for backend validation and future frontend clients.

#### Scenario: Project response uses shared schema

- **GIVEN** the backend returns project data
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload matches the shared project response contract
- **AND** the payload includes core provider-neutral project fields
- **AND** the payload includes `visibility`, derived `source`, and `totalHours`
- **AND** the payload excludes provider-specific external reference fields

#### Scenario: Project create request uses shared schema

- **GIVEN** a client constructs a project create request
- **WHEN** the request payload is validated against the shared project create schema
- **THEN** the payload accepts valid creation fields including optional project visibility
- **AND** the payload rejects unknown additional fields

#### Scenario: Project update request uses shared schema

- **GIVEN** a client constructs a project update request
- **WHEN** the request payload is validated against the shared project update schema
- **THEN** the payload requires at least one mutable project field
- **AND** the payload accepts `isActive` as the only supplied field for archive or unarchive requests
- **AND** the payload rejects unknown additional fields

### Requirement: Shared Project Summary Contract

The shared contracts SHALL define stable response shapes for project summary endpoints.

#### Scenario: Management project summary response uses shared schema

- **GIVEN** the backend returns management project summary data
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload matches the shared management project summary contract
- **AND** includes `activeProjects`, `privateProjects`, and `publicProjects`

#### Scenario: User project summary response uses shared schema

- **GIVEN** the backend returns user project summary data
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload matches the shared user project summary contract
- **AND** includes `visibleProjects`, `trackedHoursWeek`, and `trackedHoursMonth`

### Requirement: Shared Project Assignment Contract

The shared contracts SHALL define stable project assignment request and response shapes for backend validation and future frontend clients.

#### Scenario: Project assignment response uses shared schema

- **GIVEN** the backend returns project assignment data
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload matches the shared project assignment response contract
- **AND** the payload identifies the project, assigned user, assigned role, and assignment metadata

#### Scenario: Project assignment create request uses shared schema

- **GIVEN** a client constructs a project assignment request
- **WHEN** the request payload is validated against the shared assignment create schema
- **THEN** the payload requires a target user identifier
- **AND** the payload rejects unknown additional fields

### Requirement: Shared Task Contract

The shared contracts SHALL define stable task request and response shapes for backend validation and future frontend clients.

#### Scenario: Task response uses shared schema

- **GIVEN** the backend returns task data
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload matches the shared task response contract
- **AND** the payload includes core provider-neutral task fields
- **AND** the payload excludes provider-specific external reference fields

#### Scenario: Task create request uses shared schema

- **GIVEN** a client constructs a task create request
- **WHEN** the request payload is validated against the shared task create schema
- **THEN** the payload requires a valid task title
- **AND** the payload rejects unknown additional fields

#### Scenario: Task update request uses shared schema

- **GIVEN** a client constructs a task update request
- **WHEN** the request payload is validated against the shared task update schema
- **THEN** the payload requires at least one mutable task field
- **AND** the payload rejects unknown additional fields

### Requirement: Shared Time Entry Response Contract
The shared contracts SHALL define stable time-entry response shapes for backend responses and frontend consumers.

#### Scenario: Time entry response uses shared schema
- **GIVEN** the backend returns a time entry
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload matches the shared time-entry response contract
- **AND** includes ownership, task, project, timing, duration, billable, source, and timestamp fields

#### Scenario: Current timer response uses shared schema
- **GIVEN** the backend returns current timer state
- **WHEN** frontend or extension code consumes the response
- **THEN** the payload matches a shared current-timer response contract
- **AND** represents either one running entry or no running entry

#### Scenario: Time entry list response uses shared schema
- **GIVEN** the backend returns a list of time entries
- **WHEN** frontend code consumes the response
- **THEN** the payload matches a shared list response contract
- **AND** includes pagination metadata

### Requirement: Shared Time Entry Request Validation
The shared contracts SHALL define validation rules for manual entry creation, entry updates, timer actions, Chrome Extension timer starts, and list filters.

#### Scenario: Manual create request uses shared schema
- **GIVEN** a client constructs a manual time-entry create request
- **WHEN** the request payload is validated
- **THEN** the payload requires a task identifier, start time, and end time
- **AND** rejects unknown additional fields

#### Scenario: Time entry update request uses shared schema
- **GIVEN** a client constructs a time-entry update request
- **WHEN** the request payload is validated
- **THEN** the payload requires at least one mutable time-entry field
- **AND** rejects unknown additional fields

#### Scenario: Timer start request uses shared schema
- **GIVEN** a client constructs a timer start request
- **WHEN** the request payload is validated
- **THEN** the payload requires a task identifier
- **AND** rejects unknown additional fields

#### Scenario: Chrome GitHub start request uses shared schema
- **GIVEN** the Chrome Extension constructs a GitHub issue timer request
- **WHEN** the request payload is validated
- **THEN** the payload requires a GitHub repository key, issue number, and issue title
- **AND** rejects unknown additional fields

#### Scenario: Time entry list query uses shared schema
- **GIVEN** a client constructs a time-entry list query
- **WHEN** the query is validated
- **THEN** the query accepts shared pagination fields and time-entry filters
- **AND** rejects invalid filter values

### Requirement: Shared Time Entry Source Contract
The shared contracts SHALL define the supported time-entry source values.

#### Scenario: Source value is validated
- **GIVEN** code validates a time-entry source
- **WHEN** the value is checked against the shared source contract
- **THEN** only `web`, `extension`, and `manual` are valid
