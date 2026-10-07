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
The backend MUST allow authenticated users to read, update, and delete their own completed time entries, including moving completed entries to another visible active open task, and MUST allow limited task and description updates to their own running time entry when target tasks remain visible, active, and open while preventing running-entry interval, billable, and delete mutations. This broadens the prior running task-only reassignment behavior by allowing `description` as the only additional running-entry update field.

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
The backend MUST allow an authenticated workspace member to start one running timer against a visible active open task and optionally store a time-entry description on that running timer.

#### Scenario: User starts timer with no active timer
- **GIVEN** an authenticated user has no running timer
- **AND** the user has visibility to an active open task in an active project
- **WHEN** the user starts a timer for that task
- **THEN** the backend creates a running time entry owned by that user
- **AND** the entry source is `web`

#### Scenario: User starts timer with description
- **GIVEN** an authenticated user has no running timer
- **AND** the user has visibility to an active open task in an active project
- **WHEN** the user starts a timer for that task with a valid `description`
- **THEN** the backend creates a running time entry owned by that user
- **AND** stores the submitted description on the entry
- **AND** the entry source is `web`

#### Scenario: User starts timer for public project task
- **GIVEN** an authenticated user has no running timer
- **AND** the user is not assigned to a project
- **AND** the project is public and active
- **AND** the task is active and open
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

#### Scenario: User cannot start timer for closed task
- **GIVEN** an authenticated user has visibility to a closed task
- **WHEN** the user attempts to start a timer for that task
- **THEN** the backend rejects the request with 422 Unprocessable Entity

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
The backend MUST verify the submitted repository and issue through the current workspace's verified organization GitHub App installation and enforce the workspace organization policy. This policy SHALL apply to every caller of the GitHub start endpoint, including extension and user-web clients. Personal GitHub connection state MUST NOT be a prerequisite or a fallback. GitHub-reported canonical identities and metadata MUST be used; page-supplied display data MUST NOT substitute for provider verification. All required provider checks MUST succeed before tracking records are written.

#### Scenario: Repository outside the workspace organization policy is refused
- **GIVEN** the repository owner is not allowed by the current workspace
- **WHEN** a member starts a timer for one of its issues
- **THEN** the request is refused with an organization-policy error
- **AND** no project, assignment, task, provider reference, or time entry is created

#### Scenario: Nonexistent or unreadable repository is refused
- **GIVEN** the linked installation cannot read the repository or issue
- **WHEN** a member requests a GitHub timer start
- **THEN** the backend returns a safe resource-unavailable error without distinguishing private resources from nonexistent resources
- **AND** it writes no tracking records

#### Scenario: Personal connection is absent disconnected or expired
- **GIVEN** an active member assigned to the existing mapped active GiTiempo project and a verified installation with required resource access
- **AND** the member has no personal GitHub connection, has disconnected it, or its credentials have expired
- **WHEN** they start a timer for a public or private repository issue
- **THEN** the backend verifies the resources using the installation and starts the timer
- **AND** it does not obtain or refresh that member's personal GitHub credentials

#### Scenario: Recorded repository uses the casing GitHub reports
- **GIVEN** the request uses a different repository or owner casing
- **WHEN** GitHub verifies the repository and issue
- **THEN** the backend preserves canonical provider metadata and reuses existing case-insensitive project and issue mappings

#### Scenario: Verification happens before the creating transaction
- **GIVEN** verification fails because of installation state, missing permissions, token renewal failure, unavailable resources, or a provider outage
- **WHEN** the start request completes
- **THEN** no project, assignment, task, provider reference, or time entry is written
- **AND** the failure does not trigger fallback to personal credentials

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
The backend MUST resolve the verified issue to an existing GiTiempo project in the current workspace before creating task or time records or returning protected metadata. An existing issue-task mapping SHALL retain its owning project; otherwise a repository mapping SHALL take precedence over a verified board mapping. A supplied GitHub Project identifier SHALL be treated as a hint whose organization, installation access, and relationship to the issue must be verified before it can influence resolution. Without a unique eligible mapping the start MUST fail. Timer starts MUST NOT create projects or project assignments.

#### Scenario: Existing issue keeps its owning project across surfaces
- **GIVEN** an issue already has a workspace task mapping under a board-backed project and a repository project exists too
- **WHEN** a caller starts from its direct page or supported Projects pane
- **THEN** both requests resolve to the existing task's project
- **AND** neither creates a duplicate nor switches to another project to evade an access denial

#### Scenario: New issue resolves to an existing repository project
- **GIVEN** no task maps the issue but its repository maps to an active GiTiempo project
- **WHEN** an authorized member starts tracking it
- **THEN** a task is materialized only in that project using verified GitHub metadata

#### Scenario: Board mapping is used only with verified issue membership
- **GIVEN** no issue-task or repository mapping exists and the issue belongs to a GitHub Project already mapped in this workspace
- **WHEN** the backend verifies the board and issue membership through the installation and resolves a unique eligible project
- **THEN** it uses that local project subject to GiTiempo access checks
- **AND** board and repository identities remain distinct

#### Scenario: Mapping is absent or ambiguous
- **GIVEN** no existing mapping can be resolved or multiple verified board mappings remain ambiguous
- **WHEN** the caller starts tracking the issue
- **THEN** the backend returns a safe mapping error with administrator or project-manager setup guidance
- **AND** it creates no project, assignment, task, provider reference, or time entry

#### Scenario: Forged board or cross-workspace identifiers cannot grant access
- **GIVEN** a supplied board identifier belongs to another workspace or organization, does not contain the issue, or is inaccessible to the installation
- **WHEN** the identifier would influence project resolution
- **THEN** it cannot select or create a project or assignment
- **AND** the request returns no protected project metadata

### Requirement: GitHub Tracking Authorization Precedes Materialization
GitHub starts MUST require active workspace membership, an active resolved project, and tracking authorization before materialization. Ordinary members MUST be explicitly assigned even when a project is public. Existing privileged-role rules SHALL remain: admins do not require assignments; PMs retain their current visibility-based project access. Provider installation access MUST NOT itself confer GiTiempo access. Authorization MUST be rechecked within the write boundary so concurrent membership, project, or assignment changes cannot cause unauthorized writes.

#### Scenario: Unassigned ordinary member is denied
- **GIVEN** an active ordinary member is not assigned to the mapped project, whether public or private
- **WHEN** they start a GitHub timer despite valid installation access
- **THEN** the backend returns HTTP 403 with code `project_assignment_required`
- **AND** the message is "You are not assigned to this project. Contact your workspace administrator or project manager to get access and start tracking time."
- **AND** it returns no project identifier, title, membership list, or other protected project metadata and writes no task, time entry, or assignment

#### Scenario: Inactive workspace member is denied
- **GIVEN** a caller has an inactive workspace membership
- **WHEN** they request a GitHub timer start
- **THEN** the backend rejects the request before returning provider or project metadata or writing tracking records

#### Scenario: Privileged-role behavior is preserved
- **GIVEN** an active admin or PM and valid installation/resource access
- **WHEN** the admin targets an active workspace project or the PM targets an active project visible under existing PM rules
- **THEN** no new ordinary-member assignment prerequisite is imposed on that privileged role
- **AND** all installation, task-state, and timer invariants still apply

#### Scenario: Access changes during verification
- **GIVEN** a member was authorized before a provider lookup but their assignment is removed before task creation
- **WHEN** the write transaction rechecks authorization
- **THEN** the start fails without leaving task, reference, time-entry, or assignment writes

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
