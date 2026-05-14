## MODIFIED Requirements

### Requirement: Visible Project Tasks Can Be Listed

The system MUST list active tasks by default only when the requester has visibility to the task's active project.

#### Scenario: Admin lists active tasks for project

- **GIVEN** the requester is an admin member of the workspace
- **AND** the project is active
- **WHEN** the requester lists tasks for a project in that workspace
- **THEN** the system returns active tasks for that project
- **AND** inactive tasks are excluded from the default response

#### Scenario: Assigned non-admin lists active project tasks

- **GIVEN** the requester is a `pm` or `member` assigned to an active project
- **WHEN** the requester lists tasks for that project
- **THEN** the system returns active tasks for that project
- **AND** inactive tasks are excluded from the default response

#### Scenario: Unassigned non-admin cannot list project tasks

- **GIVEN** the requester is a `pm` or `member` not assigned to a project
- **WHEN** the requester attempts to list tasks for that project
- **THEN** the system responds with 404 Not Found

#### Scenario: Non-admin cannot list inactive project tasks

- **GIVEN** the requester is a `pm` or `member`
- **AND** the project is inactive
- **WHEN** the requester attempts to list tasks for that project
- **THEN** the system responds with 404 Not Found
