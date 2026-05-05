## MODIFIED Requirements

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

### Requirement: Project Time Entries Can Be Listed Read Only

The backend MUST allow authenticated users to list time entries for visible projects without allowing mutation of other users' entries.

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

#### Scenario: Unassigned user cannot list private project time entries

- **GIVEN** an authenticated PM or member is not assigned to a private project
- **WHEN** the user attempts to list time entries for that project
- **THEN** the backend responds with 404 Not Found

#### Scenario: Project time-entry list is read only

- **GIVEN** an authenticated user can view another user's time entry through a project list
- **WHEN** the authenticated user attempts to update or delete that other user's entry through own-entry endpoints
- **THEN** the backend responds with 404 Not Found
