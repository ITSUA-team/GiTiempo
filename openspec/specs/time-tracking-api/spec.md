# time-tracking-api Specification

## Purpose
The time tracking API lets authenticated workspace members record time manually, check, start and stop timers, and manage their own entries. It also supports authorized project time history and tracking time on GitHub issues.
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
The backend MUST allow authenticated workspace members to create completed manual time entries against visible active open tasks.

#### Scenario: User creates a valid manual entry
- **GIVEN** an authenticated workspace member has visibility to an active open task in an active project
- **WHEN** the member creates a manual entry with valid start and end times
- **THEN** the backend stores a completed time entry owned by that member
- **AND** the entry source is `manual`
- **AND** the duration is computed from the submitted interval

#### Scenario: User creates manual entry for public project task
- **GIVEN** an authenticated workspace member is not assigned to a project
- **AND** the project is public and active
- **AND** the task is active and open
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

#### Scenario: Manual entry cannot target closed task
- **GIVEN** an authenticated workspace member has visibility to a closed task
- **WHEN** the member attempts to create a manual entry for that task
- **THEN** the backend rejects the request with 422 Unprocessable Entity

### Requirement: Own Time Entries Can Be Read Updated And Deleted
The backend MUST let authenticated users read, update and delete their own completed time entries, including moving them to a visible, active, open task. For their own running entry, it MUST allow only task and description updates, with reassignment limited to visible, active, open tasks. It MUST reject changes to a running entry's interval or billable state and reject deletion.

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
- **AND** the user has visibility to another active open task in an active project
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

#### Scenario: User cannot move completed entry to closed task
- **GIVEN** an authenticated user owns a completed time entry
- **AND** the requested task is closed
- **WHEN** the user attempts to update the entry with that task identifier
- **THEN** the backend rejects the request with 422 Unprocessable Entity
- **AND** the original entry task remains unchanged

#### Scenario: User updates running entry task and description
- **GIVEN** an authenticated user owns a running time entry
- **AND** the user has visibility to another active open task in an active project
- **WHEN** the user updates the running entry with `taskId` and `description`
- **THEN** the backend applies the task and description changes without stopping the timer
- **AND** the response includes the new task and project display context
- **AND** the entry remains running with empty end time and duration

#### Scenario: User clears running entry description
- **GIVEN** an authenticated user owns a running time entry
- **WHEN** the user updates the running entry with `description: null`
- **THEN** the backend clears the description without stopping the timer

#### Scenario: User cannot update running entry interval or billable fields
- **GIVEN** an authenticated user owns a running time entry
- **WHEN** the user attempts to update `startedAt`, `endedAt`, or `isBillable`
- **THEN** the backend rejects the request and instructs the user to stop the timer first
- **AND** the running entry remains unchanged

#### Scenario: User cannot move running entry to invisible private task
- **GIVEN** an authenticated user owns a running time entry
- **AND** the user lacks visibility to a private task's project
- **WHEN** the user attempts to update the running entry with that task identifier
- **THEN** the backend responds with 404 Not Found
- **AND** the original running entry task remains unchanged

#### Scenario: User cannot move running entry to inactive work
- **GIVEN** an authenticated user owns a running time entry
- **AND** the requested task or its parent project is inactive
- **WHEN** the user attempts to update the running entry with that task identifier
- **THEN** the backend rejects the request with 422 Unprocessable Entity
- **AND** the original running entry task remains unchanged

#### Scenario: User cannot move running entry to closed task
- **GIVEN** an authenticated user owns a running time entry
- **AND** the requested task is closed
- **WHEN** the user attempts to update the running entry with that task identifier
- **THEN** the backend rejects the request with 422 Unprocessable Entity
- **AND** the original running entry task remains unchanged

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

### Requirement: Current Running Timer Is User-Global Across Workspaces
The backend SHALL expose the authenticated user's single running timer regardless of the active workspace claim, while preserving workspace-scoped authorization for starting timers against tasks.

#### Scenario: Current timer returns running entry from another workspace
- **GIVEN** an authenticated user has a running timer in workspace A
- **AND** the user's active session token is scoped to workspace B
- **WHEN** the user requests the current running timer
- **THEN** the backend returns the running time entry from workspace A
- **AND** the response includes enough safe workspace identity or display metadata for the frontend to label workspace A

#### Scenario: Current timer is empty only when user has no running timer
- **GIVEN** an authenticated user has no running timer in any workspace
- **WHEN** the user requests the current running timer from any active workspace session
- **THEN** the backend returns an explicit empty current-timer response

#### Scenario: Stop timer stops running entry from another workspace
- **GIVEN** an authenticated user has a running timer in workspace A
- **AND** the user's active session token is scoped to workspace B
- **WHEN** the user stops the current running timer
- **THEN** the backend stops the user's running timer in workspace A
- **AND** the response returns the completed time entry with its original workspace identity

#### Scenario: Start timer remains scoped to active workspace task visibility
- **GIVEN** an authenticated user has no running timer
- **AND** the user's active session token is scoped to workspace B
- **WHEN** the user starts a timer for a task visible in workspace B
- **THEN** the backend creates the running time entry in workspace B
- **AND** the backend does not create or move a time entry in any other workspace

#### Scenario: Start timer rejects while another workspace timer is running
- **GIVEN** an authenticated user has a running timer in workspace A
- **AND** the user's active session token is scoped to workspace B
- **WHEN** the user attempts to start a timer for a visible workspace B task
- **THEN** the backend rejects the request with `409 Conflict`
- **AND** the existing workspace A running timer remains running and unchanged

#### Scenario: User cannot stop another user's timer across workspaces
- **GIVEN** another user has a running timer in any workspace
- **WHEN** the authenticated user requests the current running timer or stops the current running timer
- **THEN** the backend does not return or stop the other user's timer

### Requirement: Timer Can Be Started Against Existing Task
The backend MUST allow an active workspace member to start one timer, with an optional description, on any active open task in an active public project regardless of project assignment or GitHub linkage. Private managed tasks require existing project access. Private external-reference tasks accept a separate project grant or current own-time access on the exact task. Every start MUST enforce the user-global running-timer limit.

#### Scenario: User starts timer with no active timer
- **GIVEN** the request uses a managed task under the existing start policy
- **AND** an authenticated user has no running timer
- **AND** the user has visibility to an active open task in an active project and satisfies the task's tracking authorization
- **WHEN** the user starts a timer for that task
- **THEN** the backend creates a running time entry owned by that user
- **AND** the entry source is `web`


#### Scenario: User starts timer with description
- **GIVEN** the request uses a managed task under the existing start policy
- **AND** an authenticated user has no running timer
- **AND** the user has visibility to an active open task in an active project and satisfies the task's tracking authorization
- **WHEN** the user starts a timer for that task with a valid `description`
- **THEN** the backend creates a running time entry owned by that user
- **AND** stores the submitted description on the entry
- **AND** the entry source is `web`


#### Scenario: User starts timer for public project task
- **GIVEN** the request uses a managed task under the existing start policy
- **AND** an authenticated user has no running timer
- **AND** the user is not assigned to a project
- **AND** the project is public and active
- **AND** the task is active and open, with or without a GitHub issue reference
- **WHEN** the user starts a timer for that task
- **THEN** the backend creates a running time entry owned by that user


#### Scenario: User cannot start second timer
- **GIVEN** the request uses a managed task under the existing start policy
- **AND** an authenticated user already has a running timer
- **AND** the requested target otherwise satisfies tracking authorization
- **WHEN** the user attempts to start another timer
- **THEN** the backend rejects the request with 409 Conflict


#### Scenario: User cannot start timer for invisible private task
- **GIVEN** the request uses a managed task under the existing start policy
- **AND** an authenticated user lacks visibility to a private task's project
- **WHEN** the user attempts to start a timer for that task
- **THEN** the backend responds with 404 Not Found


#### Scenario: User cannot start timer for inactive work
- **GIVEN** the request uses a managed task under the existing start policy
- **AND** a task or its parent project is inactive
- **WHEN** an otherwise authorized member attempts to start a timer for that task
- **THEN** the backend rejects the request with 422 Unprocessable Entity


#### Scenario: User cannot start timer for closed task
- **GIVEN** the request uses a managed task under the existing start policy
- **AND** an authenticated user has visibility and tracking authorization for a closed task
- **WHEN** the user attempts to start a timer for that task
- **THEN** the backend rejects the request with 422 Unprocessable Entity

#### Scenario: Own-time reader resumes an external task
- **GIVEN** an active unassigned member has own time in an active open external task
- **WHEN** they start its saved identifier with no running timer and no GitHub link
- **THEN** a web-source timer is created without requiring project assignment

### Requirement: Saved GitHub Task Starts Follow Project Visibility Across Connection States
The backend MUST authorize saved GitHub task starts from current workspace membership and project visibility independently of personal GitHub connection and issue assignee status. Public projects admit every active workspace member. Private managed projects require project access. A private external task also admits an exact-task own-time reader. Denied starts MUST preserve records and any running timer.

#### Scenario: Disconnected member starts an unassigned public task
- **GIVEN** an active member without a running timer has disconnected GitHub and has no assignment to an active public project containing a saved active open GitHub issue
- **WHEN** the member starts the saved task
- **THEN** the backend returns a running web entry without requesting GitHub credentials or creating a project assignment
- **AND** the saved task, reference and previous history survive disconnect

#### Scenario: Disconnected assigned member can start a saved GitHub task
- **GIVEN** the saved task belongs to a managed project
- **AND** an active ordinary member is assigned to an active public or private project containing an active open saved GitHub task
- **AND** their personal GitHub account is disconnected and they have no running timer
- **WHEN** they start the saved task
- **THEN** the backend creates a running entry under the existing local timer rules
- **AND** the start does not request or refresh personal GitHub credentials
- **AND** it preserves the task billing default, optional description, and source `web`

#### Scenario: Public tracking across personal GitHub connection states
- **GIVEN** an active member with no project assignment or running timer targets a saved active open GitHub task in an active public project
- **WHEN** they start it with a connected, absent or expired personal GitHub connection
- **THEN** the backend creates their running timer in each case

#### Scenario: Disconnected unassigned member cannot access a private task
- **GIVEN** the saved task belongs to a managed project
- **AND** an ordinary member has disconnected GitHub and is not assigned to a private project
- **WHEN** they submit the saved identifier of a GitHub-linked task in that project
- **THEN** the backend returns 404 Not Found without exposing protected task or project details
- **AND** creates no time entry

#### Scenario: Public saved starts use the same rule on every surface
- **GIVEN** an active member previously tracked an open active GitHub task and their assignment to its active public project was removed
- **WHEN** they start it with no running timer from Projects, the existing-task picker, a previous time entry or the API
- **THEN** each surface can start the timer and returns the new running entry

#### Scenario: Assignment removal is observed at the write boundary
- **GIVEN** the saved task belongs to a managed project
- **AND** a member selected an eligible saved GitHub task in a private project while assigned
- **AND** removal of their project assignment completes before the start's authorization and write boundary
- **WHEN** the start request checks current authorization
- **THEN** it is denied and creates no time entry

#### Scenario: Current membership and workspace isolation remain mandatory
- **GIVEN** the saved task belongs to a managed project
- **AND** the caller no longer belongs to the current workspace or submits a task identifier belonging to another workspace
- **WHEN** they attempt a saved GitHub-task start
- **THEN** existing membership and workspace-isolation rules reject the request without creating an entry or exposing protected target details

#### Scenario: Existing privileged-role access is retained
- **GIVEN** the saved task belongs to a managed project
- **AND** an active admin targets an active workspace project or an active PM targets an active public project or an assigned active private project
- **AND** the saved GitHub task is open and active and no timer is running
- **WHEN** they start the task after personal GitHub disconnect
- **THEN** the start succeeds under the existing privileged-role rules
- **AND** a PM without access to a private project remains denied

#### Scenario: Public project grants access to both linked and manual tasks
- **GIVEN** an active member without an assignment or a running timer targets an active open task in an active public project
- **WHEN** they start a manual task or a task with a persisted GitHub issue reference
- **THEN** each start succeeds, including in projects linked to a repository or a GitHub Projects board

#### Scenario: GitHub issue assignee does not replace project assignment
- **GIVEN** the saved task belongs to a managed project
- **AND** a disconnected ordinary member is assigned to the GiTiempo project and otherwise authorized to start its saved GitHub task
- **AND** the member is not a GitHub assignee of that issue
- **WHEN** they start the saved task with no running timer
- **THEN** the start succeeds without a GitHub issue-assignee check

#### Scenario: Disconnect and assignment loss preserve owned-timer stopping
- **GIVEN** the saved task belongs to a managed project
- **AND** a member owns a running timer for a saved GitHub task
- **AND** they disconnect their personal GitHub account or lose the project's assignment
- **WHEN** they stop their own timer with valid GiTiempo authentication and the correct expected timer identifier
- **THEN** the existing owned-timer stop operation succeeds
- **AND** this change does not stop the timer automatically or delete historical entries

#### Scenario: External own-time repeat works without assignment or GitHub linking
- **GIVEN** an active member has own time on an active open external-reference task, no separate project grant, no personal GitHub link, and no running timer
- **WHEN** they start that saved task through any supported repeat action
- **THEN** a running web entry is created without assignment or GitHub credential checks

#### Scenario: External history on a sibling cannot authorize a saved task
- **GIVEN** the member has own time on one task in a private external project but none on the requested task and no separate project grant
- **WHEN** they submit the other task identifier
- **THEN** the backend denies the start without disclosing the hidden task or creating an entry

### Requirement: Running Timer Can Be Stopped
The backend MUST allow an authenticated user to stop their current running timer and convert it into a completed time entry. Clients MAY provide the authoritative running entry identifier to conditionally stop that exact timer; a supplied identifier that no longer identifies the caller's running timer MUST be rejected with `409 Conflict` and MUST NOT stop a replacement timer. Bodyless legacy requests remain supported and retain the no-running-timer `404 Not Found` response.

#### Scenario: User stops running timer
- **GIVEN** an authenticated user has a running timer
- **WHEN** the user stops the timer
- **THEN** the backend sets the entry end time
- **AND** computes the stored duration
- **AND** returns the completed entry

#### Scenario: User conditionally stops the authoritative running timer
- **GIVEN** an authenticated user has a running timer
- **AND** the user provides that running entry's identifier as `expectedTimerId`
- **WHEN** the user stops the timer
- **THEN** the backend stops that exact running entry
- **AND** returns the completed entry

#### Scenario: User conditionally stops a changed timer
- **GIVEN** an authenticated user provides an `expectedTimerId`
- **AND** that identifier does not identify the user's current running timer because it is completed, absent, belongs to another user, or was replaced
- **WHEN** the user attempts to stop a timer
- **THEN** the backend responds with `409 Conflict`
- **AND** the backend does not stop any different running timer

#### Scenario: User stops with no running timer
- **GIVEN** an authenticated user has no running timer
- **AND** the user makes a bodyless legacy stop request
- **WHEN** the user attempts to stop a timer
- **THEN** the backend responds with 404 Not Found

### Requirement: Clients Can Start Timer From GitHub Issue
The backend MUST preserve canonical GitHub provider mappings when starting timers from GitHub issues so existing workspace records are reused instead of duplicated by repository owner or name casing drift.

#### Scenario: Extension reuses existing GitHub mapping regardless of repository casing
- **GIVEN** local provider references already map the submitted GitHub issue using a different repository-name or owner casing variant
- **WHEN** the extension starts a timer for that same GitHub issue
- **THEN** the backend reuses the existing project and task records
- **AND** does not create duplicate GitHub provider references for the casing variant

### Requirement: Starting A Timer From A GitHub Issue Is Authorized Against The Repository
Every installation-authorized or managed reference start MUST enforce workspace organization policy and verify the repository and issue via the current workspace's verified organization GitHub App installation before writing tracking records. Use canonical GitHub identities and metadata. Page data MUST NOT replace verification. Never require or fall back to personal GitHub connections. Route external-reference targets via `external-github-tracking`, with no fallback to that path.

#### Scenario: Repository outside the workspace organization policy is refused
- **GIVEN** the target uses managed installation-authorized tracking
- **AND** the repository owner is not allowed by the current workspace
- **WHEN** a member starts a timer for one of its issues
- **THEN** the request is refused with an organization-policy error
- **AND** no project, assignment, task, provider reference, or time entry is created


#### Scenario: Nonexistent or unreadable repository is refused
- **GIVEN** the target uses managed installation-authorized tracking
- **AND** the linked installation cannot read the repository or issue
- **WHEN** a member requests a GitHub timer start
- **THEN** the backend returns a safe resource-unavailable error without distinguishing private resources from nonexistent resources
- **AND** it writes no tracking records


#### Scenario: Personal connection is absent disconnected or expired
- **GIVEN** the target uses managed installation-authorized tracking
- **AND** an active member assigned to the existing mapped active GiTiempo project and a verified installation with required resource access
- **AND** the member has no personal GitHub connection, has disconnected it, or its credentials have expired
- **WHEN** they start a timer for a public or private repository issue
- **THEN** the backend verifies the resources using the installation and starts the timer
- **AND** it does not obtain or refresh that member's personal GitHub credentials


#### Scenario: Recorded repository uses the casing GitHub reports
- **GIVEN** the target uses managed installation-authorized tracking
- **AND** the request uses a different repository or owner casing
- **WHEN** GitHub verifies the repository and issue
- **THEN** the backend preserves canonical provider metadata and reuses existing case-insensitive project and issue mappings


#### Scenario: Verification happens before the creating transaction
- **GIVEN** the target uses managed installation-authorized tracking
- **AND** verification fails because of installation state, missing permissions, token renewal failure, unavailable resources, or a provider outage
- **WHEN** the start request completes
- **THEN** no project, assignment, task, provider reference, or time entry is written
- **AND** the failure does not trigger fallback to personal credentials

### Requirement: Project Time Entries Can Be Listed Read Only
The backend MUST allow authenticated users to list time entries within their authorized project access scope, including task-title search, without allowing mutation of others' entries. Existing full-project read grants SHALL retain their current scope. Own-time access to an external project SHALL return only the caller's entries and matching scoped pagination/totals.

#### Scenario: Admin lists project time entries
- **GIVEN** the caller is evaluated under existing full-project access rules
- **AND** an authenticated admin belongs to the workspace
- **WHEN** the admin lists time entries for a project in that workspace
- **THEN** the backend returns entries for that project regardless of entry owner


#### Scenario: Non-admin lists active public project time entries
- **GIVEN** the caller is evaluated under existing full-project access rules
- **AND** an authenticated PM or member belongs to the workspace
- **AND** the project is public and active
- **WHEN** the user lists time entries for that project
- **THEN** the backend returns entries for that project regardless of entry owner


#### Scenario: Assigned user lists active private project time entries
- **GIVEN** the caller is evaluated under existing full-project access rules
- **AND** an authenticated PM or member is assigned to an active private project
- **WHEN** the user lists time entries for that project
- **THEN** the backend returns entries for that project regardless of entry owner


#### Scenario: User filters visible project time entries by partial task title search
- **GIVEN** the caller is evaluated under existing full-project access rules
- **AND** an authenticated user can view a project's time entries
- **AND** the project has entries across tasks with different titles
- **WHEN** the user supplies `search` with part of a task title
- **THEN** the backend returns only project entries whose task title contains that text
- **AND** the match is case-insensitive
- **AND** project visibility rules remain unchanged


#### Scenario: Unassigned user cannot list private project time entries
- **GIVEN** the caller is evaluated under existing full-project access rules
- **AND** an authenticated PM or member is not assigned to a private project
- **WHEN** the user attempts to list time entries for that project
- **THEN** the backend responds with 404 Not Found


#### Scenario: Project time-entry list is read only
- **GIVEN** the caller is evaluated under existing full-project access rules
- **AND** an authenticated user can view another user's time entry through a project list
- **WHEN** the authenticated user attempts to update or delete that other user's entry through own-entry endpoints
- **THEN** the backend responds with 404 Not Found

#### Scenario: Own-time project history excludes colleagues
- **GIVEN** two members have time in the same external project and the requester has only own-time access
- **WHEN** they list project entries or search their titles
- **THEN** only the requester's entries and visible task titles contribute to results and pagination

### Requirement: New Time Entries Inherit Task Billable Default
The backend MUST initialize new time-entry billable state from the selected task's default billable value unless the create flow explicitly supplies an entry-level override.

#### Scenario: Manual entry inherits task default when omitted
- **GIVEN** an authenticated workspace member has visibility to an active open task in an active project
- **AND** the task has `defaultBillableForTimeEntries: false`
- **WHEN** the member creates a manual entry for that task without `isBillable`
- **THEN** the backend stores the new completed time entry with `isBillable: false`

#### Scenario: Manual entry can override task default
- **GIVEN** an authenticated workspace member has visibility to an active open task in an active project
- **AND** the task has `defaultBillableForTimeEntries: false`
- **WHEN** the member creates a manual entry for that task with `isBillable: true`
- **THEN** the backend stores the new completed time entry with `isBillable: true`

#### Scenario: Timer start inherits task default
- **GIVEN** an authenticated user has no running timer
- **AND** the user has visibility to an active open task with `defaultBillableForTimeEntries: false`
- **WHEN** the user starts a timer for that task
- **THEN** the backend creates a running time entry with `isBillable: false`

#### Scenario: Chrome extension timer start inherits task default
- **GIVEN** an authenticated user has no running timer
- **AND** the Chrome extension starts a timer for a GitHub issue mapped to a task with `defaultBillableForTimeEntries: false`
- **WHEN** the backend creates the running time entry
- **THEN** the entry has `isBillable: false`

#### Scenario: Lazily created extension task inherits project default
- **GIVEN** an authenticated user has no running timer
- **AND** the Chrome extension starts a timer for a GitHub issue that has no local task mapping
- **WHEN** the backend lazily creates the task under a project with `defaultBillableForTasks: false`
- **THEN** the created task has `defaultBillableForTimeEntries: false`
- **AND** the created running time entry has `isBillable: false`

### Requirement: GitHub Starts Require An Existing Authorized Project
Installation-authorized and managed reference starts MUST resolve the verified issue to a unique eligible existing workspace project before creating tasks or time entries or returning protected metadata. Use issue-task, repository and board mappings in that order. Verify board hints for organization, installation access and issue membership before use. Starts MUST NOT create projects or assignments. Route external-reference targets via `external-github-tracking`, with no fallback to that path.

#### Scenario: Existing issue keeps its owning project across surfaces
- **GIVEN** the target uses managed installation-authorized tracking
- **AND** an issue already has a workspace task mapping under a board-backed project and a repository project exists too
- **WHEN** a caller starts from its direct page or supported Projects pane
- **THEN** both requests resolve to the existing task's project
- **AND** neither creates a duplicate nor switches to another project to evade an access denial


#### Scenario: New issue resolves to an existing repository project
- **GIVEN** the target uses managed installation-authorized tracking
- **AND** no task maps the issue but its repository maps to an active GiTiempo project
- **WHEN** an authorized member starts tracking it
- **THEN** a task is materialized only in that project using verified GitHub metadata


#### Scenario: Board mapping is used only with verified issue membership
- **GIVEN** the target uses managed installation-authorized tracking
- **AND** no issue-task or repository mapping exists and the issue belongs to a GitHub Project already mapped in this workspace
- **WHEN** the backend verifies the board and issue membership through the installation and resolves a unique eligible project
- **THEN** it uses that local project subject to GiTiempo access checks
- **AND** board and repository identities remain distinct


#### Scenario: Mapping is absent or ambiguous
- **GIVEN** the target uses managed installation-authorized tracking
- **AND** no existing mapping can be resolved or multiple verified board mappings remain ambiguous
- **WHEN** the caller starts tracking the issue
- **THEN** the backend returns a safe mapping error with administrator or project-manager setup guidance
- **AND** it creates no project, assignment, task, provider reference, or time entry


#### Scenario: Forged board or cross-workspace identifiers cannot grant access
- **GIVEN** the target uses managed installation-authorized tracking
- **AND** a supplied board identifier belongs to another workspace or organization, does not contain the issue, or is inaccessible to the installation
- **WHEN** the identifier would influence project resolution
- **THEN** it cannot select or create a project or assignment
- **AND** the request returns no protected project metadata

### Requirement: GitHub Tracking Authorization Precedes Materialization
For managed GitHub starts and capability checks, the backend MUST authorize active workspace members for active public projects without assignment. Private projects require existing role or assignment access. Starts MUST verify the workspace installation and target, then recheck authorization at write time before materializing records. External-reference targets follow external-github-tracking. Managed denials MUST NOT fall back to external tracking.

#### Scenario: Unassigned ordinary member is denied
- **GIVEN** the target uses managed installation-authorized tracking
- **AND** an active ordinary member is not assigned to the mapped private project
- **WHEN** they start a GitHub timer despite valid installation access
- **THEN** the backend returns HTTP 403 with code `project_assignment_required`
- **AND** the message is "You are not assigned to this project. Contact your workspace administrator or project manager to get access and start tracking time."
- **AND** it returns no project identifier, title, membership list, or other protected project metadata and writes no task, time entry, or assignment


#### Scenario: Inactive workspace member is denied
- **GIVEN** the target uses managed installation-authorized tracking
- **AND** a caller has an inactive workspace membership
- **WHEN** they request a GitHub timer start
- **THEN** the backend rejects the request before returning provider or project metadata or writing tracking records


#### Scenario: Privileged-role behavior is preserved
- **GIVEN** the target uses managed installation-authorized tracking
- **AND** an active admin or PM and valid installation/resource access
- **WHEN** the admin targets an active workspace project or the PM targets an active project visible under existing PM rules
- **THEN** no new ordinary-member assignment prerequisite is imposed on that privileged role
- **AND** all installation, task-state, and timer invariants still apply


#### Scenario: Access changes during verification
- **GIVEN** the target uses managed installation-authorized tracking
- **AND** a member was assigned to a private project before a provider lookup but their assignment is removed before task creation
- **WHEN** the write transaction rechecks authorization
- **THEN** the start fails without leaving task, reference, time-entry, or assignment writes

#### Scenario: Public managed GitHub starts agree with capability
- **GIVEN** an active member without a project assignment or running timer targets an eligible issue mapped to an active public project and workspace installation verification succeeds
- **WHEN** the extension checks capability for the issue
- **THEN** it receives `canStartTracking: true`, scope `project` and a null reason
- **WHEN** the member starts through the managed GitHub endpoint or through reference routing to that managed project
- **THEN** the backend creates the running entry, reusing the mapped task or materializing it in that project, without creating a project assignment

#### Scenario: Public project becomes private between capability and start
- **GIVEN** an unassigned member receives an allowed capability for a public managed project
- **WHEN** the project becomes private before the start request's authorization and write boundary
- **THEN** the start is denied and creates no task, reference, entry or assignment

### Requirement: Installation Starts Preserve Timer Invariants
Authorized installation-based starts MUST preserve local active/open task checks, active project checks, task and project billing defaults, canonical deduplication, one-running-timer constraints, and `source: extension`. Stopping an owned running timer MUST depend only on the existing GiTiempo stop authorization and concurrency contract, without personal GitHub credentials or fresh GitHub API calls.

#### Scenario: Inactive project or inactive or closed task cannot be tracked
- **GIVEN** the resolved project is inactive or the existing local task is inactive or closed
- **WHEN** an otherwise authorized GitHub start is requested
- **THEN** it fails under the existing state rules with no partial materialization

#### Scenario: Billing and attribution are retained
- **GIVEN** an authorized start reuses a task or creates one in an authorized project
- **WHEN** the timer is created
- **THEN** the entry inherits the task billable default, a new task inherits its project's default, and the entry has `source: extension`

#### Scenario: Concurrent starts preserve uniqueness
- **GIVEN** two requests target the same issue under casing variants or the user already has a running timer
- **WHEN** the backend processes the starts
- **THEN** existing uniqueness/conflict rules prevent duplicate issue tasks and multiple running timers
- **AND** failed starts leave no partial task or reference writes

#### Scenario: GitHub access is lost after start
- **GIVEN** the user owns a running timer and the personal connection or installation is now unusable, or GitHub is unavailable
- **WHEN** they stop that timer with valid GiTiempo authorization
- **THEN** the existing stop operation succeeds without a GitHub API call
- **AND** conditional-stop protection against stopping a replacement timer remains enforced

### Requirement: Project time management scope
The backend SHALL authorize every management request against current active workspace membership. An Admin can manage every project in that workspace. A PM can manage only explicitly assigned projects, regardless of visibility or invoice-view permission. These grants cover entries belonging to any owner in the authorized project.

#### Scenario: Manager works across owners
- **GIVEN** an Admin in the current workspace or a PM explicitly assigned to the selected project
- **WHEN** they list entries, create a completed entry for an eligible colleague, or edit or delete that colleague's completed unlinked entry
- **THEN** each operation succeeds within the selected project, including for a PM without invoice-view permission

#### Scenario: Public visibility and former assignments confer no management grant
- **GIVEN** a PM has no current assignment to a public project, including after removal of an earlier assignment
- **WHEN** they open project selection or directly request entries, create-form choices or a mutation for that project
- **THEN** selection omits it and targeted requests return 404 without revealing entries, choices or lock reasons

#### Scenario: Direct requests cannot cross workspace or project boundaries
- **GIVEN** a manager can access project A
- **WHEN** they request a project from another workspace, address a project B entry under A, or supply a task outside the declared destination project
- **THEN** the request returns 404 and neither project's records change
- **WHEN** they request create-member choices in A with a task filter from B
- **THEN** the lookup returns an empty page

#### Scenario: A project move requires management access at both ends
- **GIVEN** a PM is assigned to the source and destination projects in the current workspace
- **WHEN** they move a completed entry with no invoice link to an eligible member and task in the destination
- **THEN** the move succeeds
- **WHEN** the PM lacks an assignment to either project at save time, or the destination is outside the current workspace
- **THEN** the request returns 404 and the entry stays in its original project

#### Scenario: Ordinary member cannot manage entries
- **GIVEN** an authenticated workspace member with no Admin or PM role
- **WHEN** they call any management operation, including for a project where they track time
- **THEN** the backend returns 403

### Requirement: Project time management list
The backend SHALL return individual entries, including running and invoiced entries, for one manageable project. Search, member and started-at date filters SHALL compose before pagination, and the returned total SHALL count only matching entries.

#### Scenario: Combined filters exclude another project
- **GIVEN** two manageable projects contain matching task titles and time from the same member
- **WHEN** a manager requests one project's entries with a literal, case-insensitive partial task-title search, owner and date range
- **THEN** only matching entries in that project contribute to the page and total

#### Scenario: Historical filter choices and current creation choices
- **GIVEN** a manageable project has a former member with recorded time and a current member eligible for an active open task
- **WHEN** a manager opens the member filter, then requests creation choices
- **THEN** the filter includes the historical owner, while creation offers only current members and tasks that form at least one eligible pair

#### Scenario: Project assignment grants access to all trackable project tasks
- **GIVEN** a current workspace member is explicitly assigned to an active private project with several active, non-closed tasks, including one they have never tracked and one assigned to someone else
- **WHEN** an authorized manager lists task options for that member or creates a valid completed entry for them on any of those tasks
- **THEN** every such task is selectable and creation succeeds irrespective of task assignee or tracking history
- **AND** closed and inactive tasks remain unavailable for creation

### Requirement: Administrative creation and historical correction
The backend SHALL create completed manual entries for the selected owner using that person's current tracking access to the destination task. A change to project, member or task SHALL verify the resulting combination against current tracking rules and update the existing entry atomically. Changes to the interval SHALL preserve a positive duration calculated from the resulting endpoints.

#### Scenario: Eligible owner differs from the acting manager
- **GIVEN** an active workspace member can track an open active task in an active public project without assignment
- **WHEN** an authorized manager creates an entry for that member on that task
- **THEN** the completed entry belongs to the selected member and its interval determines its duration

#### Scenario: Ineligible owner or work is rejected
- **GIVEN** the owner lacks current membership or access, or the selected destination task is closed or inactive or its project archived
- **WHEN** a manager creates an entry or changes an entry's project, owner or task to that combination
- **THEN** the backend rejects the ineligible combination with 422 without recording or moving time

#### Scenario: Reassign a completed entry without recreating it
- **GIVEN** a completed entry with no invoice link and a valid destination within scope
- **WHEN** a manager saves a different project or member, optionally with a different task
- **THEN** the original entry keeps its ID and source and reflects the resulting project, member and task
- **AND** its start, end, description and billable flag keep their stored values unless the patch changes them
- **AND** the source and destination lists and reports account for the entry once under its resulting project and member

#### Scenario: External own-time access applies to the exact task
- **GIVEN** an active owner only has own-time access to one active open task in a private external project
- **WHEN** an authorized manager creates time for that owner
- **THEN** creation is permitted for that exact task and denied for a sibling task the owner cannot track

#### Scenario: In-place corrections survive changes in tracking eligibility
- **GIVEN** a manager retains scope and a completed unlinked entry's project was archived, its task closed, or its owner lost access
- **WHEN** the manager corrects the interval, description or billable flag while keeping the original project, member and task, or deletes it
- **THEN** the operation succeeds without requiring renewed tracking access

### Requirement: Administrative write protection for running and invoiced entries
Management edits and deletions SHALL check record state at the time of mutation. A running or invoice-linked entry SHALL remain visible, and a rejected request SHALL leave its fields and links intact. These rules apply to the management operations.

#### Scenario: Timer must be stopped before any management change
- **GIVEN** an entry is running
- **WHEN** a manager attempts any edit, including description alone, or deletes it
- **THEN** the backend returns 409 with code `time_entry_running` and an instruction to stop its timer first

#### Scenario: Invoice linkage protects every status
- **GIVEN** an entry is linked to a draft, sent or paid invoice
- **WHEN** a manager attempts to edit or delete it
- **THEN** the backend returns 409 with code `time_entry_invoiced` and explains that the entry is included in an invoice

#### Scenario: Invoice attachment wins a race with an administrative mutation
- **GIVEN** a manager viewed an editable entry and another request links it to an invoice before the manager's mutation takes effect
- **WHEN** the manager submits an edit or deletion using that earlier view
- **THEN** the backend returns the invoice conflict and preserves the linked entry and invoice

#### Scenario: Personal access remains independent
- **GIVEN** a caller has an active personal timer and can read a colleague's time through the project team list
- **WHEN** the caller uses the personal update endpoint
- **THEN** the caller can update their running timer's description under the personal rules and cannot update the colleague's entry through that endpoint
