## ADDED Requirements

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
