## MODIFIED Requirements

### Requirement: Current Workspace Read

The system SHALL provide an authenticated current-workspace endpoint for the requester's active workspace membership context.

#### Scenario: Authenticated member reads current workspace

- **GIVEN** the requester has a valid access token and an active workspace membership
- **WHEN** the requester asks for the current workspace
- **THEN** the system returns the workspace identity and public workspace fields for that membership context

### Requirement: Seeded Default Workspace Foundation

The system SHALL create the default workspace foundation during seed/bootstrap without preventing later creation of additional workspaces.

#### Scenario: Seed creates workspace and settings

- **GIVEN** the application is initialized in an empty environment
- **WHEN** seed data is applied
- **THEN** the system creates the default workspace and its workspace settings record
- **AND** the workspace settings use `UTC` as the default time zone
