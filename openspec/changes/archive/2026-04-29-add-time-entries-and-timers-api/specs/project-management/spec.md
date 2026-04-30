## ADDED Requirements

### Requirement: Project Time Entry Visibility Follows Project Visibility
The system MUST use project visibility rules when exposing project-scoped time-entry lists.

#### Scenario: Admin reads time entries for any workspace project
- **GIVEN** the requester is an admin member of the workspace
- **WHEN** the requester lists time entries for a project in that workspace
- **THEN** the system returns time entries for that project

#### Scenario: Assigned non-admin reads active project time entries
- **GIVEN** the requester is a `pm` or `member` assigned to an active project
- **WHEN** the requester lists time entries for that project
- **THEN** the system returns time entries for that project

#### Scenario: Unassigned non-admin cannot read project time entries
- **GIVEN** the requester is a `pm` or `member` not assigned to a project
- **WHEN** the requester attempts to list time entries for that project
- **THEN** the system responds with 404 Not Found

#### Scenario: Project time entry visibility does not grant mutation rights
- **GIVEN** the requester can view another user's time entry through project visibility
- **WHEN** the requester attempts to update or delete that other user's entry
- **THEN** the system still enforces own-entry mutation rules
