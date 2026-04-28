## Requirements

### Requirement: Active Workspace Membership Gates Application Access
The system MUST treat an active workspace membership as a prerequisite for application access.

#### Scenario: User with membership is eligible for application access
- **GIVEN** a Firebase identity maps to a local user with an active workspace membership
- **WHEN** that user attempts to establish or renew an application session
- **THEN** the system may issue or refresh application access for that user

#### Scenario: User without membership is denied application access
- **GIVEN** a Firebase identity does not map to an active workspace membership
- **WHEN** that user attempts to establish or renew an application session
- **THEN** the system rejects the request as unauthorized

### Requirement: Workspace Role Is Derived From Membership
The system SHALL derive workspace role from the user's workspace membership record.

#### Scenario: Authenticated request resolves membership role
- **GIVEN** the requester has an active workspace membership
- **WHEN** the system resolves role-aware request context for a protected action
- **THEN** the role is taken from the membership record for that workspace

### Requirement: Admin Can Manage Workspace Members
The system MUST allow admins to list members, change member roles, and remove members from the workspace.

#### Scenario: Admin lists workspace members
- **GIVEN** the requester is an admin member of the current workspace
- **WHEN** the requester asks for the workspace member list
- **THEN** the system returns the members of that workspace with their roles and member identity fields

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

### Requirement: Last Admin Protection
The system MUST prevent the workspace from losing its final admin membership. Admin mutations that check the admin count MUST be serialized per workspace to prevent concurrent operations from violating this invariant.

#### Scenario: Last admin cannot be demoted
- **GIVEN** the target membership is the only admin membership in the workspace
- **WHEN** an admin attempts to change that membership to a non-admin role
- **THEN** the system rejects the request

#### Scenario: Last admin cannot be removed
- **GIVEN** the target membership is the only admin membership in the workspace
- **WHEN** an admin attempts to remove that membership
- **THEN** the system rejects the request

#### Scenario: Concurrent demote operations on last two admins
- **GIVEN** a workspace has exactly two admin memberships
- **AND** two concurrent requests attempt to demote each admin to a non-admin role
- **WHEN** both requests are processed
- **THEN** exactly one request SHALL succeed and the other SHALL be rejected
- **AND** the workspace SHALL retain at least one admin membership
