## MODIFIED Requirements

### Requirement: A Timer Started From A GitHub Issue Reuses An Existing Project

Starting a timer from a GitHub issue MUST resolve an existing project in the current workspace and MUST NOT create a project or assignment. An existing issue-task mapping SHALL retain its owning project across direct issue pages and Projects panes. For an issue without a task mapping, the repository's project SHALL take precedence over a verified eligible board's project. Each resolution MUST enforce installation resource access and GiTiempo tracking authorization before materialization or protected response data.

#### Scenario: The repository's project is used when one exists
- **GIVEN** an issue with no task mapping and a GiTiempo project tracking its repository
- **WHEN** an authorized caller starts the timer with valid installation resource access
- **THEN** that project is used and no project or assignment is created

#### Scenario: The board's project is used when the repository has none
- **GIVEN** no task or repository mapping and a uniquely resolved imported board containing the issue
- **WHEN** the backend verifies the board relationship and caller's tracking access
- **THEN** the board's existing project is used
- **AND** no project is created for the repository

#### Scenario: Nothing existing requires deliberate project setup
- **GIVEN** neither the issue, repository, nor a verified eligible board maps to a workspace project
- **WHEN** a timer is started from the issue
- **THEN** the request returns a mapping-required error and creates no records
- **AND** an administrator or project manager must establish the project through the existing deliberate setup/import flow

#### Scenario: An already tracked issue keeps its project when a repository project appears
- **GIVEN** an issue tracked in the project imported for its board and a repository project created afterwards
- **WHEN** an authorized caller starts the same issue from its direct page or a Projects pane
- **THEN** the timer uses the existing task and its owning project on both surfaces

#### Scenario: A different repository project does not override issue ownership
- **GIVEN** a canonical issue-task mapping names a different project than the repository mapping
- **WHEN** a caller starts that issue without a board hint
- **THEN** the existing task's project is authoritative and its access checks apply
- **AND** an access denial cannot fall back to the repository project or create a duplicate task

#### Scenario: Ambiguous or corrupt mappings fail safely
- **GIVEN** no authoritative task/repository mapping and multiple eligible board mappings, or inconsistent duplicate issue ownership
- **WHEN** the backend resolves a timer target
- **THEN** it refuses the request without guessing, exposing protected project data, or writing records
