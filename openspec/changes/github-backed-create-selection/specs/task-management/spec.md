## ADDED Requirements

### Requirement: Task Creation Can Persist GitHub Issue External References
The system SHALL create local tasks from valid task create requests with optional GitHub issue provider-reference metadata and SHALL persist the local task and external reference atomically.

#### Scenario: Visible member creates task from GitHub repository issue
- **GIVEN** the requester can create tasks in an active project
- **WHEN** the requester creates a task with valid fields and GitHub repository issue provider-reference metadata
- **THEN** the system SHALL create the task in the target project
- **AND** the system SHALL persist a task external reference for the GitHub issue in the same transaction
- **AND** the task response SHALL remain provider-neutral

#### Scenario: Visible member creates task from GitHub Project V2 issue item
- **GIVEN** the requester can create tasks in an active project
- **WHEN** the requester creates a task with valid fields and GitHub Project V2 issue item provider-reference metadata
- **THEN** the system SHALL create the task in the target project
- **AND** the system SHALL persist a task external reference for the underlying GitHub issue in the same transaction
- **AND** the task response SHALL remain provider-neutral

#### Scenario: Manual task creation remains provider-neutral
- **GIVEN** the requester can create tasks in an active project
- **WHEN** the requester creates a task without provider-reference metadata
- **THEN** the system SHALL create the task without a provider external reference
- **AND** the task response SHALL remain provider-neutral

#### Scenario: Duplicate GitHub issue reference is rejected atomically
- **GIVEN** a task external reference already exists for a GitHub issue in the workspace
- **WHEN** a requester attempts to create another task with the same provider, external type, and external key
- **THEN** the system SHALL reject the create request with a conflict response
- **AND** the system SHALL NOT leave behind an unlinked local task from the failed request

#### Scenario: Task create validates visibility before storing GitHub reference
- **GIVEN** the requester cannot create tasks in the target project under existing task create visibility rules
- **WHEN** the requester attempts to create a task with GitHub provider-reference metadata
- **THEN** the system SHALL reject the request under the existing task create policy
- **AND** the system SHALL NOT store a task external reference
