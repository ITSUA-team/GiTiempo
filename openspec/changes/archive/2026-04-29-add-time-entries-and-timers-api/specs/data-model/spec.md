## ADDED Requirements

### Requirement: Time Entry Records Are Stored
The backend data model MUST store task-linked time entries as workspace-owned records associated with the user who tracked the time.

#### Scenario: Completed time entry is stored
- **GIVEN** a completed time entry is created
- **WHEN** the backend stores the entry
- **THEN** the row references the workspace, task, and user
- **AND** stores start time, end time, duration seconds, description, billable state, source, and timestamps

#### Scenario: Running time entry is stored
- **GIVEN** a timer is started
- **WHEN** the backend stores the entry
- **THEN** the row references the workspace, task, and user
- **AND** stores the start time
- **AND** leaves end time and duration empty while the timer is running

#### Scenario: Time entry source is constrained
- **GIVEN** a time entry is stored
- **WHEN** the backend records the entry source
- **THEN** the source is one of `web`, `extension`, or `manual`

#### Scenario: Invoice linkage is deferred
- **GIVEN** time-entry persistence is introduced before invoices
- **WHEN** the backend stores a time entry in this change
- **THEN** the row does not require invoice linkage

### Requirement: Time Entry Duration Invariants
The backend data model MUST keep completed and running time-entry duration state internally consistent.

#### Scenario: Running entry has no duration
- **GIVEN** a time entry is running
- **WHEN** the row is stored
- **THEN** `ended_at` is empty
- **AND** `duration_seconds` is empty

#### Scenario: Completed entry has positive duration
- **GIVEN** a time entry is completed
- **WHEN** the row is stored
- **THEN** `ended_at` is later than `started_at`
- **AND** `duration_seconds` is a positive integer

#### Scenario: Invalid duration state is rejected
- **GIVEN** a write would store inconsistent end time and duration state
- **WHEN** the backend attempts to persist the row
- **THEN** the database prevents the invalid time-entry state

## MODIFIED Requirements

### Requirement: One Running Timer Per User

The system MUST prevent a user from having multiple running timers at the same time, including under concurrent timer-start requests.

#### Scenario: Start a timer when no timer is running

- GIVEN a user has no running time entry
- WHEN the user starts a timer
- THEN the backend creates one running time entry for that user

#### Scenario: Start a second timer while one is active

- GIVEN a user already has a running time entry
- WHEN the user attempts to start another timer
- THEN the backend rejects or prevents creation of a second concurrent running time entry

#### Scenario: Concurrent timer starts are constrained by storage

- GIVEN two requests attempt to start timers for the same user at the same time
- WHEN both requests reach persistence
- THEN at most one running time entry is stored for that user
