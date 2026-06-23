## ADDED Requirements

### Requirement: Workspace GitHub Organization Policy Persistence
The backend data model SHALL persist allowed GitHub organization logins as workspace-owned records.

#### Scenario: Allowed organization row stores workspace policy data
- **GIVEN** a GitHub organization login is allowed for a workspace
- **WHEN** the policy record is stored
- **THEN** the row references the workspace
- **AND** the row stores the organization login, a normalized login for comparisons, the creating user, and timestamps

#### Scenario: Organization policy rows are workspace-scoped
- **GIVEN** two workspaces store the same GitHub organization login
- **WHEN** the rows are persisted
- **THEN** each workspace owns an independent policy record

#### Scenario: Duplicate organization policy row is prevented
- **GIVEN** a workspace already stores an allowed GitHub organization login
- **WHEN** the same login is stored again with different casing
- **THEN** the backend prevents a duplicate row for that workspace

### Requirement: Empty Workspace Organization Policy Is Representable
The backend data model MUST represent a workspace with no allowed GitHub organizations without requiring a placeholder row.

#### Scenario: New workspace has no organization policy rows
- **GIVEN** a workspace is created or seeded
- **WHEN** no GitHub organizations have been allowed for that workspace
- **THEN** the data model contains no placeholder organization policy row
- **AND** policy reads return an empty organization list for that workspace
