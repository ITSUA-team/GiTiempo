## ADDED Requirements

### Requirement: Shared Create Source Reference Contracts
The shared contracts SHALL define validated optional GitHub provider-reference metadata for project and task create requests without changing manual create payload requirements.

#### Scenario: Project create accepts GitHub repository reference
- **GIVEN** a client constructs a project create request from a GitHub repository candidate
- **WHEN** the payload includes GitHub provider-reference metadata
- **THEN** the shared project create schema SHALL accept provider `github` with repository external type, stable external key, nullable external id, GitHub URL, and display metadata
- **AND** the schema SHALL continue rejecting unknown additional fields

#### Scenario: Project create accepts GitHub Project V2 reference
- **GIVEN** a client constructs a project create request from a GitHub Project V2 candidate
- **WHEN** the payload includes GitHub provider-reference metadata
- **THEN** the shared project create schema SHALL accept provider `github` with Project V2 external type, stable external key, nullable external id or node id, nullable GitHub URL, and display metadata
- **AND** the schema SHALL continue rejecting unknown additional fields

#### Scenario: Task create accepts GitHub issue reference
- **GIVEN** a client constructs a task create request from a GitHub repository issue or Project V2 issue item candidate
- **WHEN** the payload includes GitHub provider-reference metadata
- **THEN** the shared task create schema SHALL accept provider `github` with issue external type, stable external key, issue id when available, GitHub issue URL, and display metadata
- **AND** the schema SHALL continue rejecting unknown additional fields

#### Scenario: Manual project create payload remains valid
- **GIVEN** a client constructs a manual project create request
- **WHEN** the payload omits provider-reference metadata
- **THEN** the shared project create schema SHALL accept the existing valid manual fields
- **AND** the schema SHALL NOT require a GitHub connection or GitHub candidate identity for manual creates

#### Scenario: Manual task create payload remains valid
- **GIVEN** a client constructs a manual task create request
- **WHEN** the payload omits provider-reference metadata
- **THEN** the shared task create schema SHALL accept the existing valid manual fields
- **AND** the schema SHALL NOT require a GitHub connection or GitHub candidate identity for manual creates

#### Scenario: Non-GitHub provider reference is rejected for this change
- **GIVEN** a client constructs a project or task create request with provider-reference metadata
- **WHEN** the metadata names a provider other than `github`
- **THEN** the shared create schema SHALL reject the payload until that provider is explicitly supported

### Requirement: Shared GitHub Browsing Client Contracts Remain Read-Only
The shared contracts for GitHub browsing SHALL remain read-only candidate discovery contracts and SHALL NOT create local projects or tasks by themselves.

#### Scenario: GitHub browsing responses are candidate inputs only
- **GIVEN** frontend code consumes GitHub owner, repository, Project V2, repository issue, or Project V2 issue item responses
- **WHEN** a user selects a candidate in a create flow
- **THEN** the selected candidate SHALL be mapped into a local project or task create request
- **AND** the GitHub browsing response alone SHALL NOT persist a local project or task
