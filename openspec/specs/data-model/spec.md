# Backend Data Model Specification

## Purpose

Define the observable backend data-model behavior that the API and future changes rely on for users, workspace structure, task tracking, and billing.
## Requirements
### Requirement: Single-Tenant Workspace Ownership

The system SHALL operate as a single-tenant MVP with one seeded default workspace that owns operational records.

#### Scenario: Seeded workspace foundation exists for initial deployment

- GIVEN the application is initialized for the first time
- WHEN seed data is applied
- THEN a default workspace is created
- AND a default workspace settings record is created for that workspace
- AND an initial admin membership exists in that workspace
- AND operational records attach to that workspace context

### Requirement: Firebase-Backed User Identity

Each local user record MUST be uniquely associated with one Firebase identity.

#### Scenario: Firebase identity maps to local user

- GIVEN a verified Firebase identity signs in
- WHEN the backend resolves the local user record
- THEN the lookup uses the unique Firebase UID
- AND the same Firebase UID cannot belong to more than one user record

### Requirement: One Running Timer Per User

The system MUST prevent a user from having multiple running timers at the same time, including under concurrent timer-start requests.

#### Scenario: Start a timer when no timer is running

- GIVEN a user has no running time entry
- WHEN the user starts a timer
- THEN the backend creates one running time entry for that user

#### Scenario: Start a second timer while one is active

- GIVEN a user already has a running time entry
- WHEN the user attempts to start another timer
- THEN the backend rejects or prevents creation of a second concurrent running time entry

#### Scenario: Concurrent timer starts are constrained by storage

- GIVEN two requests attempt to start timers for the same user at the same time
- WHEN both requests reach persistence
- THEN at most one running time entry is stored for that user

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

### Requirement: Invoice Snapshot Totals

Invoices MUST keep snapshot totals that are not automatically recalculated by later time-entry edits.

#### Scenario: Invoice preserves historical totals

- GIVEN an invoice has been created from a set of time entries
- WHEN one of those time entries changes later
- THEN the existing invoice totals remain as originally captured
- AND linked time entries stay associated with the invoice unless explicitly changed

### Requirement: Single Workspace Membership Per Application User

The system MUST model workspace membership separately from user identity in the single-tenant MVP.

#### Scenario: Application user has workspace membership

- **GIVEN** a user has been onboarded into the application workspace
- **WHEN** the backend resolves application access for that user
- **THEN** it uses a workspace membership record associated with that user and workspace

### Requirement: Invite-Backed Membership Creation

The system SHALL create new application membership through the invite-acceptance flow after the initial seeded admin.

#### Scenario: Invited user joins workspace

- **GIVEN** a valid pending invite exists for a user email
- **WHEN** that invite is accepted by the matching Firebase identity
- **THEN** the backend creates the local user if needed
- **AND** creates the workspace membership with the invited role

### Requirement: Time Entry Records Are Stored
The backend data model MUST store task-linked time entries as workspace-owned records associated with the user who tracked the time.

#### Scenario: Completed time entry is stored
- **GIVEN** a completed time entry is created
- **WHEN** the backend stores the entry
- **THEN** the row references the workspace, task, and user
- **AND** stores start time, end time, duration seconds, description, billable state, source, and timestamps

#### Scenario: Running time entry is stored
- **GIVEN** a timer is started
- **WHEN** the backend stores the entry
- **THEN** the row references the workspace, task, and user
- **AND** stores the start time
- **AND** leaves end time and duration empty while the timer is running

#### Scenario: Time entry source is constrained
- **GIVEN** a time entry is stored
- **WHEN** the backend records the entry source
- **THEN** the source is one of `web`, `extension`, or `manual`

#### Scenario: Invoice linkage is deferred
- **GIVEN** time-entry persistence is introduced before invoices
- **WHEN** the backend stores a time entry in this change
- **THEN** the row does not require invoice linkage

### Requirement: Time Entry Duration Invariants
The backend data model MUST keep completed and running time-entry duration state internally consistent.

#### Scenario: Running entry has no duration
- **GIVEN** a time entry is running
- **WHEN** the row is stored
- **THEN** `ended_at` is empty
- **AND** `duration_seconds` is empty

#### Scenario: Completed entry has positive duration
- **GIVEN** a time entry is completed
- **WHEN** the row is stored
- **THEN** `ended_at` is later than `started_at`
- **AND** `duration_seconds` is a positive integer

#### Scenario: Invalid duration state is rejected
- **GIVEN** a write would store inconsistent end time and duration state
- **WHEN** the backend attempts to persist the row
- **THEN** the database prevents the invalid time-entry state

