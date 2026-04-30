# Task Management Specification

## Purpose

Define task visibility, creation, read, update, and provider-neutral response behavior for workspace projects.
## Requirements
### Requirement: Visible Project Tasks Can Be Listed

The system MUST list tasks only when the requester has visibility to the task's project.

#### Scenario: Admin lists tasks for project

- **GIVEN** the requester is an admin member of the workspace
- **WHEN** the requester lists tasks for a project in that workspace
- **THEN** the system returns tasks for that project

#### Scenario: Assigned non-admin lists active project tasks

- **GIVEN** the requester is a `pm` or `member` assigned to an active project
- **WHEN** the requester lists tasks for that project
- **THEN** the system returns tasks for that project

#### Scenario: Unassigned non-admin cannot list project tasks

- **GIVEN** the requester is a `pm` or `member` not assigned to a project
- **WHEN** the requester attempts to list tasks for that project
- **THEN** the system responds with 404 Not Found

### Requirement: Visible Members Can Create Tasks In Active Projects

The system MUST allow any active workspace member with project visibility to create provider-neutral tasks in active projects.

#### Scenario: Assigned member creates task

- **GIVEN** the requester is assigned to an active project
- **WHEN** the requester creates a task with valid task fields in that project
- **THEN** the system creates a provider-neutral task in the requester's workspace
- **AND** the task belongs to the target project

#### Scenario: Unassigned member cannot create task

- **GIVEN** the requester is not assigned to a project
- **WHEN** the requester attempts to create a task in that project
- **THEN** the system responds with 404 Not Found

#### Scenario: Task cannot be created in inactive project

- **GIVEN** a project is inactive
- **WHEN** a requester attempts to create a task in that project
- **THEN** the system responds with 422 Unprocessable Entity

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

### Requirement: Task Responses Are Provider Neutral

The system MUST expose task responses without provider-specific integration fields in the initial task API.

#### Scenario: Task response excludes external provider fields

- **GIVEN** a task may have provider-specific external references
- **WHEN** the task is returned from the project/task API
- **THEN** the response includes core task fields
- **AND** the response does not expose provider-specific external reference fields

### Requirement: Visible Active Tasks Can Receive Time Tracking
The system MUST allow time tracking only against tasks that the requester can see and that remain active under an active project.

#### Scenario: Visible active task accepts time tracking
- **GIVEN** the requester has visibility to an active task in an active project
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

#### Scenario: Task in inactive project cannot receive time tracking
- **GIVEN** a task belongs to an inactive project
- **WHEN** a requester creates a manual entry or starts a timer for that task
- **THEN** the system responds with 422 Unprocessable Entity

