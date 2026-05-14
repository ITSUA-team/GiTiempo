## ADDED Requirements

### Requirement: Visible Unused Tasks Can Be Deleted
The system MUST allow authenticated workspace members to permanently delete a task only when the requester has visibility to the task's project and the task has no related time entries.

#### Scenario: Visible unused task is deleted
- **GIVEN** the requester has visibility to a task's project
- **AND** the task has no related time entries
- **WHEN** the requester deletes the task by id
- **THEN** the system removes the task
- **AND** the system responds with 204 No Content

#### Scenario: Task with completed time entries cannot be deleted
- **GIVEN** the requester has visibility to a task's project
- **AND** the task has at least one completed time entry
- **WHEN** the requester deletes the task by id
- **THEN** the system responds with 409 Conflict
- **AND** the task remains available through task read APIs

#### Scenario: Task with running time entries cannot be deleted
- **GIVEN** the requester has visibility to a task's project
- **AND** the task has at least one running time entry
- **WHEN** the requester deletes the task by id
- **THEN** the system responds with 409 Conflict
- **AND** the running time entry remains unchanged

#### Scenario: Invisible task cannot be deleted
- **GIVEN** the requester does not have visibility to a task's project
- **WHEN** the requester deletes the task by id
- **THEN** the system responds with 404 Not Found
- **AND** the task remains unchanged

#### Scenario: External refs are removed with deleted unused task
- **GIVEN** the requester has visibility to a task's project
- **AND** the task has provider external references
- **AND** the task has no related time entries
- **WHEN** the requester deletes the task by id
- **THEN** the system removes the task
- **AND** the system removes the task's provider external references

#### Scenario: Task delete does not expose eligibility metadata
- **GIVEN** a task may or may not have related time entries
- **WHEN** the task is returned from list or read APIs
- **THEN** the response excludes delete-eligibility fields such as `canDelete` or `hasTimeEntries`
