## ADDED Requirements

### Requirement: Current User Workspace Membership List

The backend SHALL provide an authenticated current-user endpoint that lists every workspace membership available to the authenticated user for active-workspace switching.

#### Scenario: Authenticated user lists workspace memberships

- **GIVEN** an authenticated user has one or more workspace memberships
- **WHEN** the user requests their workspace membership list
- **THEN** the backend returns every active workspace membership for that user
- **AND** each item includes the workspace ID, workspace name, role, and current-workspace marker

#### Scenario: Membership list marks current workspace

- **GIVEN** an authenticated request carries a valid workspace ID claim
- **WHEN** the user requests their workspace membership list
- **THEN** the membership matching the access-token workspace ID is marked as current
- **AND** all other memberships are marked as not current

#### Scenario: Unauthenticated user cannot list memberships

- **GIVEN** no valid authenticated user context is available
- **WHEN** the current-user workspace membership list is requested
- **THEN** the backend rejects the request as unauthorized
