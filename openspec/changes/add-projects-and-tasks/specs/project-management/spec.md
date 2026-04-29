## ADDED Requirements

### Requirement: Project Visibility Is Role And Assignment Scoped
The system MUST enforce project visibility from workspace membership and project assignments.

#### Scenario: Admin lists all projects
- **GIVEN** the requester is an admin member of the workspace
- **WHEN** the requester lists projects
- **THEN** the system returns active and inactive projects in that workspace

#### Scenario: Non-admin lists assigned active projects
- **GIVEN** the requester is a `pm` or `member` in the workspace
- **WHEN** the requester lists projects
- **THEN** the system returns only active projects assigned to that requester

#### Scenario: Non-admin cannot read unassigned project
- **GIVEN** the requester is a `pm` or `member` in the workspace
- **AND** the requester is not assigned to a project
- **WHEN** the requester reads that project by id
- **THEN** the system responds with 404 Not Found

#### Scenario: Non-admin cannot read inactive assigned project
- **GIVEN** the requester is a `pm` or `member` assigned to a project
- **AND** the project is inactive
- **WHEN** the requester reads that project by id
- **THEN** the system responds with 404 Not Found

### Requirement: Admin And PM Can Create Projects
The system MUST allow admins and project managers to create provider-neutral projects.

#### Scenario: Admin creates project
- **GIVEN** the requester is an admin member of the workspace
- **WHEN** the requester creates a project with valid project fields
- **THEN** the system creates the project in the requester's workspace
- **AND** the admin does not require a project assignment row for access

#### Scenario: PM creates project and is assigned
- **GIVEN** the requester is a `pm` member of the workspace
- **WHEN** the requester creates a project with valid project fields
- **THEN** the system creates the project in the requester's workspace
- **AND** the system assigns the requester to the created project

#### Scenario: Member cannot create project
- **GIVEN** the requester is a `member` in the workspace
- **WHEN** the requester attempts to create a project
- **THEN** the system responds with 403 Forbidden

### Requirement: Project Updates Follow Role And Visibility Policy
The system MUST restrict project updates by role and project visibility.

#### Scenario: Admin updates any project
- **GIVEN** the requester is an admin member of the workspace
- **WHEN** the requester updates an active or inactive project in that workspace
- **THEN** the system applies the valid mutable project fields

#### Scenario: PM updates assigned project
- **GIVEN** the requester is a `pm` member of the workspace
- **AND** the requester is assigned to an active project
- **WHEN** the requester updates that project's name or color
- **THEN** the system applies the valid mutable project fields

#### Scenario: PM cannot change project active state
- **GIVEN** the requester is a `pm` member of the workspace
- **AND** the requester is assigned to an active project
- **WHEN** the requester attempts to change the project's active state
- **THEN** the system responds with 403 Forbidden

#### Scenario: PM cannot update unassigned project
- **GIVEN** the requester is a `pm` member of the workspace
- **AND** the requester is not assigned to a project
- **WHEN** the requester attempts to update that project
- **THEN** the system responds with 404 Not Found

#### Scenario: Member cannot update project
- **GIVEN** the requester is a `member` assigned to an active project
- **WHEN** the requester attempts to update that project
- **THEN** the system responds with 403 Forbidden

### Requirement: Admin Manages Project Assignments
The system MUST allow admins to list, create, and remove project assignments for `pm` and `member` workspace users.

#### Scenario: Admin lists project assignments
- **GIVEN** the requester is an admin member of the workspace
- **WHEN** the requester lists assignments for a project in that workspace
- **THEN** the system returns the assigned users for that project

#### Scenario: Admin assigns PM or member to project
- **GIVEN** the requester is an admin member of the workspace
- **AND** the target user is an active workspace member with role `pm` or `member`
- **WHEN** the requester assigns the target user to a project
- **THEN** the target user gains visibility to that active project

#### Scenario: Admin cannot assign another admin
- **GIVEN** the requester is an admin member of the workspace
- **AND** the target user has role `admin`
- **WHEN** the requester attempts to assign the target user to a project
- **THEN** the system responds with 422 Unprocessable Entity

#### Scenario: Non-admin cannot manage assignments
- **GIVEN** the requester is authenticated but not an admin member of the workspace
- **WHEN** the requester attempts to list, create, or remove project assignments
- **THEN** the system responds with 403 Forbidden

#### Scenario: Assignment survives PM member role changes
- **GIVEN** a user is assigned to a project
- **WHEN** the user's workspace role changes between `pm` and `member`
- **THEN** the assignment remains stored
- **AND** the user's role controls allowed actions while the assignment controls project visibility
