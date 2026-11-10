## MODIFIED Requirements

### Requirement: Timer Can Be Started Against Existing Task
The backend MUST allow an authenticated workspace member to start one running timer against a visible active open task and optionally store a time-entry description on that running timer. For a saved GitHub-linked task, an ordinary member MUST additionally be explicitly assigned to the task's GiTiempo project, including when the project is public. This assignment requirement MUST apply independently of personal GitHub connection state and client entry point. Existing admin access and PM visibility-based access MUST remain unchanged. Tasks without a GitHub issue reference MUST retain the existing visibility-based start policy.
 For an external-reference task, current own-time or separate project authorization SHALL replace the ordinary GitHub assignment prerequisite. A saved identifier without authorized task visibility MUST NOT create participation; first participation uses reference start. All scopes MUST retain active/open and global-timer checks.

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
- **AND** the task is active and open and has no GitHub issue reference
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


### Requirement: Starting A Timer From A GitHub Issue Is Authorized Against The Repository
This requirement SHALL govern installation-authorized starts and managed targets reached through reference routing. The backend MUST verify the submitted repository and issue through the current workspace's verified organization GitHub App installation and enforce the workspace organization policy. This policy SHALL apply to every caller of the GitHub start endpoint, including extension and user-web clients. Personal GitHub connection state MUST NOT be a prerequisite or a fallback. GitHub-reported canonical identities and metadata MUST be used; page-supplied display data MUST NOT substitute for provider verification. All required provider checks MUST succeed before tracking records are written.
 The external-reference path for new or stored external-reference targets SHALL instead follow the external-github-tracking capability and MUST NOT be used as fallback after failure of this requirement.

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

### Requirement: GitHub Starts Require An Existing Authorized Project
This requirement SHALL govern installation-authorized starts and managed targets reached through reference routing. The backend MUST resolve the verified issue to an existing GiTiempo project in the current workspace before creating task or time records or returning protected metadata. An existing issue-task mapping SHALL retain its owning project; otherwise a repository mapping SHALL take precedence over a verified board mapping. A supplied GitHub Project identifier SHALL be treated as a hint whose organization, installation access, and relationship to the issue must be verified before it can influence resolution. Without a unique eligible mapping the start MUST fail. Timer starts MUST NOT create projects or project assignments.
 The external-reference path for new or stored external-reference targets SHALL instead follow the external-github-tracking capability and MUST NOT be used as fallback after failure of this requirement.

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
This requirement SHALL govern installation-authorized starts and managed targets reached through reference routing. GitHub starts MUST require active workspace membership, an active resolved project, and tracking authorization before materialization. Ordinary members MUST be explicitly assigned even when a project is public. Existing privileged-role rules SHALL remain: admins do not require assignments; PMs retain their current visibility-based project access. Provider installation access MUST NOT itself confer GiTiempo access. Authorization MUST be rechecked within the write boundary so concurrent membership, project, or assignment changes cannot cause unauthorized writes.
 The external-reference path for new or stored external-reference targets SHALL instead follow the external-github-tracking capability and MUST NOT be used as fallback after failure of this requirement.

#### Scenario: Unassigned ordinary member is denied
- **GIVEN** the target uses managed installation-authorized tracking
- **AND** an active ordinary member is not assigned to the mapped project, whether public or private
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
- **AND** a member was authorized before a provider lookup but their assignment is removed before task creation
- **WHEN** the write transaction rechecks authorization
- **THEN** the start fails without leaving task, reference, time-entry, or assignment writes

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

### Requirement: Saved GitHub Task Starts Require Project Authorization Across Connection States
The backend MUST identify saved GitHub-linked tasks through their persisted workspace-scoped GitHub issue references. For ordinary members targeting managed projects, starting those tasks MUST require current explicit assignment to the owning GiTiempo project. For managed targets, public project visibility, previous tracking history, and personal GitHub connection state MUST NOT grant that assignment. External-reference saved tasks SHALL instead accept current explicit project authorization or own-time access to that exact task, without assignment or personal GitHub linking; a guessed or stale hidden task ID MUST be denied. The backend MUST enforce the requirement before creating the running entry and MUST reject denied starts without creating tracking records or changing an existing timer. Assignment SHALL mean GiTiempo project membership, not GitHub issue assignee status. Personal disconnect MUST NOT delete existing tasks or history or prevent assigned members from starting otherwise eligible saved tasks.

#### Scenario: Disconnected member cannot start a saved GitHub task in an unassigned public project
- **GIVEN** the saved task belongs to a managed project
- **AND** an active ordinary member has disconnected their personal GitHub account
- **AND** an active open GitHub-linked task remains saved in an active public project to which the member is not assigned
- **WHEN** they start that task using its saved identifier
- **THEN** the backend returns HTTP 403 with code `project_assignment_required`
- **AND** the message is "You are not assigned to this project. Contact your workspace administrator or project manager to get access and start tracking time."
- **AND** no running entry is created and existing task, reference, and history records remain unchanged

#### Scenario: Disconnected assigned member can start a saved GitHub task
- **GIVEN** the saved task belongs to a managed project
- **AND** an active ordinary member is assigned to an active public or private project containing an active open saved GitHub task
- **AND** their personal GitHub account is disconnected and they have no running timer
- **WHEN** they start the saved task
- **THEN** the backend creates a running entry under the existing local timer rules
- **AND** the start does not request or refresh personal GitHub credentials
- **AND** it preserves the task billing default, optional description, and source `web`

#### Scenario: Personal connection state cannot bypass missing assignment
- **GIVEN** the saved task belongs to a managed project
- **AND** an ordinary member is not assigned to an active public project containing a saved GitHub-linked task
- **AND** their personal GitHub connection is connected, absent, or expired
- **WHEN** they start the saved task
- **THEN** the backend returns HTTP 403 with code `project_assignment_required` and creates no time entry

#### Scenario: Disconnected unassigned member cannot access a private task
- **GIVEN** the saved task belongs to a managed project
- **AND** an ordinary member has disconnected GitHub and is not assigned to a private project
- **WHEN** they submit the saved identifier of a GitHub-linked task in that project
- **THEN** the backend returns 404 Not Found without exposing protected task or project details
- **AND** creates no time entry

#### Scenario: Previous use and start surface cannot bypass assignment
- **GIVEN** the saved task belongs to a managed project
- **AND** an ordinary member previously tracked a saved GitHub task in a public project but is no longer assigned to that project
- **WHEN** they start it from Projects, the existing-task timer picker, a prior time entry, or a direct API request
- **THEN** the backend denies each start with `project_assignment_required`
- **AND** no client reports a successful start or leaves a false running state

#### Scenario: Assignment removal is observed at the write boundary
- **GIVEN** the saved task belongs to a managed project
- **AND** a member selected an eligible saved GitHub task while assigned
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

#### Scenario: Task linkage controls the assignment exception
- **GIVEN** the saved task belongs to a managed project
- **AND** an ordinary member is not assigned to an active public project
- **WHEN** they start a saved task linked to a GitHub issue in that project, including a board-backed project
- **THEN** the start is denied even when the parent project has no GitHub repository reference
- **AND** an otherwise eligible manual task without a GitHub issue reference retains visibility-based timer access even if its parent project has a GitHub reference

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
- **GIVEN** the member has own time on one task but none on the requested external task and no separate project grant
- **WHEN** they submit the other task identifier
- **THEN** the backend denies the start without disclosing the hidden task or creating an entry
