## MODIFIED Requirements

### Requirement: Single-Tenant Workspace Ownership
The system SHALL operate as a single-tenant MVP with one seeded default workspace that owns operational records.

#### Scenario: Seeded workspace foundation exists for initial deployment
- **GIVEN** the application is initialized for the first time
- **WHEN** seed data is applied
- **THEN** a default workspace is created
- **AND** a default workspace settings record is created for that workspace
- **AND** an initial admin membership exists in that workspace
- **AND** operational records attach to that workspace context

## ADDED Requirements

### Requirement: Single Workspace Membership Per Application User
The system MUST model workspace membership separately from user identity in the single-tenant MVP.

#### Scenario: Application user has workspace membership
- **GIVEN** a user has been onboarded into the application workspace
- **WHEN** the backend resolves application access for that user
- **THEN** it uses a workspace membership record associated with that user and workspace

### Requirement: Invite-Backed Membership Creation
The system SHALL create new application membership through the invite-acceptance flow after the initial seeded admin.

#### Scenario: Invited user joins workspace
- **GIVEN** a valid pending invite exists for a user email
- **WHEN** that invite is accepted by the matching Firebase identity
- **THEN** the backend creates the local user if needed
- **AND** creates the workspace membership with the invited role
