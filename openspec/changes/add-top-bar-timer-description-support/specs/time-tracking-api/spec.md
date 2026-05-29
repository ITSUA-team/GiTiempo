## MODIFIED Requirements

### Requirement: Own Completed Time Entries Can Be Read Updated And Deleted
The backend MUST allow authenticated users to read, update, and delete their own completed time entries, including moving completed entries to another visible active task, and MUST allow limited task and description updates to their own running time entry while preventing running-entry interval, billable, and delete mutations.

#### Scenario: User reads own entry
- **GIVEN** an authenticated user owns a time entry
- **WHEN** the user requests that entry by id
- **THEN** the backend returns the entry details

#### Scenario: User cannot read another user's entry through own endpoint
- **GIVEN** an authenticated user does not own a time entry
- **WHEN** the user requests that entry by id through the own-entry endpoint
- **THEN** the backend responds with 404 Not Found

#### Scenario: User updates completed entry fields
- **GIVEN** an authenticated user owns a completed time entry
- **WHEN** the user updates description, start time, end time, or billable state
- **THEN** the backend applies the update
- **AND** recomputes the stored duration from the updated interval

#### Scenario: User moves completed entry to a visible active task

- **GIVEN** an authenticated user owns a completed time entry
- **AND** the user has visibility to another active task in an active project
- **WHEN** the user updates the entry with that task identifier
- **THEN** the backend applies the task change
- **AND** the response includes the new task and project display context
- **AND** the stored duration remains internally consistent with the entry interval

#### Scenario: User cannot move completed entry to invisible private task

- **GIVEN** an authenticated user owns a completed time entry
- **AND** the user lacks visibility to a private task's project
- **WHEN** the user attempts to update the entry with that task identifier
- **THEN** the backend responds with 404 Not Found
- **AND** the original entry task remains unchanged

#### Scenario: User cannot move completed entry to inactive work

- **GIVEN** an authenticated user owns a completed time entry
- **AND** the requested task or its parent project is inactive
- **WHEN** the user attempts to update the entry with that task identifier
- **THEN** the backend rejects the request with 422 Unprocessable Entity
- **AND** the original entry task remains unchanged

#### Scenario: User updates running entry task and description
- **GIVEN** an authenticated user owns a running time entry
- **AND** the user has visibility to another active task in an active project
- **WHEN** the user updates the running entry with `taskId` and `description`
- **THEN** the backend applies the task and description changes without stopping the timer
- **AND** the response includes the new task and project display context
- **AND** the entry remains running with empty end time and duration

#### Scenario: User clears running entry description
- **GIVEN** an authenticated user owns a running time entry with a description
- **WHEN** the user updates the running entry with `description: null`
- **THEN** the backend clears the description without stopping the timer

#### Scenario: User cannot update running entry interval or billable fields
- **GIVEN** an authenticated user owns a running time entry
- **WHEN** the user attempts to update `startedAt`, `endedAt`, or `isBillable`
- **THEN** the backend rejects the request and instructs the user to stop the timer first
- **AND** the running entry remains unchanged

#### Scenario: User cannot move running entry to invisible private task
- **GIVEN** an authenticated user owns a running time entry
- **AND** the user lacks visibility to a private task's project
- **WHEN** the user attempts to update the running entry with that task identifier
- **THEN** the backend responds with 404 Not Found
- **AND** the original running entry task remains unchanged

#### Scenario: User cannot move running entry to inactive work
- **GIVEN** an authenticated user owns a running time entry
- **AND** the requested task or its parent project is inactive
- **WHEN** the user attempts to update the running entry with that task identifier
- **THEN** the backend rejects the request with 422 Unprocessable Entity
- **AND** the original running entry task remains unchanged

#### Scenario: User deletes completed entry
- **GIVEN** an authenticated user owns a completed time entry
- **WHEN** the user deletes the entry
- **THEN** the backend removes the entry

#### Scenario: User cannot delete a running entry
- **GIVEN** an authenticated user owns a running time entry
- **WHEN** the user attempts to delete it
- **THEN** the backend rejects the request and instructs the user to stop the timer first

### Requirement: Timer Can Be Started Against Existing Task
The backend MUST allow an authenticated workspace member to start one running timer against a visible active task and optionally store a time-entry description on that running timer.

#### Scenario: User starts timer with no active timer
- **GIVEN** an authenticated user has no running timer
- **AND** the user has visibility to an active task in an active project
- **WHEN** the user starts a timer for that task
- **THEN** the backend creates a running time entry owned by that user
- **AND** the entry source is `web`

#### Scenario: User starts timer with description
- **GIVEN** an authenticated user has no running timer
- **AND** the user has visibility to an active task in an active project
- **WHEN** the user starts a timer for that task with a valid `description`
- **THEN** the backend creates a running time entry owned by that user
- **AND** stores the submitted description on the entry
- **AND** the entry source is `web`

#### Scenario: User starts timer for public project task
- **GIVEN** an authenticated user has no running timer
- **AND** the user is not assigned to a project
- **AND** the project is public and active
- **AND** the task is active
- **WHEN** the user starts a timer for that task
- **THEN** the backend creates a running time entry owned by that user

#### Scenario: User cannot start second timer
- **GIVEN** an authenticated user already has a running timer
- **WHEN** the user attempts to start another timer
- **THEN** the backend rejects the request with 409 Conflict

#### Scenario: User cannot start timer for invisible private task
- **GIVEN** an authenticated user lacks visibility to a private task's project
- **WHEN** the user attempts to start a timer for that task
- **THEN** the backend responds with 404 Not Found

#### Scenario: User cannot start timer for inactive work
- **GIVEN** a task or its parent project is inactive
- **WHEN** an authenticated user attempts to start a timer for that task
- **THEN** the backend rejects the request with 422 Unprocessable Entity
