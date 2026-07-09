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

The system SHALL allow connected users to list GitHub issues for a repository visible to the connected GitHub account, including the canonical repository mapped to a visible local GitHub-backed project.

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

#### Scenario: User lists repository issues through a visible GitHub-backed project
- **GIVEN** an authenticated user can see an active local project whose canonical external mapping points to a GitHub repository
- **WHEN** the user requests repository issues through that local project scope
- **THEN** the system resolves the mapped repository from the local project
- **AND** it returns normalized issue items for that repository
- **AND** the response includes unified page-token pagination metadata

#### Scenario: Local project issue browsing rejects non-GitHub project scope
- **GIVEN** an authenticated user requests repository issues through a visible local project
- **AND** that project has no canonical GitHub repository mapping
- **WHEN** the system evaluates the request
- **THEN** the system rejects the request without returning repository issue data

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

The system SHALL keep GitHub browsing separate from local GiTiempo project, task, and timer mutation behavior, even when browsing occurs through a visible local GitHub-backed project.

#### Scenario: User browses GitHub issues
- **GIVEN** a connected user lists repository or Project V2 issues
- **WHEN** the system returns the browsing response
- **THEN** the system MUST NOT create local projects
- **AND** the system MUST NOT create local tasks
- **AND** the system MUST NOT start, stop, or update timers

#### Scenario: Project-scoped GitHub browsing stays read only
- **GIVEN** a connected user lists repository issues through a visible local GitHub-backed project
- **WHEN** the system returns the browsing response
- **THEN** the system MUST NOT create local projects
- **AND** the system MUST NOT create local tasks
- **AND** the system MUST NOT start, stop, or update timers
- **AND** later local task creation requires a separate explicit mutation request

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

#### Scenario: Project V2 issue policy applies to each issue repository owner
- **GIVEN** a connected user requests issues for a Project V2 whose owner is allowed for the workspace
- **AND** the returned issue items include repositories from both allowed and disallowed organizations
- **WHEN** the system evaluates the normalized issue items
- **THEN** it omits issue items whose repository owner is not allowed by the workspace policy
- **AND** it keeps personal-owner issue items for the connected GitHub account

### Requirement: Current User GitHub Organizations Can Be Listed For Workspace Setup

The system SHALL expose a setup-only GitHub organization list for authenticated users with a connected GitHub account so Admin Settings can offer organizations to add to the workspace allow-list without exposing token material or granting workspace provider access.

#### Scenario: Connected user lists organizations for setup

- **GIVEN** an authenticated user has a usable connected GitHub account
- **WHEN** the user requests the setup GitHub organization list
- **THEN** the system SHALL request organization owners visible to that user's connected GitHub account
- **AND** the response SHALL use the existing GitHub owner list response shape with organization owner metadata only
- **AND** the response MUST NOT include access tokens, refresh tokens, encrypted token values, token secrets, or raw provider authorization details

#### Scenario: Disconnected user cannot list setup organizations

- **GIVEN** an authenticated user has no usable connected GitHub account
- **WHEN** the user requests the setup GitHub organization list
- **THEN** the system MUST reject the request without calling GitHub provider APIs
- **AND** the response MUST NOT expose GitHub token material or raw provider secrets

#### Scenario: Setup organization list is not workspace browsing access

- **GIVEN** an authenticated connected user can access GitHub organizations that are not yet allowed for the current workspace
- **WHEN** the user requests the setup GitHub organization list
- **THEN** the system SHALL NOT filter the returned organization owners by the workspace GitHub organization allow-list
- **AND** the response SHALL NOT create, remove, or modify workspace GitHub organization policy rows
- **AND** the response SHALL NOT grant access to repositories, projects, issues, or organization-scoped browsing beyond what separate browsing and workspace policy endpoints allow
