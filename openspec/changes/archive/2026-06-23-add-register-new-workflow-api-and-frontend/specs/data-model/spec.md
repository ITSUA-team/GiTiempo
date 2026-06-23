## MODIFIED Requirements

### Requirement: Single-Tenant Workspace Ownership

The system SHALL model workspaces as first-class owned containers for operational records while still supporting a seeded default workspace for bootstrap and local development.

#### Scenario: Seeded workspace foundation exists for bootstrap environments

- GIVEN the application is initialized for the first time
- WHEN seed data is applied
- THEN a default workspace is created
- AND a default workspace settings record is created for that workspace
- AND the default workspace settings record includes a non-null time-zone value of `UTC`
- AND an initial admin membership exists in that workspace
- AND operational records attach to that workspace context

#### Scenario: Additional workspaces can be created after bootstrap

- GIVEN a new customer completes first-owner registration
- WHEN the backend persists the registration workflow
- THEN a new workspace can be created in addition to any seeded bootstrap workspace
- AND workspace-owned records attach to the created workspace context

### Requirement: Single Workspace Membership Per Application User

The system MUST model workspace membership separately from user identity so that API access resolves through a membership record for the active workspace context.

#### Scenario: Application user has workspace membership

- **GIVEN** a user has been onboarded into a workspace
- **WHEN** the backend resolves application access for that user
- **THEN** it uses a workspace membership record associated with that user and workspace

#### Scenario: Application user can hold memberships for different workspaces

- **GIVEN** a user has been onboarded into more than one workspace over time
- **WHEN** the backend stores workspace access state
- **THEN** each workspace access relationship is represented by its own membership record

### Requirement: Invite-Backed Membership Creation

The system SHALL create new membership for existing workspaces through the invite-acceptance flow after the initial owner membership exists.

#### Scenario: Invited user joins workspace

- **GIVEN** a valid pending invite exists for a user email
- **WHEN** that invite is accepted by the matching Firebase identity
- **THEN** the backend creates the local user if needed
- **AND** creates the workspace membership with the invited role
