## MODIFIED Requirements

### Requirement: Admin Can Manage Workspace Members

The system MUST allow admins to list members, change member roles, and remove members from the workspace. Listing members MUST return enough context for admin UIs to render activity and assignment information without N+1 fetches.

#### Scenario: Admin lists workspace members

- **GIVEN** the requester is an admin member of the current workspace
- **WHEN** the requester asks for the workspace member list
- **THEN** the system returns the members of that workspace with their roles and member identity fields
- **AND** each returned member includes the timestamp of that member's last tracked activity, or a null value when no activity has been recorded
- **AND** each returned member includes the count of project assignments held by that member in that workspace

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
