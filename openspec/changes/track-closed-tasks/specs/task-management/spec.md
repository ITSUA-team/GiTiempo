## MODIFIED Requirements

### Requirement: Visible Members Can Read And Update Tasks

The system MUST allow any active workspace member with project visibility to read and update tasks for that project.

#### Scenario: Assigned member reads task

- **GIVEN** the requester is assigned to the task's active project
- **WHEN** the requester reads the task by id
- **THEN** the system returns the task details

#### Scenario: Assigned member updates task

- **GIVEN** the requester is assigned to the task's active project
- **WHEN** the requester updates valid mutable task fields
- **THEN** the system applies the update

#### Scenario: Closing a task stops running time entries

- **GIVEN** the requester has visibility to a task's active project
- **AND** one or more users have running time entries for that task
- **WHEN** the requester updates the task status to `closed`
- **THEN** the system closes those running time entries
- **AND** each closed entry receives an end time and positive stored duration
- **AND** future current-timer lookups no longer return those entries as running

#### Scenario: Task cannot be updated in inactive project

- **GIVEN** a task belongs to an inactive project
- **WHEN** a requester attempts to update the task
- **THEN** the system responds with 422 Unprocessable Entity

#### Scenario: Unassigned member cannot read task

- **GIVEN** the requester is not assigned to the task's project
- **WHEN** the requester attempts to read the task by id
- **THEN** the system responds with 404 Not Found

#### Scenario: Unassigned member cannot update task

- **GIVEN** the requester is not assigned to the task's project
- **WHEN** the requester attempts to update the task
- **THEN** the system responds with 404 Not Found

### Requirement: Visible Active Tasks Can Receive Time Tracking

The system MUST allow time tracking only against tasks that the requester can see and that remain active and open under an active project.

#### Scenario: Visible active task accepts time tracking

- **GIVEN** the requester has visibility to an active open task in an active project
- **WHEN** the requester creates a manual entry or starts a timer for that task
- **THEN** the system accepts the task as a valid tracking target

#### Scenario: Invisible task cannot receive time tracking

- **GIVEN** the requester lacks visibility to a task's project
- **WHEN** the requester creates a manual entry or starts a timer for that task
- **THEN** the system responds with 404 Not Found

#### Scenario: Inactive task cannot receive time tracking

- **GIVEN** a task is inactive
- **WHEN** a requester creates a manual entry or starts a timer for that task
- **THEN** the system responds with 422 Unprocessable Entity

#### Scenario: Closed task cannot receive time tracking

- **GIVEN** a task is closed
- **WHEN** a requester creates a manual entry or starts a timer for that task
- **THEN** the system responds with 422 Unprocessable Entity

#### Scenario: Task in inactive project cannot receive time tracking

- **GIVEN** a task belongs to an inactive project
- **WHEN** a requester creates a manual entry or starts a timer for that task
- **THEN** the system responds with 422 Unprocessable Entity
