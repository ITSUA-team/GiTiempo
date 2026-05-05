## ADDED Requirements

### Requirement: Project Visibility Is Stored

The backend data model MUST store project visibility as part of the core project record.

#### Scenario: New project defaults to private visibility

- **GIVEN** a project is created without an explicit visibility value
- **WHEN** the backend stores the project
- **THEN** the project visibility is `private`

#### Scenario: Existing projects are backfilled as private

- **GIVEN** existing project rows predate the visibility column
- **WHEN** the visibility migration is applied
- **THEN** those project rows have `private` visibility

#### Scenario: Project visibility is constrained

- **GIVEN** a project row is stored
- **WHEN** the backend records project visibility
- **THEN** the value is either `public` or `private`

### Requirement: Project Source Is Derived From External References

The backend MUST derive public project source from provider reference records instead of storing provider identity on the project row.

#### Scenario: Project with GitHub reference has GitHub source

- **GIVEN** a project has a project external reference with provider `github`
- **WHEN** the backend derives the project source
- **THEN** the derived source is `github`

#### Scenario: Project without recognized provider references has manual source

- **GIVEN** a project has no recognized project external reference
- **WHEN** the backend derives the project source
- **THEN** the derived source is `manual`

### Requirement: Project Hour Totals Use Completed Time Entries

The backend MUST derive project hour totals from completed time entries linked through project tasks.

#### Scenario: Project total includes completed entries

- **GIVEN** a project has tasks with completed time entries
- **WHEN** the backend derives the project total hours
- **THEN** the total equals the sum of completed entry durations for those tasks expressed in hours

#### Scenario: Project total excludes running entries

- **GIVEN** a project has a running time entry without a duration
- **WHEN** the backend derives the project total hours
- **THEN** that running entry does not increase the total

#### Scenario: Project with no completed entries has zero hours

- **GIVEN** a project has no completed time entries
- **WHEN** the backend derives the project total hours
- **THEN** the total is zero

## MODIFIED Requirements

### Requirement: Provider-Neutral Project And Task Records

The backend data model MUST keep core project and task records independent from any specific external provider.

#### Scenario: Project stores core fields only

- **GIVEN** a project is stored by the backend
- **WHEN** the project row is represented in the core data model
- **THEN** the row includes workspace ownership, display fields, visibility, active state, and timestamps
- **AND** provider-specific identifiers are not stored as project columns

#### Scenario: Task stores core fields only

- **GIVEN** a task is stored by the backend
- **WHEN** the task row is represented in the core data model
- **THEN** the row includes workspace ownership, project ownership, title, status, active state, and timestamps
- **AND** provider-specific identifiers are not stored as task columns

### Requirement: Project Assignments Model User Visibility

The backend data model MUST model project assignments as workspace-user-to-project visibility records for private project access by `pm` and `member` users.

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

#### Scenario: Public access does not require assignment

- **GIVEN** a user has workspace role `pm` or `member`
- **AND** a project is public and active
- **WHEN** the backend stores project visibility state
- **THEN** the user does not require a project assignment row for project access
