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

#### Scenario: Workspace settings response includes time zone

- **GIVEN** the backend returns workspace settings data
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload includes `timeZone` as a valid IANA time-zone identifier
- **AND** the payload includes the existing `currency` and `defaultHourlyRate` fields

#### Scenario: Workspace settings update validates time zone

- **GIVEN** a client constructs a workspace settings update payload
- **WHEN** the payload includes `timeZone`
- **THEN** the shared schema accepts valid IANA time-zone identifiers
- **AND** the shared schema rejects invalid time-zone identifiers

### Requirement: Shared Workspace Member Contract

The shared contracts SHALL define stable shapes for listing workspace members and changing member roles.

#### Scenario: Workspace member admin flow uses shared schema

- **GIVEN** the backend accepts or returns workspace member administration data
- **WHEN** the payload is validated or consumed
- **THEN** it matches the shared workspace member contract

### Requirement: Shared Workspace Invite Contract
The shared contracts SHALL define stable shapes for invite creation, listing, resend, cancellation, and acceptance.

#### Scenario: Invite flow uses shared schema
- **GIVEN** the backend accepts or returns workspace invite data
- **WHEN** the payload is validated or consumed
- **THEN** it matches the shared workspace invite contract

#### Scenario: Invite resend response uses shared schema
- **GIVEN** an admin resends a pending invite
- **WHEN** the backend returns the resend response
- **THEN** the payload matches the shared workspace invite response contract
- **AND** no request body schema is required for the resend endpoint

#### Scenario: Invite resend delivery failure uses documented error contract
- **GIVEN** an admin resends a pending invite
- **WHEN** Firebase setup link generation or invite delivery fails after the pending invite is found
- **THEN** the API contract documents a 503 response for the resend endpoint
- **AND** the response surfaces the delivery or Firebase failure message

### Requirement: Shared Project Contract

The shared contracts SHALL define stable project request and response shapes for backend validation and future frontend clients.

#### Scenario: Project list response uses shared schema

- **GIVEN** the backend returns project list data
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload matches the shared project list response contract
- **AND** each project includes core provider-neutral project fields
- **AND** each project includes `description`, `visibility`, derived `source`, `totalHours`, assigned `members`, and active state
- **AND** each project excludes provider-specific external reference fields

#### Scenario: Single-project detail response uses shared schema

- **GIVEN** the backend returns single-project data from `GET /projects/:id`
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload matches the shared project detail response contract
- **AND** the payload includes all shared project response fields
- **AND** the payload includes `providerSummary`, `trackedSummary`, and `assignedMembersSummary`
- **AND** the payload excludes raw provider metadata and provider-specific storage internals

#### Scenario: Project create request uses shared schema

- **GIVEN** a client constructs a project create request
- **WHEN** the request payload is validated against the shared project create schema
- **THEN** the payload accepts valid creation fields including optional project visibility and optional nullable description
- **AND** the payload rejects unknown additional fields

#### Scenario: Project update request uses shared schema

- **GIVEN** a client constructs a project update request
- **WHEN** the request payload is validated against the shared project update schema
- **THEN** the payload requires at least one mutable project field
- **AND** the payload accepts `description` as an editable nullable project field
- **AND** the payload accepts `isActive` as the only supplied field for archive or unarchive requests
- **AND** the payload rejects unknown additional fields

### Requirement: Shared Project Summary Contract

The shared contracts SHALL define stable response shapes for project summary endpoints and single-project detail summaries.

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

#### Scenario: Project detail tracked summary uses shared schema

- **GIVEN** the backend returns project detail data
- **WHEN** frontend or backend code consumes the detail response
- **THEN** `trackedSummary` includes `totalSeconds`, `billableSeconds`, `billableShare`, and `lastActivityAt`
- **AND** `totalSeconds` and `billableSeconds` are non-negative integers
- **AND** `billableShare` is either `null` or a number from 0 through 1
- **AND** `lastActivityAt` is either `null` or an ISO datetime string

#### Scenario: Project detail provider summary uses shared schema

- **GIVEN** the backend returns project detail data
- **WHEN** frontend or backend code consumes the detail response
- **THEN** `providerSummary` includes `source`, `externalType`, `externalKey`, and `externalUrl`
- **AND** `source` matches the shared project source contract
- **AND** provider detail fields are nullable strings

#### Scenario: Project detail assigned-members summary uses shared schema

- **GIVEN** the backend returns project detail data
- **WHEN** frontend or backend code consumes the detail response
- **THEN** `assignedMembersSummary` includes `count`, `previewMembers`, and `remainingCount`
- **AND** `count` and `remainingCount` are non-negative integers
- **AND** `previewMembers` uses the shared project member shape

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
The shared contracts SHALL define validation rules for manual entry creation, entry updates including optional task reassignment, timer actions, Chrome Extension timer starts, and list filters including task-title search.

#### Scenario: Manual create request uses shared schema
- **GIVEN** a client constructs a manual time-entry create request
- **WHEN** the request payload is validated
- **THEN** the payload requires a task identifier, start time, and end time
- **AND** rejects unknown additional fields

#### Scenario: Time entry update request uses shared schema
- **GIVEN** a client constructs a time-entry update request
- **WHEN** the request payload is validated
- **THEN** the payload accepts optional task identifier, start time, end time, description, and billable fields
- **AND** requires at least one mutable time-entry field
- **AND** rejects unknown additional fields

#### Scenario: Time entry update can change task only by identifier
- **GIVEN** a client constructs a time-entry update request that moves an entry to another task
- **WHEN** the request payload is validated
- **THEN** the payload accepts a valid `taskId`
- **AND** does not accept embedded task or project objects

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
- **AND** accepts an optional task-title `search` filter
- **AND** rejects invalid filter values

### Requirement: Shared Time Entry Source Contract
The shared contracts SHALL define the supported time-entry source values.

#### Scenario: Source value is validated
- **GIVEN** code validates a time-entry source
- **WHEN** the value is checked against the shared source contract
- **THEN** only `web`, `extension`, and `manual` are valid

### Requirement: Shared Time Report Request Contract

The shared contracts SHALL define validation rules for time-report query parameters used by backend DTOs and frontend clients.

#### Scenario: Time report query accepts shared filters
- **GIVEN** a client constructs a time-report query
- **WHEN** the query is validated
- **THEN** the query accepts shared pagination fields, `dateFrom`, `dateTo`, `projectId`, `userId`, `groupBy`, `search`, `sortBy`, and `sortOrder`
- **AND** rejects invalid filter values

#### Scenario: Time report query supports report group values
- **GIVEN** a client constructs a time-report query with `groupBy`
- **WHEN** the query is validated
- **THEN** only `project`, `task`, and `user` are valid report group values

#### Scenario: Time report query supports export reuse
- **GIVEN** a client constructs a time-report export query
- **WHEN** the query is validated
- **THEN** the export query uses the same filter, grouping, search, and sorting contract as the JSON report query

### Requirement: Shared Time Report Response Contract

The shared contracts SHALL define stable response shapes for JSON time reports so backend responses and frontend consumers agree on summary, row, and pagination fields.

#### Scenario: Time report response uses shared schema
- **GIVEN** the backend returns a JSON time report
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload matches the shared time-report response contract
- **AND** includes the effective date window, group mode, summary totals, aggregate rows, and pagination metadata

#### Scenario: Time report summary uses shared schema
- **GIVEN** the backend returns a JSON time report
- **WHEN** the report contains matching completed entries
- **THEN** the summary includes `totalSeconds`, `billableSeconds`, `nonBillableSeconds`, `entryCount`, and `billableShare`
- **AND** `billableShare` is either `null` or a number from 0 through 1

#### Scenario: Project report row uses shared schema
- **GIVEN** the backend returns a project-grouped time report
- **WHEN** frontend or backend code consumes a row
- **THEN** the row identifies its group as `project`
- **AND** includes project context and aggregate timing fields

#### Scenario: Task report row uses shared schema
- **GIVEN** the backend returns a task-grouped time report
- **WHEN** frontend or backend code consumes a row
- **THEN** the row identifies its group as `task`
- **AND** includes task context, parent project context, and aggregate timing fields

#### Scenario: User report row uses shared schema
- **GIVEN** the backend returns a user-grouped time report
- **WHEN** frontend or backend code consumes a row
- **THEN** the row identifies its group as `user`
- **AND** includes user context and aggregate timing fields

### Requirement: Shared GitHub Connection Status Contract

The shared contracts SHALL define the exact response shape for GitHub connection status responses as a discriminated union. A disconnected response SHALL be `{ status: "disconnected", account: null }`. A connected response SHALL be `{ status: "connected", account: { githubUserId, login, avatarUrl, connectedAt, updatedAt } }`, where `githubUserId` and `login` are strings, `avatarUrl` is a nullable string, and `connectedAt` and `updatedAt` are ISO datetime strings.

#### Scenario: Disconnected status response
- **GIVEN** the backend returns GitHub connection status for a disconnected user
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload SHALL match the shared GitHub connection status contract
- **AND** the payload SHALL be `{ status: "disconnected", account: null }`
- **AND** the payload MUST NOT include access tokens, refresh tokens, PKCE verifier material, or token secrets

#### Scenario: Connected status response
- **GIVEN** the backend returns GitHub connection status for a connected user
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload SHALL match the shared GitHub connection status contract
- **AND** the payload SHALL include `status: "connected"`
- **AND** the payload SHALL include `account.githubUserId`, `account.login`, `account.avatarUrl`, `account.connectedAt`, and `account.updatedAt`
- **AND** the payload MUST NOT include access tokens, refresh tokens, PKCE verifier material, or token secrets

### Requirement: Shared GitHub Auth URL Contract

The shared contracts SHALL define the response shape for GitHub authorization URL creation as `{ authorizationUrl: string }`.

#### Scenario: Auth URL response
- **GIVEN** the backend creates a GitHub authorization URL
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload SHALL match the shared GitHub auth URL contract
- **AND** the payload SHALL include `authorizationUrl` as a string
- **AND** the payload MUST NOT include access tokens, refresh tokens, PKCE verifier material, or token secrets
