## ADDED Requirements

### Requirement: Project Summaries Are Scope Aware
The system MUST expose project summary data using the requester's project visibility scope.

#### Scenario: Admin reads management project summary
- **GIVEN** the requester is an admin member of the workspace
- **WHEN** the requester calls `GET /projects/management-summary`
- **THEN** `activeProjects` equals the number of active projects in the workspace
- **AND** `privateProjects` equals the number of active private projects in the workspace
- **AND** `publicProjects` equals the number of active public projects in the workspace

#### Scenario: PM reads management project summary
- **GIVEN** the requester is a `pm` member of the workspace
- **WHEN** the requester calls `GET /projects/management-summary`
- **THEN** the counts include active public projects and active assigned projects visible to that PM
- **AND** projects matching both public and assigned scope are counted once
- **AND** inactive projects are excluded

#### Scenario: User reads project summary
- **GIVEN** the requester is an active workspace member
- **WHEN** the requester calls `GET /projects/my-summary`
- **THEN** `visibleProjects` equals the number of active projects visible to the requester
- **AND** `trackedHoursWeek` equals the requester's own completed tracked hours in the current calendar week
- **AND** `trackedHoursMonth` equals the requester's own completed tracked hours in the current calendar month

## MODIFIED Requirements

### Requirement: Project Visibility Is Role And Assignment Scoped

The system MUST enforce project visibility from workspace membership, project visibility, and project assignments.

#### Scenario: Admin lists all projects

- **GIVEN** the requester is an admin member of the workspace
- **WHEN** the requester lists projects
- **THEN** the system returns active and inactive projects in that workspace
- **AND** the result includes both public and private projects

#### Scenario: Non-admin lists active public and assigned projects

- **GIVEN** the requester is a `pm` or `member` in the workspace
- **WHEN** the requester lists projects
- **THEN** the system returns active public projects in that workspace
- **AND** the system returns active private projects assigned to that requester
- **AND** projects matching both public and assigned scope are returned once

#### Scenario: Non-admin can read active public project

- **GIVEN** the requester is a `pm` or `member` in the workspace
- **AND** the project is active and public
- **WHEN** the requester reads that project by id
- **THEN** the system returns the project

#### Scenario: Non-admin can read assigned private project

- **GIVEN** the requester is a `pm` or `member` in the workspace
- **AND** the requester is assigned to an active private project
- **WHEN** the requester reads that project by id
- **THEN** the system returns the project

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

### Requirement: Project Updates Follow Role And Visibility Policy

The system MUST restrict project updates by role, project visibility, and project active state.

#### Scenario: Admin updates any project

- **GIVEN** the requester is an admin member of the workspace
- **WHEN** the requester updates an active or inactive project in that workspace
- **THEN** the system applies the valid mutable project fields

#### Scenario: PM updates visible active project metadata

- **GIVEN** the requester is a `pm` member of the workspace
- **AND** the requester can see an active project through public visibility or assignment
- **WHEN** the requester updates that project's mutable metadata
- **THEN** the system applies the valid mutable project fields except active state

#### Scenario: PM cannot change project active state

- **GIVEN** the requester is a `pm` member of the workspace
- **AND** the requester can see an active project through public visibility or assignment
- **WHEN** the requester attempts to change the project's active state
- **THEN** the system responds with 403 Forbidden

#### Scenario: PM cannot update unassigned private project

- **GIVEN** the requester is a `pm` member of the workspace
- **AND** the requester is not assigned to a private project
- **WHEN** the requester attempts to update that project
- **THEN** the system responds with 404 Not Found

#### Scenario: PM cannot update inactive project

- **GIVEN** the requester is a `pm` member of the workspace
- **AND** the project is inactive
- **WHEN** the requester attempts to update that project
- **THEN** the system responds with 404 Not Found

#### Scenario: Member cannot update project

- **GIVEN** the requester is a `member` with visibility to a project
- **WHEN** the requester attempts to update that project
- **THEN** the system responds with 403 Forbidden

### Requirement: Project Time Entry Visibility Follows Project Visibility
The system MUST use project visibility rules when exposing project-scoped time-entry lists.

#### Scenario: Admin reads time entries for any workspace project
- **GIVEN** the requester is an admin member of the workspace
- **WHEN** the requester lists time entries for a project in that workspace
- **THEN** the system returns time entries for that project

#### Scenario: Non-admin reads active public project time entries
- **GIVEN** the requester is a `pm` or `member` in the workspace
- **AND** the project is active and public
- **WHEN** the requester lists time entries for that project
- **THEN** the system returns time entries for that project

#### Scenario: Assigned non-admin reads active private project time entries
- **GIVEN** the requester is a `pm` or `member` assigned to an active private project
- **WHEN** the requester lists time entries for that project
- **THEN** the system returns time entries for that project

#### Scenario: Unassigned non-admin cannot read private project time entries
- **GIVEN** the requester is a `pm` or `member` not assigned to a private project
- **WHEN** the requester attempts to list time entries for that project
- **THEN** the system responds with 404 Not Found

#### Scenario: Project time entry visibility does not grant mutation rights
- **GIVEN** the requester can view another user's time entry through project visibility
- **WHEN** the requester attempts to update or delete that other user's entry
- **THEN** the system still enforces own-entry mutation rules
