## ADDED Requirements

### Requirement: Admin And PM Can Import Jira Projects As Projects

An admin or PM SHALL be able to add an approved-site Jira project as a GiTiempo project through a dedicated import request, supplying the same local settings a directly created project takes. The system MUST read the project's identity from Jira using the caller's connected account, MUST refuse a Jira project an active GiTiempo project already tracks, naming it, and MUST refuse a name an active project already holds.

#### Scenario: Import creates the mapped project

- **WHEN** an authorized member imports a readable Jira project from the approved site
- **THEN** a GiTiempo project is created carrying the chosen settings
- **AND** it is mapped by the Jira project's immutable id, with the key stored for display

#### Scenario: An already tracked Jira project is refused

- **GIVEN** an active GiTiempo project already tracks the Jira project
- **WHEN** it is imported again
- **THEN** the response refuses, naming the tracking project
- **AND** nothing is written

#### Scenario: A tracking project that is archived does not block

- **GIVEN** the only project tracking the Jira project is disabled
- **WHEN** the Jira project is imported
- **THEN** the import succeeds and takes the mapping over
- **AND** the disabled project keeps its tasks, time entries, and assignments

### Requirement: A Timer Started From A Jira Issue Reuses An Existing Project

Starting a timer from a Jira issue MUST reuse the GiTiempo project that tracks the issue's Jira project before creating one, resolving by external references and never by name.

#### Scenario: Tracked issue keeps its project

- **GIVEN** an issue already tracked as a task
- **WHEN** a timer is started on it from any surface
- **THEN** the task's project is used unchanged

#### Scenario: The Jira project's GiTiempo project is reused

- **GIVEN** no task tracks the issue but a project tracks its Jira project
- **WHEN** a timer is started on the issue
- **THEN** that project is used
- **AND** no project is created

#### Scenario: Renamed projects change nothing

- **GIVEN** the tracking GiTiempo project was renamed to something unlike the Jira project
- **WHEN** a timer is started on one of its issues
- **THEN** resolution by the stored mapping still finds it
