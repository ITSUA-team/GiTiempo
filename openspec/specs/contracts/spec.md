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

### Requirement: Shared Frontend App Identity Contract

The shared contracts MUST provide stable identifiers for frontend application identity where cross-package behavior depends on them.

#### Scenario: Shared web app name usage

- GIVEN shared configuration needs to distinguish frontend applications
- WHEN the app identity is read from shared contracts
- THEN the value resolves to one of the supported web application names

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
 Project responses SHALL explicitly identify accessScope as project or own-time and expose server-computed operation capabilities. Own-time responses SHALL scope durations/activity to the caller, return members as an empty list, keep memberCount absent in every scope, and MUST NOT serialize peer identities or unrestricted raw metadata. Full-project response values remain unchanged.

#### Scenario: Project list response uses shared schema
- **GIVEN** the response uses full-project access or the request uses existing project mutation contracts
- **AND** the backend returns project list data
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload matches the shared project list response contract
- **AND** each project includes core provider-neutral project fields
- **AND** each project includes `description`, `visibility`, derived `source`, `totalSeconds`, assigned `members`, and active state
- **AND** each project excludes `totalHours`
- **AND** each project excludes provider-specific external reference fields


#### Scenario: Single-project detail response uses shared schema
- **GIVEN** the response uses full-project access or the request uses existing project mutation contracts
- **AND** the backend returns single-project data from `GET /projects/:id`
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload matches the shared project detail response contract
- **AND** the payload includes all shared project response fields
- **AND** the payload includes `providerSummary`, `trackedSummary`, and `assignedMembersSummary`
- **AND** the payload excludes raw provider metadata and provider-specific storage internals


#### Scenario: Project create request uses shared schema
- **GIVEN** the response uses full-project access or the request uses existing project mutation contracts
- **AND** a client constructs a project create request
- **WHEN** the request payload is validated against the shared project create schema
- **THEN** the payload accepts valid creation fields including optional project visibility and optional nullable description
- **AND** the payload rejects unknown additional fields


#### Scenario: Project update request uses shared schema
- **GIVEN** the response uses full-project access or the request uses existing project mutation contracts
- **AND** a client constructs a project update request
- **WHEN** the request payload is validated against the shared project update schema
- **THEN** the payload requires at least one mutable project field
- **AND** the payload accepts `description` as an editable nullable project field
- **AND** the payload accepts `isActive` as the only supplied field for archive or unarchive requests
- **AND** the payload rejects unknown additional fields

#### Scenario: Own-time responses are explicit and redacted
- **GIVEN** a response concerns an external project accessible only through own time
- **WHEN** shared schemas validate the response
- **THEN** scope and capabilities identify restricted access, own totals are used, assignedMembersSummary is null, members is empty, and memberCount is absent

### Requirement: Shared Project Summary Contract

The shared contracts SHALL define stable response shapes for project summary endpoints and single-project detail summaries.
 For own-time project detail, assignedMembersSummary SHALL be null and trackedSummary SHALL contain only own completed durations and own activity. Hidden assignment counts MUST NOT be represented as true zero counts. Full-project scopes retain the existing summary fields and values.

#### Scenario: Management project summary response uses shared schema
- **GIVEN** the response uses full-project access or the request uses existing project mutation contracts
- **AND** the backend returns management project summary data
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload matches the shared management project summary contract
- **AND** includes `activeProjects`, `privateProjects`, and `publicProjects`


#### Scenario: User project summary response uses shared schema
- **GIVEN** the response uses full-project access or the request uses existing project mutation contracts
- **AND** the backend returns user project summary data
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload matches the shared user project summary contract
- **AND** includes `visibleProjects`, `trackedHoursWeek`, and `trackedHoursMonth`


#### Scenario: Project detail tracked summary uses shared schema
- **GIVEN** the response uses full-project access or the request uses existing project mutation contracts
- **AND** the backend returns project detail data
- **WHEN** frontend or backend code consumes the detail response
- **THEN** `trackedSummary` includes `totalSeconds`, `billableSeconds`, `billableShare`, and `lastActivityAt`
- **AND** `totalSeconds` and `billableSeconds` are non-negative integers
- **AND** `billableShare` is either `null` or a number from 0 through 1
- **AND** `lastActivityAt` is either `null` or an ISO datetime string


#### Scenario: Project detail provider summary uses shared schema
- **GIVEN** the response uses full-project access or the request uses existing project mutation contracts
- **AND** the backend returns project detail data
- **WHEN** frontend or backend code consumes the detail response
- **THEN** `providerSummary` includes `source`, `externalType`, `externalKey`, and `externalUrl`
- **AND** `source` matches the shared project source contract
- **AND** provider detail fields are nullable strings


#### Scenario: Project detail assigned-members summary uses shared schema
- **GIVEN** the response uses full-project access or the request uses existing project mutation contracts
- **AND** the backend returns project detail data
- **WHEN** frontend or backend code consumes the detail response
- **THEN** `assignedMembersSummary` includes `count`, `previewMembers`, and `remainingCount`
- **AND** `count` and `remainingCount` are non-negative integers
- **AND** `previewMembers` uses the shared project member shape

#### Scenario: Own-time responses are explicit and redacted
- **GIVEN** a response concerns an external project accessible only through own time
- **WHEN** shared schemas validate the response
- **THEN** scope and capabilities identify restricted access, own totals are used, assignedMembersSummary is null, members is empty, and memberCount is absent


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

### Requirement: Shared Task Response Includes Synced GitHub Issue Metadata

The shared task response contract SHALL keep the standard task response shape while allowing nullable synced GitHub issue metadata for tasks linked to GitHub issues.

#### Scenario: Synced GitHub issue task uses the standard task response contract
- **GIVEN** the backend returns a task linked to a GitHub issue
- **WHEN** frontend or backend code consumes the standard task response
- **THEN** the payload SHALL still use the shared task response contract
- **AND** it SHALL include nullable `githubIssue` metadata with the normalized GitHub repository key and issue number

#### Scenario: Provider-neutral task omits synced GitHub issue metadata
- **GIVEN** the backend returns a task with no GitHub issue link
- **WHEN** frontend or backend code consumes the standard task response
- **THEN** the payload SHALL set `githubIssue` to `null`

### Requirement: Shared Time Entry Response Contract
The shared time-entry response contract SHALL expose the invoice link of a time entry so clients can surface billed state without a separate request.

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

#### Scenario: Billed time entry exposes its invoice link

- **GIVEN** a time entry is linked to an invoice
- **WHEN** the backend returns that time entry
- **THEN** the response includes the invoice identifier as a UUID

#### Scenario: Unbilled time entry exposes a null invoice link

- **GIVEN** a time entry is not linked to any invoice
- **WHEN** the backend returns that time entry
- **THEN** the response includes a null invoice link

### Requirement: Shared Time Entry Request Validation
The shared contracts SHALL define validation rules for manual entry creation, entry updates including optional task reassignment, timer actions including optional timer-start descriptions, Chrome Extension timer starts, and list filters including task-title search.

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
- **AND** accepts an optional nullable `description` field
- **AND** rejects unknown additional fields

#### Scenario: Timer start description follows time-entry description limits
- **GIVEN** a client constructs a timer start request with `description`
- **WHEN** the request payload is validated
- **THEN** the shared schema accepts a string description within the time-entry description length limit or `null`
- **AND** rejects descriptions that exceed that limit

#### Scenario: Chrome GitHub start request uses shared schema
- **GIVEN** the Chrome Extension constructs a GitHub issue timer request
- **WHEN** the request payload is validated
- **THEN** the payload requires a GitHub repository key and positive integer issue number, accepts an optional GitHub Project identifier as a verification hint, and rejects client-supplied issue titles, project assignments, workspace credentials, or installation tokens
- **AND** rejects unknown additional fields

#### Scenario: Time entry list query uses shared schema
- **GIVEN** a client constructs a time-entry list query
- **WHEN** the query is validated
- **THEN** the query accepts shared pagination fields and time-entry filters
- **AND** accepts an optional task-title `search` filter
- **AND** rejects invalid filter values

### Requirement: Shared Conditional Timer Stop Contract
The shared contracts SHALL define the optional timer-stop request payload used by the API, current web clients, and the Chrome extension.

#### Scenario: Conditional stop request carries the authoritative timer identity
- **GIVEN** a current client stops a running timer
- **WHEN** it validates the request payload against the shared contract
- **THEN** the payload accepts an `expectedTimerId` UUID
- **AND** the API uses that identifier to conditionally stop only the matching running timer
- **AND** a stale, completed, absent, or foreign identifier results in `409 Conflict`

#### Scenario: Legacy bodyless stop request remains valid
- **GIVEN** an installed legacy client stops a timer without a request body
- **WHEN** the API validates the stop request against the shared contract
- **THEN** the empty payload is accepted
- **AND** the API retains the user-global legacy stop behavior
- **AND** no running timer results in `404 Not Found`

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
- **THEN** only `project`, `task`, `user`, and `billable` are valid report group values

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

The shared contracts SHALL define a discriminated identity status with independent OAuth, capability and disconnect-eligibility fields. A disconnected identity SHALL have status disconnected and account null. A connected identity SHALL have status connected and safe account fields githubUserId, login, avatarUrl, connectedAt and updatedAt with the existing types. Both variants SHALL carry oauth, capabilities and disconnect fields. No variant SHALL expose tokens, encrypted values, PKCE material or secrets.

#### Scenario: OAuth readiness is separate from App access
- **GIVEN** the backend returns a connection status
- **WHEN** shared schemas parse the payload
- **THEN** oauth.status SHALL be one of not_authorized, authorized or reauthorization_required and oauth.missingScopes SHALL contain only known requested scope names
- **AND** capabilities.organizationDiscovery and capabilities.personalData SHALL each be one of ready, authorization_required or permission_required
- **AND** disconnect SHALL be one of allowed, alternative_signin_required or verification_unavailable

#### Scenario: Disconnected payload has explicit capabilities
- **GIVEN** no identity link exists
- **WHEN** the backend returns status
- **THEN** account SHALL be null and both capabilities SHALL require authorization
- **AND** oauth SHALL be not_authorized and disconnect SHALL be allowed for idempotent cleanup

#### Scenario: Connected payload does not grant installation access
- **GIVEN** a personal identity is linked
- **WHEN** a frontend consumes the connection contract
- **THEN** safe account fields SHALL preserve string GitHub ID/login, nullable avatarUrl and ISO timestamps
- **AND** the client MUST use capability fields for feature gates and separate workspace contracts for installation state

#### Scenario: Actual scope normalization
- **GIVEN** GitHub reports a broader granted scope that includes a requested read scope
- **WHEN** the server derives missingScopes
- **THEN** the included scope SHALL NOT be falsely listed as missing
- **AND** the system MUST NOT request a broader scope solely to simplify normalization

### Requirement: Shared GitHub Auth URL Contract

The shared contracts SHALL define the response shape for GitHub authorization URL creation as `{ authorizationUrl: string }`.

#### Scenario: Auth URL response
- **GIVEN** the backend creates a GitHub authorization URL
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload SHALL match the shared GitHub auth URL contract
- **AND** the payload SHALL include `authorizationUrl` as a string
- **AND** the payload MUST NOT include access tokens, refresh tokens, PKCE verifier material, or token secrets

### Requirement: Shared GitHub Browsing Owner Contracts

The shared contracts SHALL define stable GitHub owner browsing query and response shapes for backend DTOs and future frontend clients.

#### Scenario: GitHub owner list response uses shared schema
- **GIVEN** the backend returns GitHub owner browsing data
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload SHALL match the shared GitHub owner list response contract
- **AND** each owner SHALL include login, label, owner type, nullable avatar URL, and nullable GitHub URL
- **AND** the payload MUST NOT include GitHub access tokens, refresh tokens, PKCE verifier material, or token secrets

#### Scenario: GitHub owner list query uses shared schema
- **GIVEN** a client constructs a GitHub owner list query
- **WHEN** the query is validated
- **THEN** the query SHALL accept only the owner type filters `all`, `personal`, and `organization`
- **AND** invalid owner type filters SHALL be rejected

### Requirement: Shared GitHub Page Token Pagination Contracts

The shared contracts SHALL define a unified page-token pagination shape for GitHub browsing responses.

#### Scenario: GitHub browsing response uses page-token pagination
- **GIVEN** the backend returns paginated GitHub browsing data
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload SHALL include pagination metadata with `limit`, `hasNextPage`, and nullable `nextPageToken`
- **AND** the payload MUST NOT expose provider-specific REST page numbers or GraphQL cursors as public contract fields

#### Scenario: GitHub browsing query uses page token
- **GIVEN** a client constructs a paginated GitHub browsing query
- **WHEN** the query is validated
- **THEN** the query SHALL accept an optional opaque `pageToken`
- **AND** the query SHALL accept bounded `limit` values

### Requirement: Shared GitHub Repository Browsing Contracts

The shared contracts SHALL define stable GitHub repository browsing query and response shapes.

#### Scenario: GitHub repository list response uses shared schema
- **GIVEN** the backend returns GitHub repository browsing data
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload SHALL match the shared GitHub repository list response contract
- **AND** each repository SHALL include owner, name, full name, visibility, archived state, nullable description, GitHub URL, and updated time
- **AND** the payload SHALL include unified page-token pagination metadata

#### Scenario: GitHub repository list query uses shared schema
- **GIVEN** a client constructs a GitHub repository list query
- **WHEN** the query is validated
- **THEN** the query SHALL require an owner type of `personal` or `organization`
- **AND** the query SHALL accept an organization owner login only when organization scope is requested
- **AND** the query SHALL accept unified page-token pagination fields

### Requirement: Shared GitHub Project Browsing Contracts

The shared contracts SHALL define stable GitHub Project V2 browsing query and response shapes.

#### Scenario: GitHub project list response uses shared schema
- **GIVEN** the backend returns GitHub Project V2 browsing data
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload SHALL match the shared GitHub project list response contract
- **AND** each project SHALL include a GitHub Project V2 node id, number, title, owner, state, nullable description, nullable URL, and updated time
- **AND** the payload SHALL include unified page-token pagination metadata

#### Scenario: GitHub project list query uses shared schema
- **GIVEN** a client constructs a GitHub project list query
- **WHEN** the query is validated
- **THEN** the query SHALL require an owner type of `personal` or `organization`
- **AND** the query SHALL accept an organization owner login only when organization scope is requested
- **AND** the query SHALL accept unified page-token pagination fields

### Requirement: Shared GitHub Issue Browsing Contracts

The shared contracts SHALL define stable GitHub issue browsing response shapes for repository and Project V2 issue browsing.

#### Scenario: GitHub repository issue list response uses shared schema
- **GIVEN** the backend returns GitHub repository issue browsing data
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload SHALL match the shared GitHub repository issue list response contract
- **AND** each issue SHALL include issue id, repository owner, repository name, repository full name, issue number, title, state, GitHub URL, and updated time
- **AND** the payload SHALL include unified page-token pagination metadata

#### Scenario: GitHub Project V2 issue list response uses shared schema
- **GIVEN** the backend returns GitHub Project V2 issue item browsing data
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload SHALL match the shared GitHub Project V2 issue list response contract
- **AND** each item SHALL include project item id and normalized issue data
- **AND** the payload SHALL include unified page-token pagination metadata and skipped item counts

#### Scenario: GitHub issue state query uses shared schema
- **GIVEN** a client constructs a GitHub issue browsing query
- **WHEN** the query is validated
- **THEN** the query SHALL accept only `open`, `closed`, and `all` issue state filters
- **AND** invalid issue state filters SHALL be rejected

#### Scenario: GitHub issue query omits state filter
- **GIVEN** a client constructs a GitHub issue browsing query without a state filter
- **WHEN** the query is validated
- **THEN** the query SHALL default the state filter to `all`

#### Scenario: GitHub issue query includes search
- **GIVEN** a client constructs a GitHub issue browsing query with a search value
- **WHEN** the query is validated
- **THEN** the query SHALL accept the search value as an optional string field

### Requirement: Shared GitHub Issue Materialization Contract

The shared contracts SHALL define the request shape used to materialize a visible local task from a selected GitHub issue inside a GitHub-backed project.

#### Scenario: GitHub issue materialization request uses shared schema
- **GIVEN** a client constructs a request to create or reuse a task from a selected GitHub issue
- **WHEN** the payload is validated
- **THEN** the shared schema SHALL require `projectId` and `issueNumber`
- **AND** `projectId` SHALL be a UUID
- **AND** `issueNumber` SHALL be a positive integer

#### Scenario: GitHub issue materialization request rejects client-owned repository fields
- **GIVEN** a client constructs a request to create or reuse a task from a selected GitHub issue
- **WHEN** the payload includes repository or issue-title fields owned by server-side GitHub lookups
- **THEN** the shared schema SHALL reject the payload

### Requirement: Shared Billable Default Project Contract
The shared contracts MUST expose and validate project-level default billable fields used by backend APIs and frontend clients.

#### Scenario: Project response includes default billable for tasks
- **GIVEN** the backend returns a project response
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload includes `defaultBillableForTasks` as a boolean field

#### Scenario: Project create accepts default billable for tasks
- **GIVEN** a client constructs a project create request
- **WHEN** the payload includes `defaultBillableForTasks`
- **THEN** the shared schema accepts a boolean value
- **AND** the schema rejects non-boolean values and unknown additional fields

#### Scenario: Project update accepts default billable for tasks
- **GIVEN** a client constructs a project update request
- **WHEN** the payload includes `defaultBillableForTasks`
- **THEN** the shared schema accepts it as a mutable project field
- **AND** a payload containing only `defaultBillableForTasks` satisfies the at-least-one-field rule

### Requirement: Shared Billable Default Task Contract
The shared contracts MUST expose and validate task-level default billable fields used by backend APIs and frontend clients.

#### Scenario: Task response includes default billable for time entries
- **GIVEN** the backend returns a task response
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload includes `defaultBillableForTimeEntries` as a boolean field

#### Scenario: Task create accepts default billable for time entries
- **GIVEN** a client constructs a task create request
- **WHEN** the payload includes `defaultBillableForTimeEntries`
- **THEN** the shared schema accepts a boolean value
- **AND** the schema rejects non-boolean values and unknown additional fields

#### Scenario: Task update accepts default billable for time entries
- **GIVEN** a client constructs a task update request
- **WHEN** the payload includes `defaultBillableForTimeEntries`
- **THEN** the shared schema accepts it as a mutable task field
- **AND** a payload containing only `defaultBillableForTimeEntries` satisfies the at-least-one-field rule

### Requirement: Shared Billable Backfill Contracts
The shared contracts MUST define explicit request and response schemas for project-level and task-level existing-record billable backfills.

#### Scenario: Project backfill request validates selected downstream record types
- **GIVEN** a client constructs a project billable-default backfill request
- **WHEN** the payload includes `updateTasks` or `updateTimeEntries`
- **THEN** the shared schema accepts boolean values for those fields
- **AND** the schema requires at least one selected field to be `true`
- **AND** the schema rejects unknown additional fields

#### Scenario: Project backfill response reports update counts
- **GIVEN** the backend completes a project billable-default backfill
- **WHEN** the response is produced
- **THEN** the payload includes non-negative integer `tasksUpdated` and `timeEntriesUpdated` fields

#### Scenario: Task backfill request validates existing time-entry update intent
- **GIVEN** a client constructs a task billable-default backfill request
- **WHEN** the payload includes `updateTimeEntries`
- **THEN** the shared schema accepts `true`
- **AND** the schema rejects `false` as an unselected no-op request
- **AND** the schema rejects unknown additional fields

#### Scenario: Task backfill response reports update count
- **GIVEN** the backend completes a task billable-default backfill
- **WHEN** the response is produced
- **THEN** the payload includes a non-negative integer `timeEntriesUpdated` field

### Requirement: Shared Time Entry Create Contract Preserves Entry Override
The shared time-entry contracts MUST keep manual entry billable overrides explicit while allowing backend task-default inheritance when the override is omitted.

#### Scenario: Manual create request may omit billable override
- **GIVEN** a client constructs a manual time-entry create request
- **WHEN** the payload omits `isBillable`
- **THEN** the shared schema accepts the request so the backend can inherit the selected task default

#### Scenario: Manual create request may override billable state
- **GIVEN** a client constructs a manual time-entry create request
- **WHEN** the payload includes `isBillable`
- **THEN** the shared schema accepts a boolean value
- **AND** the backend can store that explicit entry-level value instead of inheriting the task default

#### Scenario: Timer start request does not accept billable override
- **GIVEN** a client constructs a timer start request
- **WHEN** the payload includes `isBillable`
- **THEN** the shared schema rejects the payload as containing an unknown additional field

### Requirement: Shared Registration Error Contract
The shared contracts SHALL define stable registration error identifiers for frontend error mapping.

#### Scenario: Registration errors use shared identifiers
- **WHEN** registration fails for an expected user-correctable or retryable reason
- **THEN** the frontend can map the failure to one of `duplicate_email`, `weak_password`, `invalid_workspace_name`, `rate_limited`, or `registration_service_unavailable`
- **AND** the API response does not require the frontend to parse provider-specific error messages

#### Scenario: Registration errors use the standard API envelope
- **WHEN** the backend returns a mapped registration failure
- **THEN** the response body includes the standard API error fields `statusCode`, `error`, and `message`
- **AND** the stable frontend-visible registration identifier is carried in `code`
- **AND** `error` remains the HTTP-category label rather than the registration-specific identifier

#### Scenario: Workspace name conflict is retired
- **GIVEN** a valid registration request reuses another workspace's display name
- **WHEN** the registration contract is applied
- **THEN** `workspace_name_unavailable` is not an allowed registration error identifier
- **AND** duplicate names alone cannot fail the request

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

### Requirement: Workspace GitHub Organization Rejections Are Frontend-Safe
The shared API contract SHALL expose stable, frontend-safe recovery payloads for add-organization failures that the admin Settings page can map to OAuth organization-access recovery cards.

#### Scenario: Add organization rejection exposes recovery payload
- **GIVEN** the backend rejects an add allowed GitHub organization request for a recoverable GitHub connection or provider access reason
- **WHEN** frontend code consumes the error payload
- **THEN** the payload matches the standard API error envelope with `statusCode`, `error`, `message`, optional `code`, optional `requestId`, and optional `details`
- **AND** the payload includes a required `recovery` object
- **AND** the `code` field includes a stable recovery reason category
- **AND** the reason can represent missing GitHub connection, organization not visible, OAuth permission missing or organization OAuth access restricted, and retryable provider failure
- **AND** the payload includes the rejected organization login when available
- **AND** the payload includes ordered OAuth organization-access recovery steps with stable step identifiers and status values
- **AND** the step identifiers can represent authorize OAuth, grant required OAuth permission, approve or unblock organization OAuth access, and retry allow-list check
- **AND** the payload excludes GitHub token material and raw provider secrets

#### Scenario: Recovery step statuses use shared schema
- **GIVEN** frontend or backend code consumes a OAuth organization-access recovery step
- **WHEN** the payload is validated against the shared schema
- **THEN** each step includes a stable id and status
- **AND** unknown step ids or status values are rejected
- **AND** the schema carries no UI copy, external URLs, token material, or raw provider response data

#### Scenario: Installation recovery stays separate
- **GIVEN** an organization addition fails due to OAuth membership or policy
- **WHEN** the frontend renders recovery
- **THEN** it MUST NOT present App installation as a prerequisite to saving the organization policy
- **AND** separate installation setup failures SHALL retain their existing App-specific recovery contracts

### Requirement: Shared Installation Management Contracts Are Credential Free
Shared contracts SHALL define strict workspace installation setup, completion, status, re-verification, and disconnect shapes. Safe status responses SHALL contain association ID, stable organization ID and display login, installation ID, verification timestamp, lifecycle status, and safe recovery reason. Requests MUST NOT accept a client assertion of verified status or contain the App private key or installation tokens. The workspace MUST come from the authenticated context and setup state.

#### Scenario: Admin reads installation status
- **GIVEN** an authenticated workspace admin
- **WHEN** the backend returns installation associations
- **THEN** responses validate against shared schemas and contain only that workspace's safe association metadata
- **AND** no provider credential or unrelated workspace data is exposed

#### Scenario: Client tries to assert verification
- **GIVEN** a setup payload containing a forged verified status, workspace override, or token
- **WHEN** the payload is validated
- **THEN** it is rejected without activating an association

### Requirement: GitHub Tracking Errors Have Stable Codes
The API SHALL use the existing domain-error envelope with a stable `code` and safe `message` for installation-backed GitHub tracking failures. API DTOs, shared schemas, OpenAPI, user-web, and extension consumers SHALL agree on these codes. `project_assignment_required` MUST use HTTP 403 and the exact message from issue #420 without protected project metadata. Provider credential failures MUST NOT be returned as a GiTiempo-session HTTP 401.

#### Scenario: Assignment failure is distinguishable
- **GIVEN** the backend denies an otherwise eligible member for missing assignment
- **WHEN** a client validates the error response
- **THEN** it can identify `project_assignment_required` independently of installation or personal connection failures
- **AND** the response contains no protected project data

#### Scenario: Installation mapping and provider failures remain distinguishable
- **GIVEN** a rejected GitHub start
- **WHEN** the backend classifies the failure
- **THEN** the contract distinguishes `github_installation_required`, `github_installation_unavailable`, `github_installation_permissions_required`, `github_organization_not_allowed`, `github_resource_unavailable`, `github_project_mapping_required`, `github_project_mapping_ambiguous`, and `github_provider_unavailable`
- **AND** errors contain safe recovery copy without raw GitHub payloads or credentials

#### Scenario: Existing timer responses remain compatible
- **GIVEN** a successful GitHub start or owned-timer stop
- **WHEN** the client validates the response
- **THEN** it uses the existing time-entry response schema and stable issue linkage
- **AND** the new installation management metadata is not added to ordinary timer responses

### Requirement: Setup Responses Support Existing Installations
The shared setup response SHALL retain opaque `state`, `installationUrl`, and `expiresAt` fields and MAY include `existingInstallationId` as a positive decimal string of at most 30 digits. A discovered ID MUST NOT grant access without normal setup completion verification.

#### Scenario: Existing installation candidate is returned
- **GIVEN** App-authenticated discovery identifies the configured App installation for the selected stable organization
- **WHEN** setup returns its shared response
- **THEN** the client submits the candidate ID and opaque state to the completion endpoint
- **AND** no installation token or App credential is exposed

#### Scenario: Explicit setup has no existing installation candidate
- **GIVEN** an administrator explicitly starts setup for an allowed organization and discovery returns GitHub 404
- **WHEN** setup returns its shared response without `existingInstallationId`
- **THEN** the client uses `installationUrl` containing opaque setup state to open the configured App installation flow
- **AND** automatic background discovery does not navigate using that URL

### Requirement: Installation Completion Errors Explain Authority Recovery
Installation completion SHALL return HTTP 409 with `Reconnect GitHub, then retry installation verification` when successful provider lookups show that the exact installation is inaccessible to the administrator's user token. If installation access is confirmed but active owner authority or organization identity does not match, it SHALL return HTTP 403 with `GitHub organization owner authority is required`. These setup errors SHALL remain distinct from the stable timer-start domain error codes.

#### Scenario: Setup recovery does not alter timer error contracts
- **GIVEN** setup completion rejects installation access or owner authority
- **WHEN** the client receives the failure
- **THEN** it displays the corresponding safe setup message
- **AND** no new timer-start domain code or personal-connection requirement for tracking members is introduced

### Requirement: Shared GitHub Account Recovery Contracts

The shared contracts SHALL expose stable safe recovery errors for identity conflicts, mismatched identities, missing OAuth authorization/permissions and blocked or unverifiable disconnect eligibility. Full Disconnect SHALL report local unlink separately from provider revocation confirmation. Provider errors MUST NOT disclose another user's identity or secret material.

#### Scenario: Cross-user link conflict
- **GIVEN** a GitHub ID is owned by another GiTiempo user
- **WHEN** an authenticated link or sign-in ownership commit conflicts
- **THEN** the response SHALL identify an account-link conflict without including the owner's email, name or workspace

#### Scenario: Complete local unlink with revocation warning
- **GIVEN** local removal succeeds but provider revocation cannot be confirmed
- **WHEN** the API returns Disconnect result
- **THEN** the response SHALL have disconnected true and providerRevocation unconfirmed
- **AND** clients SHALL show the disconnected state plus safe warning, not retain a false connected state

#### Scenario: Provider revocation confirmed or unnecessary
- **GIVEN** local unlink completes
- **WHEN** the API returns the result
- **THEN** providerRevocation SHALL be confirmed when revocation succeeded or not_required when no revocable credentials remained

#### Scenario: Eligibility blocks unlink
- **GIVEN** another usable login method is absent or cannot be verified
- **WHEN** Disconnect is rejected
- **THEN** the response SHALL distinguish alternative_signin_required from verification_unavailable
- **AND** the previous link and credentials SHALL remain intact

### Requirement: Shared External Reference Start Contract
Shared validation SHALL define a reference-start request containing repository key, positive safe integer issue number, bounded issue title and a canonical HTTPS github.com issue URL with matching repository and number. It MUST reject unknown authority fields such as workspace, user, mode or verified status. It MUST use existing time-entry response and stable safe error conventions; reference success MUST NOT imply provider verification.

#### Scenario: Projects pane submits canonical issue identity
- **GIVEN** the source page is a supported Projects pane
- **WHEN** the extension constructs a reference request
- **THEN** the canonical URL identifies the parsed repository issue rather than the board URL


#### Scenario: Caller cannot inject authority
- **GIVEN** a caller sends a workspace, user, tracking mode or verified flag in the body
- **WHEN** the request is validated
- **THEN** unknown fields are rejected and session/stored data remain authoritative

### Requirement: Scoped Task And Extension Capabilities Are Explicit
Shared responses SHALL expose whether a task is available through own-time or separate project scope and whether shared task management is authorized. Extension runtime context SHALL identify the current workspace without exposing credentials and MUST NOT gate reference starts on GitHub-link or administrator-enablement state.

#### Scenario: Own-time task cannot advertise management
- **GIVEN** a task is returned to an own-time reader
- **WHEN** a client consumes capabilities
- **THEN** shared mutation capabilities are false while an otherwise eligible own timer action remains available


#### Scenario: Workspace destination is available before start
- **GIVEN** an authenticated extension user has no timer
- **WHEN** runtime state is loaded
- **THEN** the current session workspace is available for display and no GitHub connection gate is required

### Requirement: Shared Invoice Status Contract

The shared contracts SHALL define an invoice status enum restricted to `draft`, `sent`, and `paid` for backend validation and frontend consumption.

#### Scenario: Status value is validated

- **GIVEN** a request or response carries an invoice status
- **WHEN** the shared schema validates the value
- **THEN** only `draft`, `sent`, or `paid` are accepted and any other value is rejected

### Requirement: Shared Invoice Create Contract

The shared contracts SHALL define a validated invoice create request body with a title, billing date range, optional project id, hourly rate, optional currency, optional discount percent, and optional notes, rejecting any property outside the contract.

#### Scenario: Create request uses shared schema

- **GIVEN** an admin or PM creates an invoice
- **WHEN** the request body is validated
- **THEN** the title, date range, and rate requirements are enforced
- **AND** the discount percent is constrained to the 0–100 range with a step of 0.01

#### Scenario: Unknown property is rejected

- **GIVEN** a create request carries a property outside the contract
- **WHEN** the shared schema validates the body
- **THEN** the request is rejected

### Requirement: Shared Invoice Update Contract

The shared contracts SHALL define a validated invoice update request body for editable fields, rejecting any property outside the contract and any attempt to mutate snapshot totals directly.

#### Scenario: Update request uses shared schema

- **GIVEN** an admin or PM updates an invoice
- **WHEN** the request body is validated
- **THEN** only editable fields defined by the contract are accepted

#### Scenario: Snapshot totals are not directly mutable

- **GIVEN** an update request attempts to set `total_hours` or `total_amount`
- **WHEN** the shared schema validates the body
- **THEN** the request is rejected

### Requirement: Shared Invoice List Query Contract

The shared contracts SHALL define a validated invoice list query with pagination and optional filters by project, status, date range, and search text, rejecting any property outside the contract.

#### Scenario: List query uses shared schema

- **GIVEN** an admin or PM lists invoices
- **WHEN** the query parameters are validated
- **THEN** pagination (page, limit), project, status, date range, and search filters are enforced
- **AND** the search text is constrained to a maximum of 200 characters

#### Scenario: Unknown query property is rejected

- **GIVEN** a list query carries a property outside the contract
- **WHEN** the shared schema validates the query
- **THEN** the request is rejected

### Requirement: Shared Invoice Response Contract

The shared contracts SHALL define stable invoice list and detail response shapes that include snapshot fields, status, billing date range, optional project summary, and the count of linked time entries. The detail response additionally includes the full array of linked time-entry summaries.

#### Scenario: Invoice list response uses shared schema

- **GIVEN** the backend returns a list of invoices
- **WHEN** frontend code consumes the response
- **THEN** the payload matches the shared invoice list response contract
- **AND** includes pagination metadata
- **AND** each item includes snapshot fields, status, billing date range, optional project summary, and `timeEntryCount`
- **AND** list items do NOT include the `timeEntries` array

#### Scenario: Invoice detail response uses shared schema

- **GIVEN** the backend returns a single invoice
- **WHEN** frontend code consumes the response
- **THEN** the payload matches the shared invoice detail response contract
- **AND** includes snapshot `hourlyRate`, `currency`, `totalHours`, and `totalAmount`
- **AND** includes the linked time entries as an array of summaries

### Requirement: Shared Eligible Entries Query Contract

The shared contracts SHALL define a validated eligible-entries query with a required date range and optional project id, rejecting any property outside the contract and any reversed date bounds.

#### Scenario: Eligible entries query uses shared schema

- **GIVEN** an admin or PM previews eligible entries
- **WHEN** the query parameters are validated
- **THEN** `dateFrom` and `dateTo` are required and `projectId` is optional
- **AND** `dateTo` earlier than `dateFrom` is rejected

#### Scenario: Unknown query property is rejected

- **GIVEN** an eligible-entries query carries a property outside the contract
- **WHEN** the shared schema validates the query
- **THEN** the request is rejected

### Requirement: Shared Eligible Entries Response Contract

The shared contracts SHALL define a stable eligible-entries response shape that includes a count, computed total hours, an array of time-entry summaries with user and task names, and the workspace default hourly rate and currency.

#### Scenario: Eligible entries response uses shared schema

- **GIVEN** the backend returns eligible time entries
- **WHEN** frontend code consumes the response
- **THEN** the payload matches the shared eligible-entries response contract
- **AND** includes `count`, `totalHours`, `entries`, `defaultHourlyRate`, and `defaultCurrency`
- **AND** each entry includes `userName` and `taskName` for display

### Requirement: Shared Invoice Stats Response Contract

The shared contracts SHALL define a stable invoice stats response shape that includes counts grouped by status and a summary of invoices created in the current calendar month.

#### Scenario: Stats response uses shared schema

- **GIVEN** the backend returns invoice stats
- **WHEN** frontend code consumes the response
- **THEN** the payload matches the shared invoice stats response contract
- **AND** includes `byStatus` with `draft`, `sent`, and `paid` counts
- **AND** includes `thisMonth` with `invoiceCount`, `projectCount`, `totalAmount`, and `currency`
