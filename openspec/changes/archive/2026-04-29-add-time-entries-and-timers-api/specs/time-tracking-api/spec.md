## ADDED Requirements

### Requirement: Own Time Entries Can Be Listed And Filtered
The backend MUST allow authenticated workspace members to list only their own time entries with shared pagination and time-entry filters.

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

#### Scenario: Manual entry requires end after start
- **GIVEN** an authenticated workspace member submits a manual entry
- **WHEN** `endedAt` is not later than `startedAt`
- **THEN** the backend rejects the request as invalid

#### Scenario: Manual entry cannot target invisible task
- **GIVEN** an authenticated workspace member lacks visibility to a task's project
- **WHEN** the member attempts to create a manual entry for that task
- **THEN** the backend responds with 404 Not Found

#### Scenario: Manual entry cannot target inactive work
- **GIVEN** a task or its parent project is inactive
- **WHEN** an authenticated member attempts to create a manual entry for that task
- **THEN** the backend rejects the request with 422 Unprocessable Entity

### Requirement: Own Completed Time Entries Can Be Read Updated And Deleted
The backend MUST allow authenticated users to read, update, and delete their own completed time entries while preventing mutation of running entries.

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

#### Scenario: User cannot update a running entry
- **GIVEN** an authenticated user owns a running time entry
- **WHEN** the user attempts to update it through the own-entry endpoint
- **THEN** the backend rejects the request and instructs the user to stop the timer first

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

#### Scenario: User cannot start second timer
- **GIVEN** an authenticated user already has a running timer
- **WHEN** the user attempts to start another timer
- **THEN** the backend rejects the request with 409 Conflict

#### Scenario: User cannot start timer for invisible task
- **GIVEN** an authenticated user lacks visibility to a task's project
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
The backend MUST allow authenticated users to list time entries for visible projects without allowing mutation of other users' entries.

#### Scenario: Admin lists project time entries
- **GIVEN** an authenticated admin belongs to the workspace
- **WHEN** the admin lists time entries for a project in that workspace
- **THEN** the backend returns entries for that project regardless of entry owner

#### Scenario: Assigned user lists active project time entries
- **GIVEN** an authenticated PM or member is assigned to an active project
- **WHEN** the user lists time entries for that project
- **THEN** the backend returns entries for that project regardless of entry owner

#### Scenario: Unassigned user cannot list project time entries
- **GIVEN** an authenticated PM or member is not assigned to a project
- **WHEN** the user attempts to list time entries for that project
- **THEN** the backend responds with 404 Not Found

#### Scenario: Project time-entry list is read only
- **GIVEN** an authenticated user can view another user's time entry through a project list
- **WHEN** the authenticated user attempts to update or delete that other user's entry through own-entry endpoints
- **THEN** the backend responds with 404 Not Found
