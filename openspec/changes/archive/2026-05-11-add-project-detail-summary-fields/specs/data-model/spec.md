## MODIFIED Requirements

### Requirement: Provider-Neutral Project And Task Records

The backend data model MUST keep core project and task records independent from any specific external provider.

#### Scenario: Project stores core fields only

- **GIVEN** a project is stored by the backend
- **WHEN** the project row is represented in the core data model
- **THEN** the row includes workspace ownership, display fields, editable description, visibility, active state, and timestamps
- **AND** provider-specific identifiers are not stored as project columns

#### Scenario: Task stores core fields only

- **GIVEN** a task is stored by the backend
- **WHEN** the task row is represented in the core data model
- **THEN** the row includes workspace ownership, project ownership, title, status, active state, and timestamps
- **AND** provider-specific identifiers are not stored as task columns
