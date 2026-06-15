## ADDED Requirements

### Requirement: User Projects Task Popup Footer

The user-web Projects list task create and update popups SHALL follow the shared non-destructive popup footer pattern while preserving task save behavior.

#### Scenario: Task create popup footer uses create action only
- **GIVEN** visible projects are available
- **WHEN** the task create dialog renders from the project-level `Add task` action
- **THEN** the dialog footer shows the primary `Create task` action
- **AND** the dialog footer does not show a `Cancel` dismissal button

#### Scenario: Task update popup footer uses save action only
- **GIVEN** a task row is rendered
- **WHEN** the task update dialog renders from the task-title edit entry point
- **THEN** the dialog footer shows the primary `Save changes` action
- **AND** the dialog footer does not show a `Cancel` dismissal button

#### Scenario: Task dialog dismissal uses popup close control
- **GIVEN** a task create or update dialog is open and not saving
- **WHEN** the user activates the built-in dialog close control or existing non-destructive mask dismissal
- **THEN** the dialog closes without creating or updating a task
- **AND** task validation and request-failure retry behavior remains unchanged when the user uses the primary action
