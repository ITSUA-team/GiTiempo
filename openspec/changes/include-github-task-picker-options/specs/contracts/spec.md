## ADDED Requirements

### Requirement: Shared GitHub Timer Target Materialization Contracts

The shared contracts SHALL define stable request and response shapes for resolving a connected-user GitHub issue selection into a local timer task context.

#### Scenario: Materialization request uses shared schema

- **GIVEN** a frontend client constructs a GitHub issue timer-target materialization request
- **WHEN** the request is validated
- **THEN** the schema SHALL require GitHub repository full name, issue number, issue title, and selected source type
- **AND** the schema SHALL accept source metadata needed to distinguish repository browsing from GitHub Project V2 browsing

#### Scenario: Materialization response uses local timer context

- **GIVEN** the backend resolves a GitHub issue selection to local work records
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload SHALL include the local project response and local task response that can be used as a timer target
- **AND** the task response SHALL preserve GitHub issue linkage when available

#### Scenario: Invalid materialization payload is rejected

- **GIVEN** a client submits malformed GitHub repository, issue number, issue title, or source metadata
- **WHEN** the payload is validated
- **THEN** the shared schema SHALL reject the payload before backend materialization logic runs
