## MODIFIED Requirements

### Requirement: Top-Bar Timer Task Picker

The user-web top-bar timer task picker MUST allow the user to choose an existing visible task context or create a new task inside the selected visible project, MUST remain usable from the mobile timer strip, and MUST support reassigning the task of the currently running timer.

#### Scenario: Existing task selected for idle timer context

- **GIVEN** the top-bar timer task picker is open
- **AND** no timer is currently running
- **WHEN** the user selects a visible project and one of that project's tasks
- **THEN** the dialog allows confirmation with `Use selected task`
- **AND** the top-bar timer context updates to the selected `Project / Task`
- **AND** a subsequent idle start action starts a fresh timer for that task

#### Scenario: Running timer task is preselected

- **GIVEN** the authenticated user has a running timer
- **WHEN** the user opens the top-bar timer task picker
- **THEN** the dialog preselects the running timer's current project and task
- **AND** loading task options does not clear that preselected task unless the user selects a different project

#### Scenario: Running timer task is reassigned

- **GIVEN** the authenticated user has a running timer
- **AND** the top-bar timer task picker is open
- **WHEN** the user selects a different visible active task and confirms the selection
- **THEN** the app updates the running time entry to that task without stopping the timer
- **AND** the timer surface refreshes from the authoritative current timer state
- **AND** the dialog closes after the refreshed timer state is applied

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
- **WHEN** the user confirms the selection
- **THEN** the app does not send a running-entry task update
- **AND** the dialog closes without changing the visible timer context

#### Scenario: Running timer task update failure keeps picker open

- **GIVEN** the authenticated user has a running timer
- **AND** the top-bar timer task picker is open
- **WHEN** the user selects a different task and the running-entry task update fails
- **THEN** the dialog remains open
- **AND** the dialog shows inline error feedback
- **AND** the visible current task does not switch to the failed selection
- **AND** not-found, authorization, validation, visibility, or conflict responses refresh the authoritative timer summary

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

#### Scenario: Mobile task picker keeps full-width actions usable

- **GIVEN** the authenticated user opens the task picker from the mobile timer strip Change affordance
- **WHEN** the task-picker dialog renders below the mobile breakpoint
- **THEN** the dialog uses a near-full-width mobile layout with scrollable content
- **AND** the footer actions render as full-width stacked buttons
- **AND** `Use selected task` renders before `Cancel` in the mobile stacked button and keyboard order
- **AND** the dialog still separates existing task selection from creating a new task inside the selected visible project
