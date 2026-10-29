## MODIFIED Requirements

### Requirement: Visible Project Tasks Can Be Listed

The system MUST list tasks only when the requester has visibility to the task's project.
 Own-time readers of external projects MUST receive only tasks containing their own entries, including running entries. The rule applies to filters, search, pagination and direct task reads; project visibility alone is insufficient.

#### Scenario: Admin lists tasks for project
- **GIVEN** the requester is evaluated under existing full-project access rather than derived own-time access
- **AND** the requester is an admin member of the workspace
- **WHEN** the requester lists tasks for a project in that workspace
- **THEN** the system returns tasks for that project


#### Scenario: Assigned non-admin lists active project tasks
- **GIVEN** the requester is evaluated under existing full-project access rather than derived own-time access
- **AND** the requester is a `pm` or `member` assigned to an active project
- **WHEN** the requester lists tasks for that project
- **THEN** the system returns tasks for that project


#### Scenario: Unassigned non-admin cannot list project tasks
- **GIVEN** the requester is evaluated under existing full-project access rather than derived own-time access
- **AND** the requester is a `pm` or `member` not assigned to a project
- **WHEN** the requester attempts to list tasks for that project
- **THEN** the system responds with 404 Not Found

#### Scenario: Own-time task list excludes untracked siblings
- **GIVEN** a member has own time on an external task but no separate project authorization
- **WHEN** the member lists or searches tasks in that project
- **THEN** only tasks containing their own entries are returned and pagination counts exclude hidden siblings


### Requirement: Visible Members Can Create Tasks In Active Projects

The system MUST allow any active workspace member with project visibility to create provider-neutral tasks in active projects, including explicit materialization of a selected GitHub issue inside a visible active GitHub-backed project.
 Derived own-time visibility MUST NOT authorize generic shared-task creation or provider import. Reference-start materialization is the explicit exception and must atomically record own time.

#### Scenario: Assigned member creates task
- **GIVEN** the requester is evaluated under existing full-project access rather than derived own-time access
- **AND** the requester is assigned to an active project
- **WHEN** the requester creates a task with valid task fields in that project
- **THEN** the system creates a provider-neutral task in the requester's workspace
- **AND** the task belongs to the target project


#### Scenario: Unassigned member cannot create task
- **GIVEN** the requester is evaluated under existing full-project access rather than derived own-time access
- **AND** the requester is not assigned to a project
- **WHEN** the requester attempts to create a task in that project
- **THEN** the system responds with 404 Not Found


#### Scenario: Task cannot be created in inactive project
- **GIVEN** the requester is evaluated under existing full-project access rather than derived own-time access
- **AND** a project is inactive
- **WHEN** a requester attempts to create a task in that project
- **THEN** the system responds with 422 Unprocessable Entity


#### Scenario: Visible member materializes a GitHub issue task
- **GIVEN** the requester is evaluated under existing full-project access rather than derived own-time access
- **AND** the requester can see an active local GitHub-backed project
- **AND** the request identifies an open GitHub issue by local `projectId` and `issueNumber`
- **WHEN** the requester asks to create or reuse a task for that issue
- **THEN** the system loads the authoritative issue from the mapped GitHub repository
- **AND** it creates or reuses one local task in that visible project for the issue
- **AND** the response uses the standard task response contract


#### Scenario: GitHub issue task inherits project billable default
- **GIVEN** the requester is evaluated under existing full-project access rather than derived own-time access
- **AND** the requester can see an active local GitHub-backed project
- **AND** that project has `defaultBillableForTasks: false`
- **WHEN** the requester materializes a GitHub issue task without any explicit task-default override
- **THEN** the created local task stores `defaultBillableForTimeEntries: false`


#### Scenario: Existing GitHub issue task is reused
- **GIVEN** the requester is evaluated under existing full-project access rather than derived own-time access
- **AND** a visible local task in the same workspace and project is already linked to the selected GitHub issue
- **WHEN** the requester materializes that issue again
- **THEN** the system reuses the existing task
- **AND** it does not create a duplicate local task for the same issue mapping


#### Scenario: Closed GitHub provider issue is rejected before local task creation
- **GIVEN** the requester is evaluated under existing full-project access rather than derived own-time access
- **AND** the requester can see an active local GitHub-backed project
- **AND** the mapped GitHub issue is now closed in the provider response
- **WHEN** the requester asks to create or reuse a task for that issue
- **THEN** the system rejects the request with a validation failure
- **AND** it does not create a new local task for that issue mapping


#### Scenario: GitHub issue task cannot be materialized in inactive work
- **GIVEN** the requester is evaluated under existing full-project access rather than derived own-time access
- **AND** the requester identifies a GitHub issue through a visible local project
- **AND** the project or resolved local task is inactive
- **WHEN** the requester asks to materialize the issue as a task
- **THEN** the system rejects the request with a validation failure


#### Scenario: Closed GitHub issue task cannot be used for tracking
- **GIVEN** the requester is evaluated under existing full-project access rather than derived own-time access
- **AND** the requester identifies a GitHub issue whose resolved local task is closed
- **WHEN** the requester asks to materialize the issue as a task
- **THEN** the system rejects the request with a validation failure

#### Scenario: Own-time access cannot create arbitrary shared tasks
- **GIVEN** a member has own time on an external task but no separate project authorization
- **WHEN** the member submits a generic task-create or provider-import request in that project
- **THEN** the request is denied without creating a task; first issue tracking remains available through atomic reference-start materialization


### Requirement: Visible Members Can Read And Update Tasks

The system MUST allow any active workspace member with project visibility to read and update tasks for that project.
 For external own-time access, read authorization SHALL be evaluated for the exact task; it MUST NOT confer shared-task update permission. Updates require separate existing management authority.

#### Scenario: Assigned member reads task
- **GIVEN** the requester is evaluated under existing full-project access rather than derived own-time access
- **AND** the requester is assigned to the task's active project
- **WHEN** the requester reads the task by id
- **THEN** the system returns the task details


#### Scenario: Assigned member updates task
- **GIVEN** the requester is evaluated under existing full-project access rather than derived own-time access
- **AND** the requester is assigned to the task's active project
- **WHEN** the requester updates valid mutable task fields
- **THEN** the system applies the update


#### Scenario: Closing a task stops running time entries
- **GIVEN** the requester is evaluated under existing full-project access rather than derived own-time access
- **AND** the requester has visibility to a task's active project
- **AND** one or more users have running time entries for that task
- **WHEN** the requester updates the task status to `closed`
- **THEN** the system closes those running time entries
- **AND** each closed entry receives an end time and positive stored duration
- **AND** future current-timer lookups no longer return those entries as running


#### Scenario: Task cannot be updated in inactive project
- **GIVEN** the requester is evaluated under existing full-project access rather than derived own-time access
- **AND** a task belongs to an inactive project
- **WHEN** a requester attempts to update the task
- **THEN** the system responds with 422 Unprocessable Entity


#### Scenario: Unassigned member cannot read task
- **GIVEN** the requester is evaluated under existing full-project access rather than derived own-time access
- **AND** the requester is not assigned to the task's project
- **WHEN** the requester attempts to read the task by id
- **THEN** the system responds with 404 Not Found


#### Scenario: Unassigned member cannot update task
- **GIVEN** the requester is evaluated under existing full-project access rather than derived own-time access
- **AND** the requester is not assigned to the task's project
- **WHEN** the requester attempts to update the task
- **THEN** the system responds with 404 Not Found

#### Scenario: Own-time task read does not authorize update
- **GIVEN** a member has own time on an external task but no separate project authorization
- **WHEN** the member reads an own-time task and then attempts to rename or close it
- **THEN** the read succeeds with scoped data but the update is denied and shared task state remains unchanged


### Requirement: Visible Unused Tasks Can Be Deleted

The system MUST allow authenticated workspace members to permanently delete a task only when the requester has visibility to the task's project and the task has no related time entries.
 Derived own-time access MUST NOT confer shared-task deletion authority. Existing no-related-time and explicit authorization rules remain mandatory.

#### Scenario: Visible unused task is deleted
- **GIVEN** the requester is evaluated under existing full-project access rather than derived own-time access
- **AND** the requester has visibility to a task's project
- **AND** the task has no related time entries
- **WHEN** the requester deletes the task by id
- **THEN** the system removes the task
- **AND** the system responds with 204 No Content


#### Scenario: Task with completed time entries cannot be deleted
- **GIVEN** the requester is evaluated under existing full-project access rather than derived own-time access
- **AND** the requester has visibility to a task's project
- **AND** the task has at least one completed time entry
- **WHEN** the requester deletes the task by id
- **THEN** the system responds with 409 Conflict
- **AND** the task remains available through task read APIs


#### Scenario: Task with running time entries cannot be deleted
- **GIVEN** the requester is evaluated under existing full-project access rather than derived own-time access
- **AND** the requester has visibility to a task's project
- **AND** the task has at least one running time entry
- **WHEN** the requester deletes the task by id
- **THEN** the system responds with 409 Conflict
- **AND** the running time entry remains unchanged


#### Scenario: Invisible task cannot be deleted
- **GIVEN** the requester is evaluated under existing full-project access rather than derived own-time access
- **AND** the requester does not have visibility to a task's project
- **WHEN** the requester deletes the task by id
- **THEN** the system responds with 404 Not Found
- **AND** the task remains unchanged


#### Scenario: External refs are removed with deleted unused task
- **GIVEN** the requester is evaluated under existing full-project access rather than derived own-time access
- **AND** the requester has visibility to a task's project
- **AND** the task has provider external references
- **AND** the task has no related time entries
- **WHEN** the requester deletes the task by id
- **THEN** the system removes the task
- **AND** the system removes the task's provider external references


#### Scenario: Task delete does not expose eligibility metadata
- **GIVEN** the requester is evaluated under existing full-project access rather than derived own-time access
- **AND** a task may or may not have related time entries
- **WHEN** the task is returned from list or read APIs
- **THEN** the response excludes delete-eligibility fields such as `canDelete` or `hasTimeEntries`

#### Scenario: Own-time access cannot delete a shared task
- **GIVEN** a member has own time on an external task but no separate project authorization
- **WHEN** the member attempts to delete an own-time task
- **THEN** the deletion is denied and the task and all related time entries remain unchanged


### Requirement: Visible Active Tasks Can Receive Time Tracking
The system MUST allow time tracking only against tasks that the requester can see and that remain active and open under an active project.
 The first external reference start MAY target a task not yet personally readable only through the atomic external-github-tracking workflow; saved-task and manual-entry operations require current task visibility. Active/open checks remain mandatory.

#### Scenario: Visible active task accepts time tracking
- **GIVEN** the requester is evaluated under existing full-project access rather than derived own-time access
- **AND** the requester has visibility to an active open task in an active project
- **WHEN** the requester creates a manual entry or starts a timer for that task
- **THEN** the system accepts the task as a valid tracking target


#### Scenario: Invisible task cannot receive time tracking
- **GIVEN** the requester is evaluated under existing full-project access rather than derived own-time access
- **AND** the requester lacks visibility to a task's project
- **WHEN** the requester creates a manual entry or starts a timer for that task
- **THEN** the system responds with 404 Not Found


#### Scenario: Inactive task cannot receive time tracking
- **GIVEN** the requester is evaluated under existing full-project access rather than derived own-time access
- **AND** a task is inactive
- **WHEN** a requester creates a manual entry or starts a timer for that task
- **THEN** the system responds with 422 Unprocessable Entity


#### Scenario: Closed task cannot receive time tracking
- **GIVEN** the requester is evaluated under existing full-project access rather than derived own-time access
- **AND** a task is closed
- **WHEN** a requester creates a manual entry or starts a timer for that task
- **THEN** the system responds with 422 Unprocessable Entity


#### Scenario: Task in inactive project cannot receive time tracking
- **GIVEN** the requester is evaluated under existing full-project access rather than derived own-time access
- **AND** a task belongs to an inactive project
- **WHEN** a requester creates a manual entry or starts a timer for that task
- **THEN** the system responds with 422 Unprocessable Entity

#### Scenario: Visible external task permits own repeat tracking
- **GIVEN** a member has own time on an external task but no separate project authorization
- **WHEN** the member starts a saved timer or creates a valid manual entry for that active open task under an active project
- **THEN** the existing timer/manual-entry rules permit recording own time without revealing or authorizing hidden sibling tasks
