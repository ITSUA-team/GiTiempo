## MODIFIED Requirements

### Requirement: Boards Are Listed Independently Of GiTiempo Projects

The picker MUST NOT hide a board because a GiTiempo project already tracks one of its repositories. A board is a view over issues that may span several repositories, and one repository's issues may appear on several boards.

#### Scenario: A board whose repository is already tracked still appears

- **GIVEN** a GiTiempo project that already tracks a repository
- **AND** an organization board holding issues from that repository
- **WHEN** the picker lists its targets
- **THEN** both the GiTiempo project and the board are offered

#### Scenario: Starting from a board reuses an existing project for that repository

- **GIVEN** a GiTiempo project already tracks the repository of a board issue
- **AND** the installation can verify all required resources and the member has GiTiempo tracking authorization
- **WHEN** the member starts a timer on that issue from the board
- **THEN** the existing project is reused
- **AND** no duplicate project is created

#### Scenario: A board that was imported as a project receives its own issues

- **GIVEN** a board that an admin added as a GiTiempo project
- **AND** no GiTiempo project tracks the repository of one of its issues
- **AND** the installation can verify all required resources and the member has GiTiempo tracking authorization
- **WHEN** the member starts a timer on that issue from the board
- **THEN** the timer runs against the project that was added for the board
- **AND** no second project is created for the repository

#### Scenario: The repository decides for an issue without a task mapping when both exist

- **GIVEN** a board that was added as a project
- **AND** the issue has no existing local task mapping
- **AND** a separate GiTiempo project tracking the repository of one of its issues
- **AND** the installation can verify all required resources and the member has GiTiempo tracking authorization
- **WHEN** the member starts a timer on that issue from the board
- **THEN** the timer runs against the project tracking the repository
- **AND** time already recorded against that repository is not split away from it

#### Scenario: An issue keeps the project that already holds it

- **GIVEN** an issue already tracked in the project added for its board
- **AND** a project for that issue's repository appears afterwards
- **AND** the installation can verify all required resources and the member has GiTiempo tracking authorization
- **WHEN** the member starts a timer on the same issue from the same board again
- **THEN** the timer runs against the project that already holds it
- **AND** the request is not refused

### Requirement: Starting A Timer On A Board Issue Creates The Project Through The Server
Starting a timer against a board issue SHALL use the existing GitHub start-timer endpoint with the issue's own repository and an optional board hint. Despite this legacy requirement name, the operation MUST resolve an existing authorized GiTiempo project and MUST NOT create projects or assignments. GitHub browsing in the picker SHALL retain its existing personal-account credentials; the start request SHALL use workspace installation authorization consistently with the extension.

#### Scenario: First timer on an unmapped board issue requires setup
- **GIVEN** neither the issue, its repository, nor a verified eligible board maps to a GiTiempo project
- **WHEN** a member starts the timer
- **THEN** the server returns a mapping-required error and creates no project, assignment, task, or entry
- **AND** the picker explains that an administrator or project manager must import/map the project first

#### Scenario: Imported project becomes a valid timer target
- **GIVEN** an authorized administrator or PM has deliberately imported a project and established required assignments
- **WHEN** an authorized member starts an issue timer with valid installation access
- **THEN** the existing project is reused and appears among the member's GiTiempo targets under existing visibility rules
- **AND** the GitHub board remains a distinct selectable board

#### Scenario: Issues from different repositories follow their existing mappings
- **GIVEN** a board contains issues from different repositories
- **WHEN** a member starts timers on them
- **THEN** each issue follows its existing task mapping or the repository-before-board resolution rule
- **AND** each start independently enforces installation permissions and GiTiempo project access

#### Scenario: User-web renders installation or assignment failure
- **GIVEN** a user can browse a board using their personal GitHub account but installation access or GiTiempo tracking authorization is missing
- **WHEN** the start endpoint rejects their request
- **THEN** the picker shows the corresponding installation or project-access remedy
- **AND** it does not present personal reconnection as the remedy
