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

### Requirement: Task Responses Are Provider Neutral

The system MUST expose task responses without provider-specific integration fields in the initial task API.

#### Scenario: Task response excludes external provider fields

- **GIVEN** a task may have provider-specific external references
- **WHEN** the task is returned from the project/task API
- **THEN** the response includes core task fields
- **AND** the response does not expose provider-specific external reference fields

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

### Requirement: Task Default Billable Inherits From Project
The system MUST assign each new task a default billable value for future time entries, using the parent project's default when the create request does not explicitly choose a task default.

#### Scenario: Task inherits project default when omitted
- **GIVEN** the requester can create tasks in a project
- **AND** the project has `defaultBillableForTasks: false`
- **WHEN** the requester creates a task without `defaultBillableForTimeEntries`
- **THEN** the system creates the task with `defaultBillableForTimeEntries: false`
- **AND** subsequent task reads return `false`

#### Scenario: Task create can override inherited default
- **GIVEN** the requester can create tasks in a project
- **AND** the project has `defaultBillableForTasks: false`
- **WHEN** the requester creates a task with `defaultBillableForTimeEntries: true`
- **THEN** the system creates the task with `defaultBillableForTimeEntries: true`
- **AND** subsequent task reads return `true`

#### Scenario: Task response includes default billable for time entries
- **GIVEN** a requester can read a task
- **WHEN** the requester reads the task through list or detail APIs
- **THEN** the response includes the task's `defaultBillableForTimeEntries` value

### Requirement: Task Default Billable Controls Future Time Entries
The system MUST allow permitted task editors to persist a default billable value that new time entries inherit when no entry-level billable value is explicitly provided.

#### Scenario: Task default update saves future default only
- **GIVEN** the requester has permission to update a task
- **AND** the task has existing time entries
- **WHEN** the requester updates only `defaultBillableForTimeEntries`
- **THEN** the system stores the new task default
- **AND** subsequent task reads return the new default
- **AND** existing time-entry billable values remain unchanged until a task backfill is explicitly requested

#### Scenario: Task backfill updates existing time entries
- **GIVEN** the requester has permission to update a task
- **AND** the task has existing time entries
- **AND** the task has a saved `defaultBillableForTimeEntries` value
- **WHEN** the requester asks to update existing time entries for that task
- **THEN** the system sets each linked time entry's `isBillable` value to the task's saved default value
- **AND** the response reports the number of time entries updated

#### Scenario: Task backfill requires update permission
- **GIVEN** the requester cannot update the task under existing task update policy
- **WHEN** the requester asks to backfill the task's billable default
- **THEN** the system rejects the request without changing time entries
