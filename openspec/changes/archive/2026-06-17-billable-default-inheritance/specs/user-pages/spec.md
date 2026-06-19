## ADDED Requirements

### Requirement: User Task Dialog Applies Billable Defaults
The user Projects page task dialog MUST initialize and save task-level default billable state according to the selected project's default and the selected task's current value.

#### Scenario: Task create initializes from project default
- **GIVEN** the user opens the task dialog in create mode for a project
- **AND** the project has `defaultBillableForTasks: false`
- **WHEN** the dialog renders
- **THEN** `Default billable for time entries` is initialized unchecked

#### Scenario: Task create sends selected task default
- **GIVEN** the user opens the task dialog in create mode
- **WHEN** the user saves a valid new task
- **THEN** the page sends the selected `defaultBillableForTimeEntries` value with the task create request

#### Scenario: Task edit initializes from task default
- **GIVEN** the user opens the task dialog in update mode for an existing task
- **WHEN** the dialog renders
- **THEN** `Default billable for time entries` is initialized from the task's `defaultBillableForTimeEntries` value

#### Scenario: Task default edit saves future default immediately
- **GIVEN** the user changes `Default billable for time entries` in task update mode
- **WHEN** the user saves the task dialog
- **THEN** the page sends the new default in the task update request
- **AND** it treats the returned task as the authoritative future-default state

### Requirement: User Task Dialog Prompts For Existing Time Entry Backfill
The user Projects page task dialog MUST show the approved follow-up popup only after a task default billable value has changed and the task already has existing time entries.

#### Scenario: Task follow-up popup appears after saved default change with existing entries
- **GIVEN** a task default billable save succeeds
- **AND** the saved default differs from the previous value
- **AND** the task has existing time entries
- **WHEN** the save flow settles
- **THEN** the page opens a PrimeVue Dialog titled `Update task billable default?`
- **AND** the popup explains that the future default is already saved

#### Scenario: Task follow-up popup offers only time-entry backfill
- **GIVEN** the task follow-up popup is open
- **WHEN** the popup renders
- **THEN** it offers a checkbox choice for updating existing time entries for the task
- **AND** it renders a primary action labeled `Update existing records`
- **AND** it does not render a separate `keep future defaults only` action

#### Scenario: Dismissing task follow-up leaves existing entries unchanged
- **GIVEN** the task follow-up popup is open after the future default was saved
- **WHEN** the user dismisses the popup without choosing the primary action
- **THEN** the page sends no task backfill request
- **AND** existing time entries remain unchanged

#### Scenario: Confirming task follow-up requests time-entry backfill
- **GIVEN** the task follow-up popup is open
- **WHEN** the user selects the existing time-entry choice and activates `Update existing records`
- **THEN** the page calls the task billable-default backfill endpoint
- **AND** success feedback uses the returned update count
- **AND** failure feedback keeps the saved future default visible and does not imply existing entries were updated

### Requirement: User Time Entry Create Uses Task Billable Default
The user Time Entries page manual create dialog MUST initialize new entry billable state from the selected task default while preserving explicit user override before save.

#### Scenario: Manual create initializes from selected task default
- **GIVEN** the user opens the time-entry dialog in create mode
- **AND** the user selects a task with `defaultBillableForTimeEntries: false`
- **WHEN** the task selection becomes active
- **THEN** the `isBillable` checkbox is initialized unchecked

#### Scenario: Manual create allows billable override
- **GIVEN** the time-entry dialog is open in create mode
- **AND** the selected task default initialized `isBillable` unchecked
- **WHEN** the user checks `isBillable` and saves the entry
- **THEN** the page sends `isBillable: true` in the manual time-entry create request

#### Scenario: Time entry edit preserves entry billable value
- **GIVEN** the user opens the time-entry dialog in edit mode
- **WHEN** the selected entry has an existing `isBillable` value
- **THEN** the dialog initializes from the entry value
- **AND** it does not reset the checkbox from the selected task's current default

### Requirement: Top-Bar Timer Uses Task Billable Defaults
The user top-bar timer task picker MUST preserve the project and task default inheritance chain when creating a task from the picker and when starting a timer.

#### Scenario: Timer new task inherits selected project default
- **GIVEN** the top-bar timer task picker is open
- **AND** the user selects a project with `defaultBillableForTasks: false`
- **WHEN** the user creates a new task from the picker
- **THEN** the task create request omits an override or sends `defaultBillableForTimeEntries: false`
- **AND** the created task remains selected in the picker

#### Scenario: Timer start uses selected task default
- **GIVEN** the top-bar timer task picker is open while the timer is idle
- **AND** the selected task has `defaultBillableForTimeEntries: false`
- **WHEN** the user starts the timer
- **THEN** the timer start request does not send an entry-level billable override
- **AND** the returned running entry reflects the backend-inherited `isBillable: false` value
