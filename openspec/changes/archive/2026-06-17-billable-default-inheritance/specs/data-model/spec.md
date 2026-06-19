## ADDED Requirements

### Requirement: Project And Task Billable Defaults Are Stored
The backend data model MUST persist default billable values on project and task records so future child records can inherit billable state without relying on frontend-only defaults.

#### Scenario: Project stores default for new tasks
- **GIVEN** a project row is stored
- **WHEN** the row is represented in the core data model
- **THEN** the row includes a non-null boolean default billable value for new tasks

#### Scenario: Task stores default for new time entries
- **GIVEN** a task row is stored
- **WHEN** the row is represented in the core data model
- **THEN** the row includes a non-null boolean default billable value for new time entries

#### Scenario: Existing rows are backfilled with billable defaults
- **GIVEN** existing project and task rows predate the default billable columns
- **WHEN** the billable-default migration is applied
- **THEN** existing project rows receive a default billable value of `true` for new tasks
- **AND** existing task rows receive a default billable value of `true` for new time entries

#### Scenario: Time entries keep explicit billable state
- **GIVEN** a time entry row is stored
- **WHEN** project or task default billable values exist
- **THEN** the time entry row still stores its own non-null billable value
- **AND** the time entry row does not derive billable state dynamically from the current project or task default
