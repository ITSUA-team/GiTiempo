# Spec Delta

## MODIFIED Requirements

### Requirement: Shared Workspace Contract

The shared contracts SHALL define stable workspace and workspace-settings shapes for backend and frontend consumers. Workspace settings responses SHALL include a non-null `timeRoundingStepMinutes` integer (1–60). Workspace settings update schemas SHALL accept an optional `timeRoundingStepMinutes` integer (1–60).

#### Scenario: Workspace response uses shared schema

- **GIVEN** the backend returns current workspace or workspace settings data
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload matches the shared workspace contract for that endpoint

#### Scenario: Workspace settings response includes time zone

- **GIVEN** the backend returns workspace settings data
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload includes `timeZone` as a valid IANA time-zone identifier
- **AND** the payload includes the existing `currency` and `defaultHourlyRate` fields
- **AND** the payload includes `timeRoundingStepMinutes` as a non-null integer between 1 and 60

#### Scenario: Workspace settings update validates time zone

- **GIVEN** a client constructs a workspace settings update payload
- **WHEN** the payload includes `timeZone`
- **THEN** the shared schema accepts valid IANA time-zone identifiers
- **AND** the shared schema rejects invalid time-zone identifiers
- **WHEN** the payload includes `timeRoundingStepMinutes`
- **THEN** the shared schema accepts integer values between 1 and 60
- **AND** the shared schema rejects 0, non-integer values, and values greater than 60

### Requirement: Shared Project Contract

The shared contracts SHALL define stable project request and response shapes for backend validation and future frontend clients.
 Project responses SHALL explicitly identify accessScope as project or own-time and expose server-computed operation capabilities. Own-time responses SHALL scope durations/activity to the caller, return members as an empty list, keep memberCount absent in every scope, and MUST NOT serialize peer identities or unrestricted raw metadata. Full-project response values remain unchanged. Project create and update schemas SHALL accept an optional nullable `timeRoundingStepMinutes` integer (1–60) where null means the project inherits the workspace's `timeRoundingStepMinutes`. Project responses SHALL include `timeRoundingStepMinutes` (nullable).

#### Scenario: Project list response uses shared schema
- **GIVEN** the response uses full-project access or the request uses existing project mutation contracts
- **AND** the backend returns project list data
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload matches the shared project list response contract
- **AND** each project includes core provider-neutral project fields
- **AND** each project includes `description`, `visibility`, derived `source`, `totalSeconds`, assigned `members`, `timeRoundingStepMinutes` (nullable), and active state
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
- **THEN** the payload accepts valid creation fields including optional project visibility, optional nullable description, and optional nullable `timeRoundingStepMinutes` (integer 1–60, where null means inherit from the workspace)
- **AND** the payload rejects unknown additional fields


#### Scenario: Project update request uses shared schema
- **GIVEN** the response uses full-project access or the request uses existing project mutation contracts
- **AND** a client constructs a project update request
- **WHEN** the request payload is validated against the shared project update schema
- **THEN** the payload requires at least one mutable project field
- **AND** the payload accepts `description` as an editable nullable project field
- **AND** the payload accepts `timeRoundingStepMinutes` as an editable nullable integer (1–60, where null restores inheritance from the workspace)
- **AND** the payload accepts `isActive` as the only supplied field for archive or unarchive requests
- **AND** the payload rejects unknown additional fields

#### Scenario: Own-time responses are explicit and redacted
- **GIVEN** a response concerns an external project accessible only through own time
- **WHEN** shared schemas validate the response
- **THEN** scope and capabilities identify restricted access, own totals are used, assignedMembersSummary is null, members is empty, and memberCount is absent

### Requirement: Shared Invoice Create Contract

The shared contracts SHALL define a validated invoice create request body with a title, billing date range, optional project id, hourly rate, optional currency, optional discount percent, optional notes, and an optional `roundingStepMinutes` positive integer (1–60), rejecting any property outside the contract. When `roundingStepMinutes` is omitted, the backend resolves the snapshot default; the contract never accepts null for `roundingStepMinutes`.

#### Scenario: Create request uses shared schema

- **GIVEN** an admin or PM creates an invoice
- **WHEN** the request body is validated
- **THEN** the title, date range, and rate requirements are enforced
- **AND** the discount percent is constrained to the 0–100 range with a step of 0.01
- **AND** `roundingStepMinutes` is constrained to a positive integer between 1 and 60 when present
- **AND** `roundingStepMinutes` is rejected when null

#### Scenario: Unknown property is rejected

- **GIVEN** a create request carries a property outside the contract
- **WHEN** the shared schema validates the body
- **THEN** the request is rejected

### Requirement: Shared Invoice Update Contract

The shared contracts SHALL define a validated invoice update request body for editable fields, rejecting any property outside the contract and any attempt to mutate snapshot totals or the `roundingStepMinutes` snapshot directly.

#### Scenario: Update request uses shared schema

- **GIVEN** an admin or PM updates an invoice
- **WHEN** the request body is validated
- **THEN** only editable fields defined by the contract are accepted

#### Scenario: Snapshot totals are not directly mutable

- **GIVEN** an update request attempts to set `total_hours`, `total_amount`, or `roundingStepMinutes`
- **WHEN** the shared schema validates the body
- **THEN** the request is rejected

### Requirement: Shared Invoice Response Contract

The shared contracts SHALL define stable invoice list and detail response shapes that include snapshot fields, status, billing date range, optional project summary, the non-null `roundingStepMinutes` snapshot, and the count of linked time entries. The detail response additionally includes the full array of linked time-entry summaries. Each time-entry summary SHALL include both the original raw `durationSeconds` and a `roundedDurationSeconds` positive integer computed with the invoice's `roundingStepMinutes` snapshot, so consumers can display the rounded billed duration per entry without recomputing it.

#### Scenario: Invoice list response uses shared schema

- **GIVEN** the backend returns a list of invoices
- **WHEN** frontend code consumes the response
- **THEN** the payload matches the shared invoice list response contract
- **AND** includes pagination metadata
- **AND** each item includes snapshot fields, the non-null `roundingStepMinutes`, status, billing date range, optional project summary, and `timeEntryCount`
- **AND** list items do NOT include the `timeEntries` array

#### Scenario: Invoice detail response uses shared schema

- **GIVEN** the backend returns a single invoice
- **WHEN** frontend code consumes the response
- **THEN** the payload matches the shared invoice detail response contract
- **AND** includes snapshot `hourlyRate`, `currency`, `totalHours`, `totalAmount`, and the non-null `roundingStepMinutes`
- **AND** includes the linked time entries as an array of summaries
- **AND** each entry summary includes `durationSeconds` (raw) and `roundedDurationSeconds` (ceiling-rounded with the invoice snapshot step)

### Requirement: Shared Eligible Entries Query Contract

The shared contracts SHALL define a validated eligible-entries query with a required date range, optional project id, and an optional `roundingStepMinutes` positive integer (1–60), rejecting any property outside the contract and any reversed date bounds.

#### Scenario: Eligible entries query uses shared schema

- **GIVEN** an admin or PM previews eligible entries
- **WHEN** the query parameters are validated
- **THEN** `dateFrom` and `dateTo` are required, `projectId` is optional, and `roundingStepMinutes` is an optional integer between 1 and 60
- **AND** `dateTo` earlier than `dateFrom` is rejected

#### Scenario: Unknown query property is rejected

- **GIVEN** an eligible-entries query carries a property outside the contract
- **WHEN** the shared schema validates the query
- **THEN** the request is rejected

### Requirement: Shared Eligible Entries Response Contract

The shared contracts SHALL define a stable eligible-entries response shape that includes a count, computed total hours, an array of time-entry summaries with user and task names, the workspace default hourly rate and currency, and the effective default `defaultRoundingStepMinutes` (always a non-null integer). Each entry summary SHALL include both the original raw `durationSeconds` and a `roundedDurationSeconds` positive integer computed with the effective rounding step.

#### Scenario: Eligible entries response uses shared schema

- **GIVEN** the backend returns eligible time entries
- **WHEN** frontend code consumes the response
- **THEN** the payload matches the shared eligible-entries response contract
- **AND** includes `count`, `totalHours`, `entries`, `defaultHourlyRate`, `defaultCurrency`, and the non-null `defaultRoundingStepMinutes`
- **AND** each entry includes `userName` and `taskName` for display
- **AND** each entry includes `durationSeconds` (raw) and `roundedDurationSeconds` (ceiling-rounded with the effective step)