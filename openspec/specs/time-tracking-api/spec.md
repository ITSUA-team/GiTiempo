# time-tracking-api Specification

## Purpose
TBD - created by archiving change add-time-entries-and-timers-api. Update Purpose after archive.
## Requirements
### Requirement: Own Time Entries Can Be Listed And Filtered
The backend MUST allow authenticated workspace members to list only their own time entries with shared pagination and time-entry filters, including task-title search.

#### Scenario: User lists own time entries
- **GIVEN** an authenticated workspace member has time entries
- **WHEN** the member lists time entries
- **THEN** the backend returns only entries owned by that member in the current workspace
- **AND** each entry includes core time-entry fields and task/project display context

#### Scenario: User filters own entries by started-at range
- **GIVEN** an authenticated workspace member has entries across multiple days
- **WHEN** the member supplies `dateFrom` and `dateTo`
- **THEN** the backend returns entries whose `startedAt` is greater than or equal to `dateFrom`
- **AND** whose `startedAt` is less than `dateTo`

#### Scenario: User filters own entries by project and task
- **GIVEN** an authenticated workspace member has entries across multiple tasks and projects
- **WHEN** the member supplies `projectId` or `taskId`
- **THEN** the backend returns only owned entries matching those filters

#### Scenario: User filters own entries by partial task title search
- **GIVEN** an authenticated workspace member has own time entries across tasks with different titles
- **WHEN** the member supplies `search` with part of a task title
- **THEN** the backend returns only owned entries whose task title contains that text
- **AND** the match is case-insensitive

#### Scenario: Own entry search composes with existing filters
- **GIVEN** an authenticated workspace member has own time entries across multiple dates, projects, and tasks
- **WHEN** the member supplies `search` together with date, project, or task filters
- **THEN** the backend returns only owned entries matching all supplied filters

#### Scenario: Own entry search updates pagination metadata
- **GIVEN** an authenticated workspace member has more own time entries than the requested page limit
- **WHEN** the member lists entries with `search`, `page`, and `limit`
- **THEN** the backend paginates the filtered result set
- **AND** the response metadata total and total pages reflect the filtered result set

#### Scenario: User cannot list another user's own-entry collection
- **GIVEN** an authenticated workspace member has no ownership of another user's entries
- **WHEN** the member lists own time entries
- **THEN** the backend excludes the other user's entries from the response

### Requirement: Manual Time Entries Can Be Created
The backend MUST allow authenticated workspace members to create completed manual time entries against visible active tasks.

#### Scenario: User creates a valid manual entry
- **GIVEN** an authenticated workspace member has visibility to an active task in an active project
- **WHEN** the member creates a manual entry with valid start and end times
- **THEN** the backend stores a completed time entry owned by that member
- **AND** the entry source is `manual`
- **AND** the duration is computed from the submitted interval

#### Scenario: User creates manual entry for public project task
- **GIVEN** an authenticated workspace member is not assigned to a project
- **AND** the project is public and active
- **AND** the task is active
- **WHEN** the member creates a manual entry for that task
- **THEN** the backend stores a completed time entry owned by that member

#### Scenario: Manual entry requires end after start
- **GIVEN** an authenticated workspace member submits a manual entry
- **WHEN** `endedAt` is not later than `startedAt`
- **THEN** the backend rejects the request as invalid

#### Scenario: Manual entry cannot target invisible private task
- **GIVEN** an authenticated workspace member lacks visibility to a private task's project
- **WHEN** the member attempts to create a manual entry for that task
- **THEN** the backend responds with 404 Not Found

#### Scenario: Manual entry cannot target inactive work
- **GIVEN** a task or its parent project is inactive
- **WHEN** an authenticated member attempts to create a manual entry for that task
- **THEN** the backend rejects the request with 422 Unprocessable Entity

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

### Requirement: Current Running Timer Can Be Retrieved
The backend MUST expose the authenticated user's current running timer state.

#### Scenario: User has a running timer
- **GIVEN** an authenticated user has one running time entry
- **WHEN** the user requests the current timer
- **THEN** the backend returns that running entry

#### Scenario: User has no running timer
- **GIVEN** an authenticated user has no running time entry
- **WHEN** the user requests the current timer
- **THEN** the backend returns an explicit empty current-timer response

### Requirement: Timer Can Be Started Against Existing Task
The backend MUST allow an authenticated workspace member to start one running timer against a visible active task.

#### Scenario: User starts timer with no active timer
- **GIVEN** an authenticated user has no running timer
- **AND** the user has visibility to an active task in an active project
- **WHEN** the user starts a timer for that task
- **THEN** the backend creates a running time entry owned by that user
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

### Requirement: Running Timer Can Be Stopped
The backend MUST allow an authenticated user to stop their current running timer and convert it into a completed time entry.

#### Scenario: User stops running timer
- **GIVEN** an authenticated user has a running timer
- **WHEN** the user stops the timer
- **THEN** the backend sets the entry end time
- **AND** computes the stored duration
- **AND** returns the completed entry

#### Scenario: User stops with no running timer
- **GIVEN** an authenticated user has no running timer
- **WHEN** the user attempts to stop a timer
- **THEN** the backend responds with 404 Not Found

### Requirement: Chrome Extension Can Start Timer From GitHub Issue
The backend MUST provide a Chrome Extension-facing endpoint that starts a timer from GitHub issue data and lazily creates local project/task records when necessary.

#### Scenario: Extension starts timer for new GitHub issue
- **GIVEN** an authenticated user has no running timer
- **AND** no local project/task mapping exists for the submitted GitHub issue
- **WHEN** the extension submits GitHub repository, issue number, and issue title
- **THEN** the backend creates a provider-neutral project and task
- **AND** stores GitHub provider references outside the core project and task rows
- **AND** creates a running time entry with source `extension`

#### Scenario: Extension reuses existing GitHub issue mapping
- **GIVEN** local provider references already map the submitted GitHub issue to a task
- **WHEN** the extension starts a timer for that issue
- **THEN** the backend reuses the existing project and task records
- **AND** creates a running time entry for the authenticated user

#### Scenario: Extension start preserves non-admin visibility
- **GIVEN** an authenticated non-admin user starts a timer for a newly created GitHub project
- **WHEN** the backend creates the local project
- **THEN** the backend ensures the acting user has project visibility for that project

#### Scenario: Extension start validates local request shape only
- **GIVEN** the extension submits GitHub issue data
- **WHEN** the backend processes the request in this change
- **THEN** the backend validates the local request shape
- **AND** does not call GitHub APIs or require a connected GitHub account

### Requirement: Project Time Entries Can Be Listed Read Only
The backend MUST allow authenticated users to list time entries for visible projects without allowing mutation of other users' entries, including task-title search within the visible project list.

#### Scenario: Admin lists project time entries
- **GIVEN** an authenticated admin belongs to the workspace
- **WHEN** the admin lists time entries for a project in that workspace
- **THEN** the backend returns entries for that project regardless of entry owner

#### Scenario: Non-admin lists active public project time entries
- **GIVEN** an authenticated PM or member belongs to the workspace
- **AND** the project is public and active
- **WHEN** the user lists time entries for that project
- **THEN** the backend returns entries for that project regardless of entry owner

#### Scenario: Assigned user lists active private project time entries
- **GIVEN** an authenticated PM or member is assigned to an active private project
- **WHEN** the user lists time entries for that project
- **THEN** the backend returns entries for that project regardless of entry owner

#### Scenario: User filters visible project time entries by partial task title search
- **GIVEN** an authenticated user can view a project's time entries
- **AND** the project has entries across tasks with different titles
- **WHEN** the user supplies `search` with part of a task title
- **THEN** the backend returns only project entries whose task title contains that text
- **AND** the match is case-insensitive
- **AND** project visibility rules remain unchanged

#### Scenario: Unassigned user cannot list private project time entries
- **GIVEN** an authenticated PM or member is not assigned to a private project
- **WHEN** the user attempts to list time entries for that project
- **THEN** the backend responds with 404 Not Found

#### Scenario: Project time-entry list is read only
- **GIVEN** an authenticated user can view another user's time entry through a project list
- **WHEN** the authenticated user attempts to update or delete that other user's entry through own-entry endpoints
- **THEN** the backend responds with 404 Not Found
