## ADDED Requirements

### Requirement: Jira Projects Are Offered As Timer Targets

The top-bar timer picker SHALL offer the approved site's Jira projects as targets for a connected member, listed beside GitHub boards and separately from GiTiempo projects.

#### Scenario: Jira projects appear in the picker

- **GIVEN** a connected member in a workspace with an approved Jira site
- **WHEN** they open the timer task picker
- **THEN** Jira projects their account can read are offered as targets
- **AND** they are visually distinct from GiTiempo projects and GitHub boards

#### Scenario: Jira absence explains itself

- **GIVEN** the member has no Atlassian connection, or the workspace has no approved site
- **WHEN** they open the picker
- **THEN** the Jira section explains which is the case rather than showing an empty or failed list

### Requirement: Selecting A Jira Project Lists Its Trackable Issues

Selecting a Jira project in the picker SHALL list its open issues as task options, and issues hidden by Jira permissions MUST be reported as an access state.

#### Scenario: Issues become task options

- **WHEN** the member selects a Jira project in the picker
- **THEN** its open issues are listed as task options
- **AND** the New task option is not offered for a Jira project

#### Scenario: A project private to the member

- **GIVEN** a Jira project whose issues the member's account cannot read
- **WHEN** they select it
- **THEN** the picker says the project is private to them
- **AND** it does not describe the project as having no issues

### Requirement: Starting A Timer On A Jira Issue Creates The Project Through The Server

Starting a timer on a Jira issue MUST create or reuse the GiTiempo project and task server-side, under provider `jira`, resolving by the issue's immutable id first and its Jira project second, and never by name.

#### Scenario: First timer on an issue of an untracked Jira project

- **GIVEN** no GiTiempo project tracks the issue's Jira project
- **WHEN** a member starts a timer on that issue
- **THEN** the server creates a project named after the Jira project, mapped by the Jira project's immutable id
- **AND** it creates the task mapped by the issue's immutable id
- **AND** the timer starts against that task

#### Scenario: The Jira project is already tracked

- **GIVEN** a GiTiempo project already tracks the issue's Jira project
- **WHEN** a member starts a timer on another issue of that Jira project
- **THEN** the existing project is reused
- **AND** no project is created

#### Scenario: A moved issue keeps its task

- **GIVEN** a tracked issue whose Jira key changed because it moved between Jira projects
- **WHEN** a timer is started on it again
- **THEN** resolution by the immutable id finds the existing task
- **AND** a second task is not created for the new key

#### Scenario: An archived tracking project does not block

- **GIVEN** the only GiTiempo project tracking the Jira project is disabled
- **WHEN** a member starts a timer on one of its issues
- **THEN** the flow behaves as the GitHub connector does for archived holders rather than failing with an inactive project

### Requirement: Jira Materialization Is Authorized Against The Site

The backend MUST verify the issue exists and is readable by the caller's connected account on the approved site before creating or reusing anything, and MUST record identifiers Jira reports rather than caller-supplied values.

#### Scenario: Issue outside the approved site is refused

- **WHEN** a member starts a timer for an issue that does not belong to the approved site
- **THEN** the request is refused
- **AND** nothing is created

#### Scenario: Unreadable issue is refused before any write

- **WHEN** verification fails because the account cannot read the issue
- **THEN** no project, task, or time entry is written
