## ADDED Requirements

### Requirement: Jira Connection Persistence

The backend data model SHALL persist at most one Jira connection record per application user, following the same shape and lifecycle as the GitHub connection persistence, plus the re-authorization state rotating refresh tokens require.

#### Scenario: User completes Atlassian OAuth

- **GIVEN** a user completes Atlassian OAuth successfully
- **WHEN** the backend stores the Jira connection
- **THEN** the row references exactly one application user
- **AND** it stores safe Atlassian account metadata and the accessible-site identifiers
- **AND** it stores encrypted access and refresh token material with expiry timestamps

#### Scenario: Refresh rotation replaces token material in place

- **GIVEN** a stored Jira connection
- **WHEN** a token refresh succeeds
- **THEN** the same row's encrypted token material is replaced
- **AND** no second connection row is created

#### Scenario: Rejected refresh is recorded, not deleted

- **WHEN** Atlassian rejects the refresh token
- **THEN** the row is marked as needing re-authorization
- **AND** the row remains for connection history

#### Scenario: User disconnects Jira

- **WHEN** the user disconnects Jira
- **THEN** the row no longer contains usable encrypted token material
- **AND** the row is marked disconnected

### Requirement: Workspace Jira Site Is Stored

The backend data model SHALL store at most one approved Jira site per workspace, holding the site's cloud id and hostname.

#### Scenario: Site approval is stored

- **WHEN** an admin approves a Jira site for the workspace
- **THEN** the workspace stores that site's cloud id and hostname
- **AND** approving another site replaces the stored one rather than accumulating rows
