## ADDED Requirements

### Requirement: Project Response Includes Member Count

Every project response object MUST include a `memberCount` field that reflects the total number of workspace members currently assigned to that project via the `project_assignments` table.

#### Scenario: Project with multiple assignments returns correct count

- **GIVEN** a project has 3 workspace members assigned to it
- **WHEN** a requester retrieves that project (via list or single-project GET)
- **THEN** the response includes `memberCount: 3`

#### Scenario: Project with no assignments returns zero

- **GIVEN** a project has no members assigned to it
- **WHEN** a requester retrieves that project
- **THEN** the response includes `memberCount: 0`

#### Scenario: Member count is consistent across list and single-project endpoints

- **GIVEN** a project has 2 members assigned
- **WHEN** the requester lists all projects
- **AND** the requester reads the same project by id
- **THEN** both responses return `memberCount: 2` for that project
