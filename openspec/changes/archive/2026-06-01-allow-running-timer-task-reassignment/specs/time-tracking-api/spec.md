## MODIFIED Requirements

### Requirement: Own Completed Time Entries Can Be Read Updated And Deleted
The backend MUST allow authenticated users to read, update, and delete their own completed time entries, including moving completed entries to another visible active task. The backend MUST also allow task-only reassignment for the authenticated user's own running time entry, while preventing other mutation of running entries until the timer is stopped. Task-only reassignment through the own-entry update endpoint MUST remain valid for the same owned entry if it stops before the update request is processed.

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

#### Scenario: User moves running entry to a visible active task
- **GIVEN** an authenticated user owns a running time entry
- **AND** the user has visibility to another active task in an active project
- **WHEN** the user updates the running entry with only that task identifier
- **THEN** the backend applies the task change without stopping the timer
- **AND** the response includes the new task and project display context
- **AND** the entry remains running with no ended time or stored duration

#### Scenario: User moves an entry after it stops during reassignment
- **GIVEN** an authenticated user owns a running time entry
- **AND** the time entry is stopped before a task-only update request is processed
- **AND** the user has visibility to another active task in an active project
- **WHEN** the user updates that now-completed entry with only that task identifier
- **THEN** the backend applies the task change
- **AND** the response includes the new task and project display context
- **AND** the entry remains completed with its ended time and stored duration unchanged

#### Scenario: User cannot move running entry to invisible private task
- **GIVEN** an authenticated user owns a running time entry
- **AND** the user lacks visibility to a private task's project
- **WHEN** the user attempts to update the running entry with only that task identifier
- **THEN** the backend responds with 404 Not Found
- **AND** the original running entry task remains unchanged

#### Scenario: User cannot move running entry to inactive work
- **GIVEN** an authenticated user owns a running time entry
- **AND** the requested task or its parent project is inactive
- **WHEN** the user attempts to update the running entry with only that task identifier
- **THEN** the backend rejects the request with 422 Unprocessable Entity
- **AND** the original running entry task remains unchanged

#### Scenario: User cannot update non-task fields on a running entry
- **GIVEN** an authenticated user owns a running time entry
- **WHEN** the user attempts to update description, start time, end time, or billable state through the own-entry endpoint
- **THEN** the backend rejects the request and instructs the user to stop the timer first

#### Scenario: User cannot submit mixed running entry updates
- **GIVEN** an authenticated user owns a running time entry
- **WHEN** the user attempts to update both the task identifier and any completed-entry field
- **THEN** the backend rejects the request without applying the task change
- **AND** the response instructs the user to stop the timer first

#### Scenario: User deletes completed entry
- **GIVEN** an authenticated user owns a completed time entry
- **WHEN** the user deletes the entry
- **THEN** the backend removes the entry

#### Scenario: User cannot delete a running entry
- **GIVEN** an authenticated user owns a running time entry
- **WHEN** the user attempts to delete it
- **THEN** the backend rejects the request and instructs the user to stop the timer first
