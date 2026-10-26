# Spec Delta

## MODIFIED Requirements

### Requirement: Workspace Identity Administration
The system MUST allow admins to update mutable workspace identity fields and prevent non-admin updates. A valid name SHALL be accepted even when another workspace has an identical or normalization-equivalent name.

#### Scenario: Admin updates workspace name
- **GIVEN** the requester is an admin member of the current workspace
- **WHEN** the requester submits a valid workspace identity update
- **THEN** the system persists the updated workspace fields and returns the updated workspace

#### Scenario: Admin reuses another workspace name
- **GIVEN** another workspace already uses the requested name or a normalization-equivalent spelling
- **WHEN** the current workspace admin submits that valid name
- **THEN** the rename succeeds without a name conflict
- **AND** neither workspace ID, membership, nor authorization context changes

#### Scenario: Non-admin attempts to update workspace identity
- **GIVEN** the requester is authenticated but is not an admin member of the current workspace
- **WHEN** the requester attempts to update workspace identity
- **THEN** the system rejects the request as forbidden

## ADDED Requirements

### Requirement: Workspace Names Are Nonunique Display Labels
Workspace names SHALL be nonunique display labels. Creation and rename MUST allow equal names across workspaces while retaining existing nonblank and length limits. Workspace IDs SHALL remain the identity used for routing, authorization, membership selection, and workspace-scoped data.

#### Scenario: Different accounts receive the same automatic name
- **GIVEN** a workspace named `Workspace` already exists
- **WHEN** another eligible account with zero memberships completes social sign-in
- **THEN** a distinct workspace is created with the exact name `Workspace`
- **AND** no suffix or account-derived name is added
- **AND** the new account receives no access to the pre-existing workspace

#### Scenario: Duplicate labels do not merge workspace state
- **GIVEN** a user belongs to two workspaces with the same display name
- **WHEN** the user selects one by workspace ID
- **THEN** the resulting session and data belong only to the selected workspace
- **AND** the membership list can include both distinct workspace IDs with equal names

#### Scenario: Invalid names remain invalid
- **GIVEN** a workspace create or rename request contains a blank or overlength name
- **WHEN** existing name validation runs
- **THEN** the request is rejected as invalid input
- **AND** allowing duplicate names does not weaken those limits
