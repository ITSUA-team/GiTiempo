## MODIFIED Requirements

### Requirement: Project Visibility Is Role And Assignment Scoped

The system MUST enforce project visibility from workspace membership, project visibility, and project assignments. Every returned project object MUST include a `memberCount` field (integer ≥ 0) representing the total number of workspace members assigned to that project, and MUST include `isActive` indicating the active status of the project.

#### Scenario: Admin lists all projects

- **GIVEN** the requester is an admin member of the workspace
- **WHEN** the requester lists projects
- **THEN** the system returns active and inactive projects in that workspace
- **AND** the result includes both public and private projects
- **AND** each project includes `memberCount` with the correct count of assigned members
- **AND** each project includes `isActive`

#### Scenario: Non-admin lists active public and assigned projects

- **GIVEN** the requester is a `pm` or `member` in the workspace
- **WHEN** the requester lists projects
- **THEN** the system returns active public projects in that workspace
- **AND** the system returns active private projects assigned to that requester
- **AND** projects matching both public and assigned scope are returned once
- **AND** each project includes `memberCount` with the correct count of assigned members

#### Scenario: Non-admin can read active public project

- **GIVEN** the requester is a `pm` or `member` in the workspace
- **AND** the project is active and public
- **WHEN** the requester reads that project by id
- **THEN** the system returns the project
- **AND** the project includes `memberCount`

#### Scenario: Non-admin can read assigned private project

- **GIVEN** the requester is a `pm` or `member` in the workspace
- **AND** the requester is assigned to an active private project
- **WHEN** the requester reads that project by id
- **THEN** the system returns the project
- **AND** the project includes `memberCount`

#### Scenario: Non-admin cannot read unassigned private project

- **GIVEN** the requester is a `pm` or `member` in the workspace
- **AND** the requester is not assigned to a private project
- **WHEN** the requester reads that project by id
- **THEN** the system responds with 404 Not Found

#### Scenario: Non-admin cannot read inactive project

- **GIVEN** the requester is a `pm` or `member` in the workspace
- **AND** the project is inactive
- **WHEN** the requester reads that project by id
- **THEN** the system responds with 404 Not Found
