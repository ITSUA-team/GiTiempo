## MODIFIED Requirements

### Requirement: Connected GitHub Account Required For Browsing

The system SHALL expose repository, issue and Projects browsing/import only to authenticated users with a usable personal GitHub App grant for their linked identity, and SHALL keep token material server-side. Within the browsing requirements, a usable connected account means this App grant; setup organization discovery has its own OAuth prerequisite.

#### Scenario: Connected user browses GitHub data
- **GIVEN** an authenticated user has a usable personal GitHub App grant for the linked identity
- **WHEN** the user requests a GitHub browsing endpoint
- **THEN** the system SHALL use only the user's stored personal GitHub App credential to request provider data
- **AND** the response MUST NOT include GitHub access tokens, refresh tokens, or encrypted token material

#### Scenario: Disconnected user browses GitHub data
- **GIVEN** an authenticated user has no usable personal GitHub App grant
- **WHEN** the user requests a GitHub browsing endpoint
- **THEN** the system SHALL reject the request without calling GitHub provider APIs

Personal repository, issue and Projects browsing/import SHALL continue to use personal GitHub App credentials; a usable OAuth identity or OAuth read:project scope alone SHALL NOT satisfy that prerequisite. Setup organization discovery is the separately specified OAuth exception. Workspace installation tracking SHALL retain its existing independent credential and authorization rules.

### Requirement: Current User GitHub Organizations Can Be Listed For Workspace Setup

The system SHALL expose a setup-only organization list using the authenticated user's OAuth App grant with effective read:org access. It SHALL return provider-authorized active memberships before App installation, subject to GitHub organization policy, using the existing organization owner metadata shape without tokens.

#### Scenario: Discover an organization without App installation
- **GIVEN** OAuth permits an active organization membership and GiTiempo App is not installed there
- **WHEN** the user requests setup organizations
- **THEN** the organization SHALL be eligible for discovery
- **AND** the system MUST NOT require a personal App grant or App installation to list it

#### Scenario: Retrieve all authorized pages
- **GIVEN** GitHub memberships span multiple pages
- **WHEN** the setup list is requested
- **THEN** the system SHALL fetch all pages and deduplicate organization identities
- **AND** it MUST NOT silently truncate the list or return successful partial data after a page failure

#### Scenario: Missing OAuth or scope
- **GIVEN** the user lacks usable OAuth authorization or effective read:org
- **WHEN** the setup list is requested
- **THEN** the system SHALL return a stable authorization or permission recovery error
- **AND** it MUST NOT fall back to an App token or misrepresent the failure as an empty list

#### Scenario: Restricted visibility or legitimate empty result
- **GIVEN** OAuth authorization is valid
- **WHEN** GitHub returns no visible active memberships or rejects organization access due to policy
- **THEN** a successful empty response SHALL be distinguished from a provider rejection
- **AND** recovery guidance MUST NOT claim that installing the App fixes OAuth policy restrictions

#### Scenario: Setup is not workspace access
- **GIVEN** OAuth reveals an organization not yet allowed in the current workspace
- **WHEN** the setup list is requested
- **THEN** the organization SHALL NOT be filtered out by workspace policy
- **AND** the request MUST NOT mutate policy or grant repository, project, issue or tracking access
