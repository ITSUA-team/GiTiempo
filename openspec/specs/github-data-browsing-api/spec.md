# github-data-browsing-api Specification

## Purpose
TBD - created by archiving change add-github-data-browsing-api. Update Purpose after archive.
## Requirements
### Requirement: Connected GitHub Account Required For Browsing

The system SHALL expose GitHub browsing only to authenticated users with a connected GitHub account and SHALL keep GitHub token material server-side.

#### Scenario: Connected user browses GitHub data
- **GIVEN** an authenticated user has a connected GitHub account
- **WHEN** the user requests a GitHub browsing endpoint
- **THEN** the system SHALL use the user's stored GitHub connection to request provider data
- **AND** the response MUST NOT include GitHub access tokens, refresh tokens, or encrypted token material

#### Scenario: Disconnected user browses GitHub data
- **GIVEN** an authenticated user has no usable GitHub connection
- **WHEN** the user requests a GitHub browsing endpoint
- **THEN** the system SHALL reject the request without calling GitHub provider APIs

### Requirement: GitHub Owners Can Be Listed

The system SHALL allow connected users to list GitHub owners available for browsing, including the connected personal account and accessible organizations.

#### Scenario: User lists all GitHub owners
- **GIVEN** a connected user has a GitHub personal account and belongs to GitHub organizations
- **WHEN** the user requests GitHub owners with type `all`
- **THEN** the system SHALL return the personal owner and organization owners visible to the connected GitHub account
- **AND** each owner SHALL include a stable login, display label, owner type, avatar URL when available, and GitHub URL when available

#### Scenario: User filters owners by type
- **GIVEN** a connected user has a GitHub personal account and belongs to GitHub organizations
- **WHEN** the user requests owners with type `personal` or `organization`
- **THEN** the system SHALL return only owners matching the requested type

### Requirement: GitHub Repositories Can Be Listed By Owner Scope

The system SHALL allow connected users to list repositories for either their connected personal account or an accessible organization.

#### Scenario: User lists personal repositories
- **GIVEN** a connected user requests repositories with owner type `personal`
- **WHEN** the system loads repositories
- **THEN** the system SHALL use the connected GitHub account as the personal owner
- **AND** the response SHALL include normalized repository items and unified page-token pagination metadata

#### Scenario: User lists organization repositories
- **GIVEN** a connected user requests repositories with owner type `organization` and an organization login
- **WHEN** the system loads repositories
- **THEN** the system SHALL request repositories for that organization through the connected GitHub account
- **AND** the response SHALL include normalized repository items and unified page-token pagination metadata

#### Scenario: Organization repository request omits owner
- **GIVEN** a connected user requests repositories with owner type `organization`
- **WHEN** the request omits the organization owner login
- **THEN** the system SHALL reject the request as invalid

### Requirement: GitHub Projects Can Be Listed By Owner Scope

The system SHALL allow connected users to list GitHub Projects V2 for either their connected personal account or an accessible organization.

#### Scenario: User lists personal projects
- **GIVEN** a connected user requests projects with owner type `personal`
- **WHEN** the system loads Projects V2
- **THEN** the system SHALL use the connected GitHub account as the personal owner
- **AND** the response SHALL include normalized project items and unified page-token pagination metadata

#### Scenario: User lists organization projects
- **GIVEN** a connected user requests projects with owner type `organization` and an organization login
- **WHEN** the system loads Projects V2
- **THEN** the system SHALL request Projects V2 for that organization through the connected GitHub account
- **AND** the response SHALL include normalized project items and unified page-token pagination metadata

### Requirement: GitHub Repository Issues Can Be Listed

The system SHALL allow connected users to list GitHub issues for a repository visible to the connected GitHub account.

#### Scenario: User lists repository issues
- **GIVEN** a connected user requests issues for a GitHub repository
- **WHEN** the system loads repository issues
- **THEN** the system SHALL return normalized issue items for that repository
- **AND** the response SHALL include unified page-token pagination metadata

#### Scenario: Repository issues include pull requests
- **GIVEN** GitHub returns pull request entries from the repository issues provider endpoint
- **WHEN** the system normalizes the response
- **THEN** the system SHALL exclude pull request entries from returned issue items

#### Scenario: User filters repository issues by state
- **GIVEN** a connected user requests repository issues with state `open`, `closed`, or `all`
- **WHEN** the system loads repository issues
- **THEN** the system SHALL pass the requested state filter to GitHub and return matching normalized issue items

#### Scenario: Repository issue state filter is omitted
- **GIVEN** a connected user requests repository issues without a state filter
- **WHEN** the system loads repository issues
- **THEN** the system SHALL treat the state filter as `all`

#### Scenario: User searches repository issues
- **GIVEN** a connected user requests repository issues with a search query
- **WHEN** the system loads repository issues
- **THEN** the system SHALL return normalized issue items matching the search query within the requested repository
- **AND** the response SHALL preserve the same issue response shape and unified page-token pagination metadata as non-search browsing

### Requirement: GitHub Project Issue Items Can Be Listed

The system SHALL allow connected users to list real GitHub issues contained in a GitHub Project V2.

#### Scenario: User lists Project V2 issue items
- **GIVEN** a connected user requests issues for a GitHub Project V2 node id
- **WHEN** the system loads Project V2 items
- **THEN** the system SHALL return only Project V2 items whose content is a GitHub Issue
- **AND** each returned item SHALL include the project item id, issue identity, repository identity, issue number, title, state, URL, and updated time
- **AND** the response SHALL include unified page-token pagination metadata

#### Scenario: Project issue state filter is omitted
- **GIVEN** a connected user requests Project V2 issues without a state filter
- **WHEN** the system loads Project V2 issue items
- **THEN** the system SHALL treat the state filter as `all`

#### Scenario: User searches Project V2 issue items
- **GIVEN** a connected user requests Project V2 issues with a search query
- **WHEN** the system loads Project V2 issue items
- **THEN** the system SHALL return normalized issue items matching the search query within the requested Project V2 when GitHub provides matching issue content
- **AND** the response SHALL preserve skipped counts for non-issue or inaccessible items

#### Scenario: Project contains non-issue items
- **GIVEN** a GitHub Project V2 contains pull requests, draft issues, redacted items, or unknown item content
- **WHEN** the system normalizes Project V2 items
- **THEN** the system SHALL exclude those items from returned issue items
- **AND** the response SHALL include skipped counts for excluded item categories

#### Scenario: GitHub GraphQL returns provider errors
- **GIVEN** GitHub returns GraphQL errors for a Project V2 issue item request
- **WHEN** the system processes the provider response
- **THEN** the system SHALL reject the browsing request with a safe application error
- **AND** the response MUST NOT expose GitHub token material or raw provider secrets

### Requirement: GitHub Browsing Is Read Only

The system SHALL keep GitHub browsing separate from local GiTiempo project, task, and timer mutation behavior.

#### Scenario: User browses GitHub issues
- **GIVEN** a connected user lists repository or Project V2 issues
- **WHEN** the system returns the browsing response
- **THEN** the system MUST NOT create local projects
- **AND** the system MUST NOT create local tasks
- **AND** the system MUST NOT start, stop, or update timers
