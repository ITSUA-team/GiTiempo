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
