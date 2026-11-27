## ADDED Requirements

### Requirement: Workspace role changes take effect for the selected membership

A current workspace admin SHALL be able to set their own or another active membership's role to Member, PM or Admin within that workspace, subject to Last Admin Protection. Subsequent protected actions SHALL use the saved role even if the caller presents a token issued before the change.

#### Scenario: Promote another member

- **GIVEN** a workspace admin and an active Member or PM in the same workspace
- **WHEN** the admin sets that membership's role to Admin
- **THEN** the response and subsequent member list identify the target as Admin
- **AND** the account's memberships in other workspaces retain their roles

#### Scenario: Demote self or another admin

- **GIVEN** a workspace has at least two admins
- **WHEN** an admin changes their own or another admin's role to PM or Member
- **THEN** the requested role is persisted for that membership
- **AND** an admin-only operation by the demoted account is denied even using its previously issued admin token
- **AND** renewing the session issues credentials for the same account and workspace with the saved role

#### Scenario: Direct requests respect workspace and admin boundaries

- **GIVEN** a target membership outside the requesting admin's active workspace
- **WHEN** the admin submits a role change for that membership ID
- **THEN** the request is rejected and the target role is unchanged
- **AND** a caller with the PM or Member role cannot change any role in their own workspace

#### Scenario: Last-admin protection applies to self-demotion

- **GIVEN** the caller holds the last admin membership in the workspace
- **WHEN** the caller submits a role change to PM or Member
- **THEN** the API returns a conflict explaining that the workspace requires at least one admin
- **AND** the membership retains its admin role
