## MODIFIED Requirements

### Requirement: Admin Can Manage Workspace Members
The system MUST allow admins to list members, change member roles, and remove members from the workspace.

#### Scenario: Admin lists workspace members
- **GIVEN** the requester is an admin member of the current workspace
- **WHEN** the requester asks for the workspace member list
- **THEN** the system returns the members of that workspace with their roles and member identity fields
- **AND** each member record includes a last-activity timestamp (nullable)
- **AND** each member record includes a count of project assignments within the workspace

#### Scenario: Admin changes a member role
- **GIVEN** the requester is an admin member of the current workspace
- **WHEN** the requester submits a valid role change for another workspace member
- **THEN** the system updates that member's role in the workspace

#### Scenario: Admin removes a member
- **GIVEN** the requester is an admin member of the current workspace
- **WHEN** the requester removes another workspace member
- **THEN** the system deletes that membership from the workspace

#### Scenario: Non-admin attempts member administration
- **GIVEN** the requester is authenticated but is not an admin member of the current workspace
- **WHEN** the requester attempts to list, update, or remove workspace members
- **THEN** the system rejects the request as forbidden

## ADDED Requirements

### Requirement: Member List Includes Project Assignment Count
The workspace member list response SHALL include the count of active project assignments per member within the workspace.

#### Scenario: Member with assignments shows correct count
- **GIVEN** a workspace member is assigned to 3 projects in the workspace
- **WHEN** an admin lists workspace members
- **THEN** that member's project assignment count is 3

#### Scenario: Member with no assignments shows zero count
- **GIVEN** a workspace member has no project assignments in the workspace
- **WHEN** an admin lists workspace members
- **THEN** that member's project assignment count is 0

#### Scenario: Assignment count reflects workspace scope
- **GIVEN** a user has assignments in multiple workspaces
- **WHEN** an admin lists members for one workspace
- **THEN** the count only includes assignments within that workspace

### Requirement: Member List Includes Last Activity
The workspace member list response SHALL include the user's last-activity timestamp.

#### Scenario: Member with recorded activity shows timestamp
- **GIVEN** a workspace member has performed time-tracking operations
- **WHEN** an admin lists workspace members
- **THEN** that member's last-activity timestamp reflects their most recent time-tracking write

#### Scenario: Member with no recorded activity shows null
- **GIVEN** a workspace member has never performed a time-tracking operation since the feature was deployed
- **WHEN** an admin lists workspace members
- **THEN** that member's last-activity timestamp is null
