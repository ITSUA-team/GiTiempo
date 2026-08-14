## MODIFIED Requirements

### Requirement: Admin And PM Can Import GitHub Projects As Projects

An admin or PM SHALL be able to add an organization's GitHub Project as a GiTiempo project through a dedicated import request, and MUST be able to supply the same visibility and default-billable settings a directly created project takes. A project that is already imported MUST be reported without being modified, and one refused project MUST NOT abort the rest of the request.

A GitHub project whose repository is already tracked by another GiTiempo project MUST be refused without writing anything, and the refusal MUST name the project that tracks the repository. The relation MUST be detected the way GitHub treats identity, so letter casing cannot hide it.

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

#### Scenario: A repository tracked by another project refuses the import

- **GIVEN** a GitHub project whose only repository is already tracked by a different GiTiempo project
- **WHEN** it is imported
- **THEN** the response reports it as refused, naming the project that tracks the repository
- **AND** no project, external reference, or assignment is written
- **AND** the refusal does not abort the rest of the request

#### Scenario: Letter casing cannot hide the tracked repository

- **GIVEN** the tracking project's stored repository key differs from the board's repository only by letter case
- **WHEN** the board is imported
- **THEN** the relation is still detected and the import is refused the same way

#### Scenario: A repository tracked by an archived project still refuses the import

- **GIVEN** the only project tracking the board's repository is disabled
- **WHEN** the board is imported
- **THEN** the import is refused naming that project
- **AND** the response states that the tracking project is archived

### Requirement: Admin And PM Can Create Projects

The system MUST allow admins and project managers to create provider-neutral projects. A project name already held by an active project in the same workspace MUST be refused as a conflict, compared without regard to letter case, and the refusal MUST name the collision rather than surfacing a storage error.

#### Scenario: Admin creates project

- **GIVEN** the requester is an admin member of the workspace
- **WHEN** the requester creates a project with valid project fields
- **THEN** the system creates the project in the requester's workspace
- **AND** the admin does not require a project assignment row for access

#### Scenario: PM creates project and is assigned

- **GIVEN** the requester is a `pm` member of the workspace
- **WHEN** the requester creates a project with valid project fields
- **THEN** the system creates the project in the requester's workspace
- **AND** the system assigns the requester to the created project

#### Scenario: Member cannot create project

- **GIVEN** the requester is a `member` in the workspace
- **WHEN** the requester attempts to create a project
- **THEN** the system responds with 403 Forbidden

#### Scenario: A name an active project already holds is refused

- **GIVEN** an active project in the workspace
- **WHEN** an authorized requester creates a project whose name matches it in any letter casing
- **THEN** the system responds with a conflict identifying the name
- **AND** no project is created

#### Scenario: A name held only by a disabled project is accepted

- **GIVEN** the only project holding a name is disabled
- **WHEN** an authorized requester creates a project with that name
- **THEN** the project is created

## ADDED Requirements

### Requirement: Renaming A Project Cannot Collide With An Active Project

Renaming a project MUST refuse a name an active project in the same workspace already holds, compared without regard to letter case. A project MUST remain able to keep its own name.

#### Scenario: Rename onto another active project's name is refused

- **GIVEN** two active projects in a workspace
- **WHEN** one is renamed to the other's name in any letter casing
- **THEN** the system responds with a conflict identifying the name
- **AND** neither project is changed

#### Scenario: Saving a project without changing its name succeeds

- **GIVEN** an active project
- **WHEN** it is updated with its own name unchanged
- **THEN** the update succeeds

#### Scenario: Changing only the casing of a project's own name succeeds

- **GIVEN** an active project
- **WHEN** it is renamed to the same name in different letter casing
- **THEN** the update succeeds
- **AND** the stored name uses the new casing
