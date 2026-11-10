## MODIFIED Requirements

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


## ADDED Requirements

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
