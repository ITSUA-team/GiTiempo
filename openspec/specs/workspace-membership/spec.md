# Workspace Membership Specification

## Purpose

Define workspace membership as the prerequisite for application access, including safe first-workspace provisioning and membership-bound session renewal.

## Requirements

### Requirement: Active Workspace Membership Gates Application Access
The system MUST treat an active workspace membership as a prerequisite for application access. Eligible Google or GitHub sign-in with zero memberships SHALL create a personal workspace and admin membership before issuing access. Authenticated recovery proving the exact UID of a retained manual-registration reservation SHALL complete or reuse that original foundation before issuing access. Other membership-less login and all refresh attempts without the issued membership MUST remain unauthorized.

#### Scenario: User with membership is eligible for application access
- **GIVEN** a verified identity maps to a local user with an active workspace membership
- **WHEN** that user establishes or renews an application session
- **THEN** the system may issue or refresh application access for that membership

#### Scenario: Eligible social user receives membership before access
- **GIVEN** a verified Google or GitHub identity resolves to an account with zero memberships
- **WHEN** ordinary sign-in completes successfully
- **THEN** the system creates the personal workspace and admin membership before issuing the session
- **AND** protected requests use that persisted membership's workspace and role

#### Scenario: User without membership is denied application access
- **GIVEN** a verified identity has no membership and is completing neither eligible social sign-in nor authenticated exact-UID recovery of its original manual-registration reservation
- **WHEN** that user attempts to establish an application session
- **THEN** the system rejects the request as unauthorized

#### Scenario: Renewal cannot create membership
- **GIVEN** a refresh session's selected membership has been removed
- **WHEN** the user attempts to renew that session
- **THEN** the system rejects the request as unauthorized
- **AND** it does not create or select a replacement membership

### Requirement: Workspace Role Is Derived From Membership
The system SHALL derive workspace role from the user's workspace membership record.

#### Scenario: Authenticated request resolves membership role
- **GIVEN** the requester has an active workspace membership
- **WHEN** the system resolves role-aware request context for a protected action
- **THEN** the role is taken from the membership record for that workspace

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
- **AND** the selected membership is the active membership with the earliest `joinedAt`
- **AND** ties are broken by ascending `workspaceId`
- **AND** the user can switch to another membership after login through the active-workspace switch flow

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
