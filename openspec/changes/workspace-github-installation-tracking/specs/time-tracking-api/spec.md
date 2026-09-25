## MODIFIED Requirements

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

## ADDED Requirements

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
