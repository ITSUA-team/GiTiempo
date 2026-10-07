## MODIFIED Requirements

### Requirement: Timer Can Be Started Against Existing Task
The backend MUST allow an authenticated workspace member to start one running timer against a visible active open task and optionally store a time-entry description on that running timer. For a saved GitHub-linked task, an ordinary member MUST additionally be explicitly assigned to the task's GiTiempo project, including when the project is public. This assignment requirement MUST apply independently of personal GitHub connection state and client entry point. Existing admin access and PM visibility-based access MUST remain unchanged. Tasks without a GitHub issue reference MUST retain the existing visibility-based start policy.

#### Scenario: User starts timer with no active timer
- **GIVEN** an authenticated user has no running timer
- **AND** the user has visibility to an active open task in an active project and satisfies the task's tracking authorization
- **WHEN** the user starts a timer for that task
- **THEN** the backend creates a running time entry owned by that user
- **AND** the entry source is `web`

#### Scenario: User starts timer with description
- **GIVEN** an authenticated user has no running timer
- **AND** the user has visibility to an active open task in an active project and satisfies the task's tracking authorization
- **WHEN** the user starts a timer for that task with a valid `description`
- **THEN** the backend creates a running time entry owned by that user
- **AND** stores the submitted description on the entry
- **AND** the entry source is `web`

#### Scenario: User starts timer for public project task
- **GIVEN** an authenticated user has no running timer
- **AND** the user is not assigned to a project
- **AND** the project is public and active
- **AND** the task is active and open and has no GitHub issue reference
- **WHEN** the user starts a timer for that task
- **THEN** the backend creates a running time entry owned by that user

#### Scenario: User cannot start second timer
- **GIVEN** an authenticated user already has a running timer
- **AND** the requested target otherwise satisfies tracking authorization
- **WHEN** the user attempts to start another timer
- **THEN** the backend rejects the request with 409 Conflict

#### Scenario: User cannot start timer for invisible private task
- **GIVEN** an authenticated user lacks visibility to a private task's project
- **WHEN** the user attempts to start a timer for that task
- **THEN** the backend responds with 404 Not Found

#### Scenario: User cannot start timer for inactive work
- **GIVEN** a task or its parent project is inactive
- **WHEN** an otherwise authorized member attempts to start a timer for that task
- **THEN** the backend rejects the request with 422 Unprocessable Entity

#### Scenario: User cannot start timer for closed task
- **GIVEN** an authenticated user has visibility and tracking authorization for a closed task
- **WHEN** the user attempts to start a timer for that task
- **THEN** the backend rejects the request with 422 Unprocessable Entity

## ADDED Requirements

### Requirement: Saved GitHub Task Starts Require Project Authorization Across Connection States
The backend MUST identify saved GitHub-linked tasks through their persisted workspace-scoped GitHub issue references. For ordinary members, starting those tasks MUST require current explicit assignment to the owning GiTiempo project. Public project visibility, previous tracking history, and personal GitHub connection state MUST NOT grant that assignment. The backend MUST enforce the requirement before creating the running entry and MUST reject denied starts without creating tracking records or changing an existing timer. Assignment SHALL mean GiTiempo project membership, not GitHub issue assignee status. Personal disconnect MUST NOT delete existing tasks or history or prevent assigned members from starting otherwise eligible saved tasks.

#### Scenario: Disconnected member cannot start a saved GitHub task in an unassigned public project
- **GIVEN** an active ordinary member has disconnected their personal GitHub account
- **AND** an active open GitHub-linked task remains saved in an active public project to which the member is not assigned
- **WHEN** they start that task using its saved identifier
- **THEN** the backend returns HTTP 403 with code `project_assignment_required`
- **AND** the message is "You are not assigned to this project. Contact your workspace administrator or project manager to get access and start tracking time."
- **AND** no running entry is created and existing task, reference, and history records remain unchanged

#### Scenario: Disconnected assigned member can start a saved GitHub task
- **GIVEN** an active ordinary member is assigned to an active public or private project containing an active open saved GitHub task
- **AND** their personal GitHub account is disconnected and they have no running timer
- **WHEN** they start the saved task
- **THEN** the backend creates a running entry under the existing local timer rules
- **AND** the start does not request or refresh personal GitHub credentials
- **AND** it preserves the task billing default, optional description, and source `web`

#### Scenario: Personal connection state cannot bypass missing assignment
- **GIVEN** an ordinary member is not assigned to an active public project containing a saved GitHub-linked task
- **AND** their personal GitHub connection is connected, absent, or expired
- **WHEN** they start the saved task
- **THEN** the backend returns HTTP 403 with code `project_assignment_required` and creates no time entry

#### Scenario: Disconnected unassigned member cannot access a private task
- **GIVEN** an ordinary member has disconnected GitHub and is not assigned to a private project
- **WHEN** they submit the saved identifier of a GitHub-linked task in that project
- **THEN** the backend returns 404 Not Found without exposing protected task or project details
- **AND** creates no time entry

#### Scenario: Previous use and start surface cannot bypass assignment
- **GIVEN** an ordinary member previously tracked a saved GitHub task in a public project but is no longer assigned to that project
- **WHEN** they start it from Projects, the existing-task timer picker, a prior time entry, or a direct API request
- **THEN** the backend denies each start with `project_assignment_required`
- **AND** no client reports a successful start or leaves a false running state

#### Scenario: Assignment removal is observed at the write boundary
- **GIVEN** a member selected an eligible saved GitHub task while assigned
- **AND** removal of their project assignment completes before the start's authorization and write boundary
- **WHEN** the start request checks current authorization
- **THEN** it is denied and creates no time entry

#### Scenario: Current membership and workspace isolation remain mandatory
- **GIVEN** the caller no longer belongs to the current workspace or submits a task identifier belonging to another workspace
- **WHEN** they attempt a saved GitHub-task start
- **THEN** existing membership and workspace-isolation rules reject the request without creating an entry or exposing protected target details

#### Scenario: Existing privileged-role access is retained
- **GIVEN** an active admin targets an active workspace project or an active PM targets an active public project or an assigned active private project
- **AND** the saved GitHub task is open and active and no timer is running
- **WHEN** they start the task after personal GitHub disconnect
- **THEN** the start succeeds under the existing privileged-role rules
- **AND** a PM without access to a private project remains denied

#### Scenario: Task linkage controls the assignment exception
- **GIVEN** an ordinary member is not assigned to an active public project
- **WHEN** they start a saved task linked to a GitHub issue in that project, including a board-backed project
- **THEN** the start is denied even when the parent project has no GitHub repository reference
- **AND** an otherwise eligible manual task without a GitHub issue reference retains visibility-based timer access even if its parent project has a GitHub reference

#### Scenario: GitHub issue assignee does not replace project assignment
- **GIVEN** a disconnected ordinary member is assigned to the GiTiempo project and otherwise authorized to start its saved GitHub task
- **AND** the member is not a GitHub assignee of that issue
- **WHEN** they start the saved task with no running timer
- **THEN** the start succeeds without a GitHub issue-assignee check

#### Scenario: Disconnect and assignment loss preserve owned-timer stopping
- **GIVEN** a member owns a running timer for a saved GitHub task
- **AND** they disconnect their personal GitHub account or lose the project's assignment
- **WHEN** they stop their own timer with valid GiTiempo authentication and the correct expected timer identifier
- **THEN** the existing owned-timer stop operation succeeds
- **AND** this change does not stop the timer automatically or delete historical entries
