## ADDED Requirements

### Requirement: Provider-Neutral Project And Task Records
The backend data model MUST keep core project and task records independent from any specific external provider.

#### Scenario: Project stores core fields only
- **GIVEN** a project is stored by the backend
- **WHEN** the project row is represented in the core data model
- **THEN** the row includes workspace ownership, display fields, active state, and timestamps
- **AND** provider-specific identifiers are not stored as project columns

#### Scenario: Task stores core fields only
- **GIVEN** a task is stored by the backend
- **WHEN** the task row is represented in the core data model
- **THEN** the row includes workspace ownership, project ownership, title, status, active state, and timestamps
- **AND** provider-specific identifiers are not stored as task columns

### Requirement: External Provider References Are Stored Separately
The backend data model MUST store provider-specific project and task identity in external reference records.

#### Scenario: Project external reference stores provider identity
- **GIVEN** a core project is linked to an external provider object
- **WHEN** the link is stored
- **THEN** the system stores provider, external type, external id when available, external key, URL, metadata, and sync timestamp outside the project row

#### Scenario: Task external reference stores provider identity
- **GIVEN** a core task is linked to an external provider work item
- **WHEN** the link is stored
- **THEN** the system stores provider, external type, external id when available, external key, URL, metadata, and sync timestamp outside the task row

#### Scenario: Provider lookup remains unique within workspace
- **GIVEN** two external reference records use the same workspace, provider, external type, and external key
- **WHEN** both records would point to different core records
- **THEN** the backend prevents duplicate provider mappings

### Requirement: Project Assignments Model User Visibility
The backend data model MUST model project assignments as workspace-user-to-project visibility records for `pm` and `member` users.

#### Scenario: Assigned user is linked to project
- **GIVEN** a workspace user with role `pm` or `member` is assigned to a project
- **WHEN** the assignment is stored
- **THEN** the assignment references the workspace, project, assigned user, acting assignor, and assignment time
- **AND** when the assignment is created by an admin, `assigned_by` is set to the admin's user ID
- **AND** when the assignment is created automatically because a PM created the project, `assigned_by` is set to the PM creator's own user ID

#### Scenario: Duplicate project assignment is prevented
- **GIVEN** a user is already assigned to a project
- **WHEN** the same user is assigned to the same project again
- **THEN** the backend prevents a duplicate assignment row

#### Scenario: Admin access does not require assignment
- **GIVEN** a user has workspace role `admin`
- **WHEN** the backend stores project visibility state
- **THEN** the admin does not require a project assignment row for project access

### Requirement: Seeded Project And Task Foundation
The backend seed MUST include deterministic project, assignment, and task data for local development and backend tests.

#### Scenario: Seed creates project foundation
- **GIVEN** seed data is applied
- **WHEN** the backend initializes local project/task fixtures
- **THEN** deterministic projects are created in the default workspace
- **AND** deterministic project assignments exist for seeded non-admin users
- **AND** deterministic tasks exist under seeded projects

## MODIFIED Requirements

### Requirement: Project And Task Soft-Disable

Projects and tasks MUST remain representable after deactivation instead of being removed by hard delete.

#### Scenario: Deactivated project remains referenceable

- GIVEN a project is no longer active
- WHEN the project is disabled
- THEN the project remains stored with inactive state
- AND related historical data can still reference it

#### Scenario: Deactivated task remains referenceable

- GIVEN a task is no longer active
- WHEN the task is disabled
- THEN the task remains stored with inactive state
- AND existing time entries continue to reference it
