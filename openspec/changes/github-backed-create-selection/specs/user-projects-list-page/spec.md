## ADDED Requirements

### Requirement: User Task Create Supports GitHub-Backed Candidate Selection
The user Projects list task create dialog SHALL allow connected GitHub users to create a local task from a selected GitHub issue candidate when the selected project or selected GitHub scope can provide issue candidates, while preserving manual task creation.

#### Scenario: Connected user sees GitHub task candidate controls for eligible scope
- **GIVEN** an authenticated user has an active GitHub connection
- **AND** the task create dialog has a selected project or GitHub scope that can provide issue candidates
- **WHEN** the dialog opens in create mode
- **THEN** the dialog SHALL expose GitHub-backed task candidate controls for repository issues or Project V2 issue items
- **AND** the dialog SHALL keep manual task title entry available
- **AND** no local task SHALL be created until the user submits the dialog

#### Scenario: Selecting GitHub issue populates task title
- **GIVEN** GitHub issue candidates have loaded in the task create dialog
- **WHEN** the user selects an issue or Project V2 issue item
- **THEN** the dialog SHALL populate the local task title from the selected issue title
- **AND** the task title SHALL remain editable before submission
- **AND** the dialog SHALL display that the pending task source is GitHub-backed

#### Scenario: Manual task entry clears GitHub metadata
- **GIVEN** the task create dialog has a selected GitHub issue candidate
- **WHEN** the user clears the candidate selection or edits through the manual task path
- **THEN** the dialog SHALL remove pending GitHub provider-reference metadata from the create request
- **AND** submitting valid manual fields SHALL create a manual local task in the selected project

#### Scenario: Disconnected user keeps manual task creation
- **GIVEN** the user has no active GitHub connection
- **WHEN** the task create dialog opens in create mode
- **THEN** the dialog SHALL keep existing manual project selection and task title entry behavior available
- **AND** the dialog SHALL NOT require GitHub candidate loading before the user can submit a manual task

#### Scenario: Candidate loading states do not collapse into dialog validation
- **WHEN** GitHub issue candidate loading is pending, empty, or failed in the task create dialog
- **THEN** the dialog SHALL render a distinct loading, empty, or request-error state for candidate discovery
- **AND** manual task title entry SHALL remain available
- **AND** candidate loading failures SHALL be retryable without closing the dialog

#### Scenario: Creating from GitHub issue sends source metadata
- **GIVEN** the task create dialog has a selected GitHub issue candidate
- **WHEN** the user submits valid task fields
- **THEN** the task create request SHALL include validated GitHub provider-reference metadata for the selected issue
- **AND** the Projects list page SHALL refresh from the authoritative task response or task list after creation

#### Scenario: Update dialog remains manual task editing only
- **WHEN** the task dialog opens in update mode for an existing task
- **THEN** the dialog SHALL preserve existing edit behavior for project, title, and status
- **AND** it SHALL NOT create or replace GitHub provider-reference metadata through the update flow
