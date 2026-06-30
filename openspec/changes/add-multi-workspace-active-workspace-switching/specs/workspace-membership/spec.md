## ADDED Requirements

### Requirement: Multiple Workspace Memberships Are Independently Selectable

The system SHALL support a user holding active memberships in multiple workspaces while keeping each authenticated API session bound to exactly one active workspace context.

#### Scenario: User belongs to multiple workspaces

- **GIVEN** a local user has active memberships in two or more workspaces
- **WHEN** the system evaluates application access for that user
- **THEN** each membership remains independently usable
- **AND** each issued access token carries exactly one workspace ID and role

#### Scenario: Role is derived from selected membership

- **GIVEN** a user has different roles in different workspaces
- **WHEN** the user switches the active workspace
- **THEN** the next issued access token uses the role from the selected workspace membership
- **AND** protected endpoints authorize the user according to that selected role

#### Scenario: Removed membership is not selectable

- **GIVEN** a user previously belonged to a workspace
- **AND** that workspace membership has been removed
- **WHEN** the user lists or switches workspace memberships
- **THEN** the removed membership is not returned as selectable
- **AND** switching to that workspace is rejected

### Requirement: Initial Active Workspace Selection Is Deterministic

The system MUST choose a deterministic active workspace when login succeeds for a user with more than one active membership and no explicit selected workspace exists in the request.

#### Scenario: Login selects one membership for multi-workspace user

- **GIVEN** a verified Firebase identity maps to a local user with multiple active workspace memberships
- **WHEN** the user logs in without an explicit selected workspace
- **THEN** the backend issues exactly one token pair
- **AND** the access token carries one deterministic workspace ID and role
- **AND** the user can switch to another membership after login through the active-workspace switch flow
