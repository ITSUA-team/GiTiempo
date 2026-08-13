## RENAMED Requirements

- FROM: `### Requirement: Chrome Extension Can Start Timer From GitHub Issue`
- TO: `### Requirement: Clients Can Start Timer From GitHub Issue`

## ADDED Requirements

### Requirement: Starting A Timer From A GitHub Issue Is Authorized Against The Repository

The backend MUST verify that the submitted repository exists and is readable by the caller's connected GitHub account, and MUST assert the workspace GitHub organization policy for its owner, before creating or reusing any project for that repository. The repository identifier recorded MUST be the one GitHub reports rather than the one the caller supplied.

#### Scenario: Repository outside the workspace organization policy is refused

- **GIVEN** a workspace whose organization policy does not allow an owner
- **WHEN** a member starts a timer for an issue in a repository under that owner
- **THEN** the request is refused
- **AND** no project is created for that repository

#### Scenario: Nonexistent or unreadable repository is refused

- **WHEN** a member starts a timer for an issue in a repository that does not exist or that their connected account cannot read
- **THEN** the request is refused as not found
- **AND** no project is created

#### Scenario: Missing GitHub connection is refused before any write

- **GIVEN** a member with no connected GitHub account
- **WHEN** they start a timer from a GitHub issue
- **THEN** the request is refused with the same unconnected-account response GitHub browsing returns
- **AND** no project, task, or time entry is created

#### Scenario: Recorded repository uses the casing GitHub reports

- **WHEN** a member starts a timer supplying a repository whose casing differs from GitHub's own
- **THEN** the project reference records the repository as GitHub reports it
- **AND** a later request using either casing reuses the same project

#### Scenario: Verification happens before the creating transaction

- **WHEN** repository verification fails for any reason
- **THEN** no project, task, provider reference, or time entry is written
