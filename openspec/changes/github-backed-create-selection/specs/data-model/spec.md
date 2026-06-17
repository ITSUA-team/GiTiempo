## ADDED Requirements

### Requirement: Create-Flow External References Preserve Provider Identity
The backend data model SHALL store external provider references created during project and task create flows using the same separate external reference records and uniqueness rules as other provider links.

#### Scenario: GitHub-backed project create stores project reference
- **GIVEN** a local project is created from a GitHub repository or Project V2 candidate
- **WHEN** the provider link is stored
- **THEN** the system SHALL store provider `github`, external type, external id when available, external key, URL, metadata, and sync timestamp outside the project row
- **AND** provider-specific identifiers SHALL NOT be stored as project columns

#### Scenario: GitHub-backed task create stores task reference
- **GIVEN** a local task is created from a GitHub issue candidate
- **WHEN** the provider link is stored
- **THEN** the system SHALL store provider `github`, external type, external id when available, external key, URL, metadata, and sync timestamp outside the task row
- **AND** provider-specific identifiers SHALL NOT be stored as task columns

#### Scenario: Create-flow provider lookup remains unique within workspace
- **GIVEN** an external reference was stored from a create-flow GitHub selection
- **WHEN** another create-flow request attempts to store the same workspace, provider, external type, and external key for a different core record
- **THEN** the backend SHALL prevent the duplicate provider mapping
- **AND** the core project or task create operation SHALL fail atomically with the reference insert

#### Scenario: Manual create leaves no external reference
- **GIVEN** a project or task is created without provider-reference metadata
- **WHEN** the backend stores the core record
- **THEN** no project or task external reference SHALL be created for that manual request
- **AND** core project and task records SHALL remain provider-neutral
