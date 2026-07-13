## MODIFIED Requirements

### Requirement: Visible Members Can Create Tasks In Active Projects

The system MUST allow any active workspace member with project visibility to create provider-neutral tasks in active projects, including explicit materialization of a selected GitHub issue inside a visible active GitHub-backed project.

#### Scenario: Visible member materializes a GitHub issue task
- **GIVEN** the requester can see an active local GitHub-backed project
- **AND** the request identifies an open GitHub issue by local `projectId` and `issueNumber`
- **WHEN** the requester asks to create or reuse a task for that issue
- **THEN** the system loads the authoritative issue from the mapped GitHub repository
- **AND** it creates or reuses one local task in that visible project for the issue
- **AND** the response uses the standard task response contract

#### Scenario: GitHub issue task inherits project billable default
- **GIVEN** the requester can see an active local GitHub-backed project
- **AND** that project has `defaultBillableForTasks: false`
- **WHEN** the requester materializes a GitHub issue task without any explicit task-default override
- **THEN** the created local task stores `defaultBillableForTimeEntries: false`

#### Scenario: Existing GitHub issue task is reused
- **GIVEN** a visible local task in the same workspace and project is already linked to the selected GitHub issue
- **WHEN** the requester materializes that issue again
- **THEN** the system reuses the existing task
- **AND** it does not create a duplicate local task for the same issue mapping

#### Scenario: Closed GitHub provider issue is rejected before local task creation
- **GIVEN** the requester can see an active local GitHub-backed project
- **AND** the mapped GitHub issue is now closed in the provider response
- **WHEN** the requester asks to create or reuse a task for that issue
- **THEN** the system rejects the request with a validation failure
- **AND** it does not create a new local task for that issue mapping

#### Scenario: GitHub issue task cannot be materialized in inactive work
- **GIVEN** the requester identifies a GitHub issue through a visible local project
- **AND** the project or resolved local task is inactive
- **WHEN** the requester asks to materialize the issue as a task
- **THEN** the system rejects the request with a validation failure

#### Scenario: Closed GitHub issue task cannot be used for tracking
- **GIVEN** the requester identifies a GitHub issue whose resolved local task is closed
- **WHEN** the requester asks to materialize the issue as a task
- **THEN** the system rejects the request with a validation failure
