## MODIFIED Requirements

### Requirement: Current Workspace Read

The system SHALL provide an authenticated current-workspace endpoint for the requester's active workspace membership context. The endpoint MUST return only the workspace bound to the current access-token workspace context and MUST NOT list alternate workspace memberships.

#### Scenario: Authenticated member reads current workspace

- **GIVEN** the requester has a valid access token and an active workspace membership
- **WHEN** the requester asks for the current workspace
- **THEN** the system returns the workspace identity and public workspace fields for that membership context
- **AND** the response does not include other workspaces the same user may belong to

#### Scenario: Current workspace changes after switch

- **GIVEN** an authenticated user switches to another workspace and receives a fresh access token for that workspace
- **WHEN** the requester asks for the current workspace with the fresh access token
- **THEN** the system returns the selected workspace identity
- **AND** the system does not return the previously active workspace
