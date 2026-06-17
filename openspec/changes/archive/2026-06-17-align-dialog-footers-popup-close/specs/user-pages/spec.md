## ADDED Requirements

### Requirement: Time Entry Popup Footers

The user-web Time Entries create and edit popups SHALL follow the shared non-destructive popup footer pattern while preserving manual entry save behavior.

#### Scenario: Time-entry create popup footer uses save action only
- **WHEN** the user opens the manual time-entry dialog in create mode from the page-level or day-level create action
- **THEN** the dialog footer shows the primary create-mode save action
- **AND** the dialog footer does not show a `Cancel` dismissal button

#### Scenario: Time-entry edit popup footer uses save action only
- **GIVEN** the user views a completed time entry in the Time Entries page
- **WHEN** they open the edit dialog for that entry
- **THEN** the dialog footer shows the primary `Save changes` action
- **AND** the dialog footer does not show a `Cancel` dismissal button

#### Scenario: Time-entry popup dismissal uses dialog controls
- **GIVEN** a time-entry create or edit dialog is open
- **WHEN** the user activates the built-in dialog close control or existing non-destructive mask dismissal
- **THEN** the dialog closes without creating or updating a time entry
- **AND** failed save attempts still keep the dialog open with pending values available for retry

## MODIFIED Requirements

### Requirement: Top-Bar Timer Task Picker

The user-web top-bar timer task picker MUST allow the user to choose an existing visible task context, add an optional time-entry description, or create a new task inside the selected visible project, and MUST remain usable from the mobile timer strip while relying on popup dismissal controls instead of a footer `Cancel` button.

#### Scenario: Existing task and description selected for idle timer context
- **GIVEN** the top-bar timer task picker is open while the timer is idle
- **WHEN** the user selects a visible project, one of that project's tasks, and enters a description
- **THEN** the dialog allows confirmation with `Use selected task`
- **AND** the top-bar timer context updates to the selected `Project / Task`
- **AND** a subsequent idle start action starts a fresh timer for that task with the submitted description
- **AND** the previous time entry record is not resumed or mutated

#### Scenario: Idle timer can start with no description
- **GIVEN** the top-bar timer task picker is open while the timer is idle
- **WHEN** the user selects a visible project and task and leaves Description empty
- **THEN** the dialog allows confirmation with `Use selected task`
- **AND** a subsequent idle start action starts a fresh timer for that task with no description

#### Scenario: Running timer task and description are updated without stopping
- **GIVEN** the top-bar timer task picker is open while a timer is running
- **WHEN** the user selects a visible project, one of that project's tasks, changes Description, and confirms with `Use selected task`
- **THEN** the app updates the running entry's task and description
- **AND** the timer remains running
- **AND** the top-bar timer context updates from the authoritative response

#### Scenario: Running timer description can be cleared
- **GIVEN** the top-bar timer task picker is open while a running timer has a description
- **WHEN** the user clears Description and confirms with `Use selected task`
- **THEN** the app clears the running entry description without stopping the timer

#### Scenario: New task created inside selected project
- **GIVEN** the top-bar timer task picker is open with a visible project selected
- **WHEN** the user submits a valid new task title
- **THEN** the app creates the task inside the selected project
- **AND** the dialog remains open with the newly created task selected
- **AND** the user can confirm the context with `Use selected task`

#### Scenario: Task picker states remain distinct
- **WHEN** project loading, task loading, empty results, validation failure, or request failure occurs in the task picker
- **THEN** the dialog renders a state specific to that condition
- **AND** failed requests are not collapsed into empty-data messaging

#### Scenario: Running update failure keeps dialog retryable
- **GIVEN** the top-bar timer task picker is open while a timer is running
- **WHEN** the running task or description update fails
- **THEN** the failure is surfaced through standard toast feedback
- **AND** the app refreshes authoritative timer state when the failure indicates timer-state conflict
- **AND** the dialog inputs remain available for retry unless the refreshed state makes the selection invalid

#### Scenario: Mobile task picker keeps full-width actions usable
- **GIVEN** the authenticated user opens the task picker from the mobile timer strip Change affordance
- **WHEN** the task-picker dialog renders below the mobile breakpoint
- **THEN** the dialog uses a near-full-width mobile layout with scrollable content
- **AND** the footer renders the state-appropriate primary action as a full-width button
- **AND** the footer does not render a `Cancel` dismissal button
- **AND** any running-timer `Change task` action remains a secondary full-width domain action rather than a dismissal action
- **AND** the dialog still separates existing task selection and Description from creating a new task inside the selected visible project

#### Scenario: Task picker dismissal uses popup close control
- **GIVEN** the top-bar timer task picker is open and no primary action is submitted
- **WHEN** the user activates the built-in dialog close control or existing non-destructive mask dismissal
- **THEN** the dialog closes without changing the selected task context, creating a task, starting a timer, stopping a timer, or updating a running entry
