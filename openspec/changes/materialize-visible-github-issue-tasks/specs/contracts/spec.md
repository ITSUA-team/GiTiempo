## MODIFIED Requirements

### Requirement: Shared GitHub Issue Materialization Contract

The shared contracts SHALL define the request shape used to materialize a visible local task from a selected GitHub issue inside a GitHub-backed project.

#### Scenario: GitHub issue materialization request uses shared schema
- **GIVEN** a client constructs a request to create or reuse a task from a selected GitHub issue
- **WHEN** the payload is validated
- **THEN** the shared schema SHALL require `projectId` and `issueNumber`
- **AND** `projectId` SHALL be a UUID
- **AND** `issueNumber` SHALL be a positive integer

#### Scenario: GitHub issue materialization request rejects client-owned repository fields
- **GIVEN** a client constructs a request to create or reuse a task from a selected GitHub issue
- **WHEN** the payload includes repository or issue-title fields owned by server-side GitHub lookups
- **THEN** the shared schema SHALL reject the payload

### Requirement: Shared Task Response Includes Synced GitHub Issue Metadata

The shared task response contract SHALL keep the standard task response shape while allowing nullable synced GitHub issue metadata for tasks linked to GitHub issues.

#### Scenario: Synced GitHub issue task uses the standard task response contract
- **GIVEN** the backend returns a task linked to a GitHub issue
- **WHEN** frontend or backend code consumes the standard task response
- **THEN** the payload SHALL still use the shared task response contract
- **AND** it SHALL include nullable `githubIssue` metadata with the normalized GitHub repository key and issue number

#### Scenario: Provider-neutral task omits synced GitHub issue metadata
- **GIVEN** the backend returns a task with no GitHub issue link
- **WHEN** frontend or backend code consumes the standard task response
- **THEN** the payload SHALL set `githubIssue` to `null`
