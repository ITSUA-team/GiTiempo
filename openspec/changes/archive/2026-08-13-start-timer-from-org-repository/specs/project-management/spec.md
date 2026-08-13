## ADDED Requirements

### Requirement: Admin And PM Can Import GitHub Projects As Projects

An admin or PM SHALL be able to add an organization's GitHub Project as a GiTiempo project through a dedicated import request, and MUST be able to supply the same visibility and default-billable settings a directly created project takes. A project that is already imported MUST be reported without being modified, and one refused project MUST NOT abort the rest of the request.

The caller MUST supply only the GitHub project id and those local settings. The system MUST read the project's owner, title, number, and URL from GitHub using the caller's connected account, and MUST decide the organization policy from the owner GitHub reports rather than any value in the request.

#### Scenario: Import stores the settings the caller chose

- **GIVEN** an admin importing a GitHub project with a visibility and a billable default
- **WHEN** the request succeeds
- **THEN** the created project carries both values

#### Scenario: Omitted settings fall back to the stored defaults

- **WHEN** a GitHub project is imported without a visibility or a billable default
- **THEN** the created project takes the same defaults a project created without them would take

#### Scenario: A visibility the workspace cannot store is refused

- **WHEN** the request carries a visibility outside the supported values
- **THEN** the request is refused before anything is written

#### Scenario: Stored provenance comes from GitHub, not the request

- **WHEN** a GitHub project is imported
- **THEN** the project name, external URL, and stored owner, title, and number are the values GitHub reported for that project id
- **AND** a request carrying any of those values is refused rather than having them ignored

#### Scenario: An organization outside the policy is reported per project

- **GIVEN** a request holding one project whose GitHub owner is an approved organization and one whose owner is not
- **WHEN** the request is processed
- **THEN** the approved project is imported
- **AND** the other is reported as failed, without being written
- **AND** the failure does not abort the request

#### Scenario: A project the caller cannot see is refused

- **WHEN** the supplied project id resolves to nothing for the caller's connected GitHub account
- **THEN** the project is reported as failed
- **AND** no project, external reference, or organization decision is derived from the request

#### Scenario: Importing twice does not modify the existing project

- **GIVEN** a GitHub project that has already been imported
- **WHEN** it is imported again with different settings
- **THEN** the response reports it as already imported
- **AND** the existing project keeps the settings it had

### Requirement: A Timer Started From A GitHub Issue Reuses An Existing Project

Starting a timer from a GitHub issue MUST reuse a project the workspace already has for that work before creating one. The project tracking the issue's repository takes precedence, so time already recorded against a repository is never split away from it; a project added for the board the issue was started from is used only when the repository has none. An issue that is already tracked MUST keep the project that holds it rather than being refused.

#### Scenario: The repository's project is used when one exists

- **GIVEN** a GiTiempo project tracking the issue's repository
- **WHEN** a timer is started from that issue
- **THEN** that project is used
- **AND** no project is created

#### Scenario: The board's project is used when the repository has none

- **GIVEN** no project tracks the issue's repository
- **AND** the board the issue was started from was imported as a project
- **WHEN** a timer is started from that issue
- **THEN** the board's project is used
- **AND** no project is created for the repository

#### Scenario: Nothing existing means a project is still created for the repository

- **GIVEN** neither the repository nor the board has a project
- **WHEN** a timer is started from the issue
- **THEN** a project is created for the repository, named after it, as before

#### Scenario: An already tracked issue is not refused when a repository project appears

- **GIVEN** an issue tracked in the project imported for its board
- **AND** a project for that repository created afterwards
- **WHEN** a timer is started from the same issue through the same board
- **THEN** the timer runs against the project that already holds the issue

#### Scenario: Two projects disagreeing about one issue is still refused

- **GIVEN** an issue whose task belongs to a project other than the one its repository reference names
- **AND** no board naming that task's project in the request
- **WHEN** a timer is started from that issue
- **THEN** the request is refused rather than guessing which project owns it
