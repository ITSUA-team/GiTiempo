## MODIFIED Requirements

### Requirement: Top-Bar Timer Task Picker

The user-web top-bar timer task picker MUST allow the user to choose an existing visible task context, add an optional time-entry description, or create a new task inside the selected visible project; MUST remain usable from the mobile timer strip; MUST support popup-owned timer Start and Stop actions; MUST support reassigning the task and description of the currently running timer; MUST rely on popup dismissal controls instead of a footer `Cancel` button; and, for GitHub-backed visible projects, SHALL expose eligible GitHub issue suggestions as optional inputs to the local task creation flow.

#### Scenario: Existing task and description selected for idle timer context

- **GIVEN** the top-bar timer task picker is open
- **AND** no timer is currently running
- **WHEN** the user selects a visible project, one of that project's tasks, and enters a description
- **THEN** the dialog allows starting a fresh timer for the selected task with `Start timer`
- **AND** the top-bar timer context updates to the selected `Project / Task`
- **AND** the start action starts a fresh timer for that task with the submitted description

#### Scenario: Idle timer can start with no description

- **GIVEN** the top-bar timer task picker is open while the timer is idle
- **WHEN** the user selects a visible project and task and leaves Description empty
- **THEN** the dialog allows starting a fresh timer for the selected task with `Start timer`
- **AND** the start action starts a fresh timer for that task with no description

#### Scenario: Running timer task is preselected

- **GIVEN** the authenticated user has a running timer
- **WHEN** the user opens the top-bar timer task picker
- **THEN** the dialog preselects the running timer's current project and task
- **AND** the dialog pre-fills the running timer's current description when one exists
- **AND** loading task options does not clear that preselected task unless the user selects a different project
- **AND** the dialog exposes the running timer's popup-owned `Stop timer` action

#### Scenario: Running timer task and description are reassigned

- **GIVEN** the authenticated user has a running timer
- **AND** the top-bar timer task picker is open
- **WHEN** the user selects a different visible active task, changes Description, and confirms the selection with the popup-owned task-change action
- **THEN** the app updates the running time entry to that task and description without stopping the timer
- **AND** the timer surface refreshes from the authoritative current timer state
- **AND** the dialog closes after the refreshed timer state is applied

#### Scenario: Running timer description can be cleared

- **GIVEN** the top-bar timer task picker is open while a running timer has a description
- **WHEN** the user clears Description and confirms with the popup-owned task-change action
- **THEN** the app clears the running entry description without stopping the timer
- **AND** the timer surface refreshes from the authoritative current timer state

#### Scenario: Running timer stops before task reassignment completes

- **GIVEN** the authenticated user has a running timer
- **AND** the top-bar timer task picker is open
- **WHEN** the timer stops before the selected task update completes successfully
- **THEN** the app treats the task update as a successful correction to the same time entry
- **AND** the timer surface refreshes from the authoritative current timer state
- **AND** the dialog closes even when the refreshed timer state shows no running timer

#### Scenario: Current running task confirmation does not update

- **GIVEN** the authenticated user has a running timer
- **AND** the top-bar timer task picker is open with the running timer's current task selected
- **WHEN** the user confirms the selected running task
- **THEN** the app does not send a running-entry task update
- **AND** the dialog closes without changing the visible timer context

#### Scenario: Running timer task update failure keeps picker open

- **GIVEN** the authenticated user has a running timer
- **AND** the top-bar timer task picker is open
- **WHEN** the user selects a different task or changes Description and the running-entry update fails
- **THEN** the dialog remains open
- **AND** the dialog shows inline error feedback
- **AND** the visible current task does not switch to the failed selection
- **AND** the dialog inputs remain available for retry unless the refreshed state makes the selection invalid
- **AND** not-found, authorization, validation, visibility, or conflict responses refresh the authoritative timer summary

#### Scenario: New task created inside selected project

- **GIVEN** the top-bar timer task picker is open with a visible project selected
- **WHEN** the user submits a valid new task title
- **THEN** the app creates the task inside the selected project
- **AND** the dialog remains open with the newly created task selected
- **AND** the user can start an idle timer with `Start timer` or confirm a running timer task change through the popup-owned action

#### Scenario: GitHub issue suggestions appear for browseable GitHub-backed projects

- **GIVEN** the top-bar timer task picker is open with a visible GitHub-backed project selected
- **AND** the project's repository owner is browseable in the current workspace
- **AND** the repository has open GitHub issues without matching existing local linked tasks
- **WHEN** task options finish loading
- **THEN** the dialog includes GitHub issue suggestions after existing local tasks and before the `New task` option
- **AND** each suggestion identifies the issue title and repository context without exposing GitHub token material

#### Scenario: GitHub issue suggestion selection seeds local task creation

- **GIVEN** the top-bar timer task picker shows a GitHub issue suggestion
- **WHEN** the user selects the suggestion
- **THEN** the dialog pre-fills the new local task title from the GitHub issue title
- **AND** the primary action creates a local task in the selected project before any timer can be started with that task
- **AND** selecting the suggestion does not mutate GitHub data

#### Scenario: Disallowed GitHub organization skips issue suggestions

- **GIVEN** the top-bar timer task picker is open with a visible GitHub-backed project selected
- **AND** the project repository owner is a GitHub organization that is not browseable in the current workspace
- **WHEN** the dialog evaluates GitHub issue suggestions
- **THEN** the app does not request repository issues for that organization repository
- **AND** the dialog remains usable for local task selection and local task creation
- **AND** the GitHub organization is not shown as an issue suggestion source

#### Scenario: GitHub issue suggestion failures do not block local task selection

- **GIVEN** the top-bar timer task picker is open with a visible GitHub-backed project selected
- **WHEN** GitHub issue suggestion loading fails
- **THEN** the dialog keeps existing local task options available
- **AND** failed GitHub issue suggestions are not rendered as local task empty-state content
- **AND** the user can still select an existing local task or create a new local task inside the selected project

#### Scenario: Task picker states remain distinct

- **WHEN** project loading, task loading, empty results, validation failure, or request failure occurs in the task picker
- **THEN** the dialog renders a state specific to that condition
- **AND** failed requests are not collapsed into empty-data messaging

#### Scenario: Mobile task picker keeps full-width actions usable

- **GIVEN** the authenticated user opens the task picker from the mobile timer strip `Task & timer` opener
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
