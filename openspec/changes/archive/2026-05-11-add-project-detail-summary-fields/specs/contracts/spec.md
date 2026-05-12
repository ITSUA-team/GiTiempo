## MODIFIED Requirements

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
