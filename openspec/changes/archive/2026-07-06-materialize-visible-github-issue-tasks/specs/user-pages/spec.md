## MODIFIED Requirements

### Requirement: Top-Bar Timer Task Picker

The user-web top-bar timer task picker MUST allow the user to choose an existing visible task context, append unsynced GitHub issues for visible GitHub-backed projects, add an optional time-entry description, or create a new task inside the selected visible project; MUST remain usable from the mobile timer strip; MUST support popup-owned timer Start and Stop actions; MUST support reassigning the task and description of the currently running timer; and MUST rely on popup dismissal controls instead of a footer `Cancel` button.

#### Scenario: GitHub-backed project appends unsynced issues in timer picker
- **GIVEN** the top-bar timer task picker is open
- **AND** the user selects a visible active GitHub-backed project
- **WHEN** the project has open GitHub issues that are not yet represented by visible local tasks
- **THEN** the picker keeps visible local tasks available first
- **AND** it appends the unsynced GitHub issue options for that project

#### Scenario: Selected GitHub issue is materialized before timer action
- **GIVEN** the top-bar timer task picker is open
- **AND** the user selects an unsynced GitHub issue option
- **WHEN** the user starts an idle timer or confirms a running-timer task change
- **THEN** the app first requests local task materialization for that issue
- **AND** the subsequent timer start or running-entry update uses the returned local task id

#### Scenario: GitHub suggestion failure stays distinct from empty timer options
- **GIVEN** the top-bar timer task picker is open for a visible active GitHub-backed project
- **WHEN** GitHub issue suggestion loading fails
- **THEN** the picker keeps a request-failure state visible
- **AND** it does not replace that failure with empty-task messaging

### Requirement: Time Entries Page Record Management

The Time Entries page MUST allow authenticated users to review, filter, create, edit, and delete their own time entries while keeping manual completed-entry creation out of the global top-bar timer surface, including GitHub-issue selection for visible GitHub-backed projects.

#### Scenario: Manual entry dialog appends unsynced GitHub issues
- **GIVEN** the user opens the manual time-entry create or edit dialog
- **AND** the user selects a visible active GitHub-backed project
- **WHEN** the project has open GitHub issues that are not yet represented by visible local tasks
- **THEN** the dialog keeps visible local tasks available first
- **AND** it appends unsynced GitHub issue options for that project

#### Scenario: Manual entry dialog materializes selected GitHub issue before save
- **GIVEN** the user opens the manual time-entry create or edit dialog
- **AND** the selected task option is an unsynced GitHub issue
- **WHEN** the user saves the dialog successfully
- **THEN** the app first requests local task materialization for that issue
- **AND** it creates or updates the time entry with the returned local task id

#### Scenario: Manual entry dialog keeps GitHub suggestion request failure distinct
- **GIVEN** the user opens the manual time-entry create or edit dialog for a visible active GitHub-backed project
- **WHEN** GitHub issue suggestion loading fails
- **THEN** the dialog keeps a request-failure state visible
- **AND** it does not replace that failure with empty-task messaging
