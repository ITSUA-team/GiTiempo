## ADDED Requirements

### Requirement: GitHub Browsing Applies Workspace Organization Policy
The system SHALL apply the workspace GitHub organization allow-list to organization-scoped GitHub browsing while preserving connected-user GitHub permission checks.

#### Scenario: Owner list filters organizations by workspace policy
- **GIVEN** a connected user can access multiple GitHub organizations
- **AND** the workspace allows one of those organization logins
- **WHEN** the user lists GitHub owners with type `all`
- **THEN** the system returns the user's personal owner
- **AND** it returns only organization owners allowed by the workspace policy

#### Scenario: Organization owner list omits disallowed organizations
- **GIVEN** a connected user can access a GitHub organization that is not allowed by the workspace policy
- **WHEN** the user lists GitHub owners with type `organization`
- **THEN** the disallowed organization is omitted from the response

#### Scenario: Organization repository request requires allowed owner
- **GIVEN** a connected user requests repositories with owner type `organization`
- **AND** the requested organization owner is not allowed by the workspace policy
- **WHEN** the system evaluates the request
- **THEN** the system rejects the request without returning repository data for that organization

#### Scenario: Organization project request requires allowed owner
- **GIVEN** a connected user requests Projects V2 with owner type `organization`
- **AND** the requested organization owner is not allowed by the workspace policy
- **WHEN** the system evaluates the request
- **THEN** the system rejects the request without returning project data for that organization

#### Scenario: Repository issue request requires allowed organization owner
- **GIVEN** a connected user requests issues for a repository owned by a GitHub organization
- **AND** the repository owner is not allowed by the workspace policy
- **WHEN** the system evaluates the request
- **THEN** the system rejects the request without returning issue data for that organization repository

#### Scenario: Personal GitHub browsing remains available
- **GIVEN** a connected user has no allowed GitHub organizations in the workspace policy
- **WHEN** the user requests personal-owner GitHub repositories or projects
- **THEN** the system continues to evaluate the request through the user's connected GitHub account
- **AND** the empty organization policy does not block personal-owner browsing

#### Scenario: GitHub browsing never exposes policy bypass data
- **GIVEN** a GitHub provider response includes organizations or organization-owned resources outside the workspace policy
- **WHEN** the system normalizes the browsing response
- **THEN** the response excludes disallowed organization data
- **AND** the response MUST NOT expose GitHub token material or raw provider secrets

