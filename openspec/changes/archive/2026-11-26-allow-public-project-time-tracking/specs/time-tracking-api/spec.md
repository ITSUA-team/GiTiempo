## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Saved GitHub Task Starts Require Project Authorization Across Connection States
**Reason**: Issue #572 replaces the public assignment prerequisite with workspace-wide tracking on active public projects.

**Migration**: Apply “Saved GitHub Task Starts Follow Project Visibility Across Connection States” to existing and new saved tasks. Existing assignments and time entries require no migration.

## ADDED Requirements

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
