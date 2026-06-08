## ADDED Requirements

### Requirement: Shared GitHub Browsing Owner Contracts

The shared contracts SHALL define stable GitHub owner browsing query and response shapes for backend DTOs and future frontend clients.

#### Scenario: GitHub owner list response uses shared schema
- **GIVEN** the backend returns GitHub owner browsing data
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload SHALL match the shared GitHub owner list response contract
- **AND** each owner SHALL include login, label, owner type, nullable avatar URL, and nullable GitHub URL
- **AND** the payload MUST NOT include GitHub access tokens, refresh tokens, PKCE verifier material, or token secrets

#### Scenario: GitHub owner list query uses shared schema
- **GIVEN** a client constructs a GitHub owner list query
- **WHEN** the query is validated
- **THEN** the query SHALL accept only the owner type filters `all`, `personal`, and `organization`
- **AND** invalid owner type filters SHALL be rejected

### Requirement: Shared GitHub Page Token Pagination Contracts

The shared contracts SHALL define a unified page-token pagination shape for GitHub browsing responses.

#### Scenario: GitHub browsing response uses page-token pagination
- **GIVEN** the backend returns paginated GitHub browsing data
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload SHALL include pagination metadata with `limit`, `hasNextPage`, and nullable `nextPageToken`
- **AND** the payload MUST NOT expose provider-specific REST page numbers or GraphQL cursors as public contract fields

#### Scenario: GitHub browsing query uses page token
- **GIVEN** a client constructs a paginated GitHub browsing query
- **WHEN** the query is validated
- **THEN** the query SHALL accept an optional opaque `pageToken`
- **AND** the query SHALL accept bounded `limit` values

### Requirement: Shared GitHub Repository Browsing Contracts

The shared contracts SHALL define stable GitHub repository browsing query and response shapes.

#### Scenario: GitHub repository list response uses shared schema
- **GIVEN** the backend returns GitHub repository browsing data
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload SHALL match the shared GitHub repository list response contract
- **AND** each repository SHALL include owner, name, full name, visibility, archived state, nullable description, GitHub URL, and updated time
- **AND** the payload SHALL include unified page-token pagination metadata

#### Scenario: GitHub repository list query uses shared schema
- **GIVEN** a client constructs a GitHub repository list query
- **WHEN** the query is validated
- **THEN** the query SHALL require an owner type of `personal` or `organization`
- **AND** the query SHALL accept an organization owner login only when organization scope is requested
- **AND** the query SHALL accept unified page-token pagination fields

### Requirement: Shared GitHub Project Browsing Contracts

The shared contracts SHALL define stable GitHub Project V2 browsing query and response shapes.

#### Scenario: GitHub project list response uses shared schema
- **GIVEN** the backend returns GitHub Project V2 browsing data
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload SHALL match the shared GitHub project list response contract
- **AND** each project SHALL include a GitHub Project V2 node id, number, title, owner, state, nullable description, nullable URL, and updated time
- **AND** the payload SHALL include unified page-token pagination metadata

#### Scenario: GitHub project list query uses shared schema
- **GIVEN** a client constructs a GitHub project list query
- **WHEN** the query is validated
- **THEN** the query SHALL require an owner type of `personal` or `organization`
- **AND** the query SHALL accept an organization owner login only when organization scope is requested
- **AND** the query SHALL accept unified page-token pagination fields

### Requirement: Shared GitHub Issue Browsing Contracts

The shared contracts SHALL define stable GitHub issue browsing response shapes for repository and Project V2 issue browsing.

#### Scenario: GitHub repository issue list response uses shared schema
- **GIVEN** the backend returns GitHub repository issue browsing data
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload SHALL match the shared GitHub repository issue list response contract
- **AND** each issue SHALL include issue id, repository owner, repository name, repository full name, issue number, title, state, GitHub URL, and updated time
- **AND** the payload SHALL include unified page-token pagination metadata

#### Scenario: GitHub Project V2 issue list response uses shared schema
- **GIVEN** the backend returns GitHub Project V2 issue item browsing data
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload SHALL match the shared GitHub Project V2 issue list response contract
- **AND** each item SHALL include project item id and normalized issue data
- **AND** the payload SHALL include unified page-token pagination metadata and skipped item counts

#### Scenario: GitHub issue state query uses shared schema
- **GIVEN** a client constructs a GitHub issue browsing query
- **WHEN** the query is validated
- **THEN** the query SHALL accept only `open`, `closed`, and `all` issue state filters
- **AND** invalid issue state filters SHALL be rejected

#### Scenario: GitHub issue query omits state filter
- **GIVEN** a client constructs a GitHub issue browsing query without a state filter
- **WHEN** the query is validated
- **THEN** the query SHALL default the state filter to `all`

#### Scenario: GitHub issue query includes search
- **GIVEN** a client constructs a GitHub issue browsing query with a search value
- **WHEN** the query is validated
- **THEN** the query SHALL accept the search value as an optional string field
