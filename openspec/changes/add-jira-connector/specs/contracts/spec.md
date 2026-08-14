## ADDED Requirements

### Requirement: Shared Jira Connection Contracts

The shared contracts SHALL define the Jira connection status and authorization URL shapes, mirroring the GitHub connection contracts, including the re-authorization state.

#### Scenario: Connection status shape

- **WHEN** a client reads the Jira connection status
- **THEN** the contract distinguishes not connected, connected, and re-authorization required
- **AND** a connected status carries the Atlassian identity without exposing tokens

### Requirement: Shared Jira Browsing Contracts

The shared contracts SHALL define Jira project and issue browsing shapes with capped pagination, carrying immutable ids beside keys, and an explicit representation of content the account could not read.

#### Scenario: Project and issue shapes

- **WHEN** a client lists Jira projects or issues
- **THEN** each project carries id, key, and name
- **AND** each issue carries id, key, and summary
- **AND** the response can state that content was hidden by permissions

### Requirement: Shared Jira Issue Materialization Contract

The shared contracts SHALL define the start-timer-from-Jira-issue request as the issue's immutable id plus its Jira project id, validated strictly, with no caller-supplied names or cloud ids.

#### Scenario: Materialization request shape

- **WHEN** a client starts a timer from a Jira issue
- **THEN** the request carries the issue id and the Jira project id only
- **AND** requests carrying extra identity fields are refused rather than having them ignored

### Requirement: Shared Workspace Jira Site Policy Contracts

The shared contracts SHALL define the site policy shapes: listing the sites a connected admin can choose from, the stored approved site, and its replacement.

#### Scenario: Site policy shapes

- **WHEN** an admin reads or updates the workspace Jira site
- **THEN** the contract carries the site's cloud id and hostname
- **AND** frontend-safe errors cover the unconnected-admin and no-access cases
