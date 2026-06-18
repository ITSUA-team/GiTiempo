## MODIFIED Requirements

### Requirement: Global Top-Bar Timer

The user-web authenticated shell MUST expose timer state and task-context selection through a compact top-bar timer surface on tablet and desktop, and through the approved mobile timer strip on mobile authenticated member pages. Timer Start, Stop, and task-change controls MUST be owned by the task-picker popup flow rather than separate header-visible shell action buttons. This top-bar ownership rule does not forbid the documented Time Entries row/card `Start timer` and `Stop timer` actions for existing entries.

#### Scenario: Running timer shown in authenticated top bar

- **GIVEN** the authenticated user has a running timer
- **WHEN** any authenticated user-web page renders at tablet or desktop width
- **THEN** the top bar shows a compact running timer surface with live `HH:MM:SS` and current `Project / Task` in the same two-line surface
- **AND** activating the compact timer surface opens the top-bar timer task picker
- **AND** the top bar does not render a separate visible stop action outside the task-picker popup
- **AND** the elapsed display advances while the timer remains active without requiring a page refresh

#### Scenario: Running timer shown in mobile timer strip

- **GIVEN** the authenticated user has a running timer
- **WHEN** any authenticated user-web page renders below the mobile breakpoint
- **THEN** the mobile timer strip shows a `Task & timer` opener, live `HH:MM:SS`, and current `Project / Task`
- **AND** activating the `Task & timer` opener opens the top-bar timer task picker
- **AND** the strip does not render separate visible stop or task-change actions outside the task-picker popup
- **AND** the opener and elapsed timer state remain available even if the profile menu opens from the top-right identity control
- **AND** the elapsed display advances while the timer remains active without requiring a page refresh

#### Scenario: Idle top-bar timer uses eligible last tracked task

- **GIVEN** the authenticated user has no running timer
- **AND** the user has a most recent own time entry whose task and parent project are still visible and active
- **WHEN** any authenticated user-web page renders
- **THEN** the timer surface shows that last tracked `Project / Task` context
- **AND** activating the compact timer surface or mobile `Task & timer` opener opens the task-picker popup with that context available
- **AND** the popup-owned `Start timer` action creates a fresh running time entry for that task
- **AND** the previous time entry record is not resumed or mutated

#### Scenario: No eligible task keeps picker available

- **GIVEN** the authenticated user has no running timer
- **AND** no recent own time entry resolves to a currently visible active project and active task
- **WHEN** the timer surface renders
- **THEN** the timer surface keeps a no-eligible-task state visible
- **AND** the compact timer surface or mobile `Task & timer` opener remains clickable
- **AND** the popup-owned `Start timer` action is disabled until a valid task context is selected

#### Scenario: Timer summary load failure stays compact

- **WHEN** current timer or timer-summary data fails to load in the authenticated shell
- **THEN** the timer surface keeps the same compact desktop or mobile strip shape visible
- **AND** popup-owned start, stop, and task-change actions are unavailable while the state is not actionable
- **AND** the failure is surfaced through standard toast feedback

#### Scenario: Compact timer surface opens picker dialog

- **WHEN** the user activates the desktop compact timer surface or mobile `Task & timer` opener
- **THEN** a centered task-picker dialog opens
- **AND** the dialog uses visible Project -> Task selection only
- **AND** the dialog does not include manual interval entry controls
- **AND** visible timer Start, Stop, and task-change controls are rendered inside the dialog flow rather than beside the compact shell surface

### Requirement: Top-Bar Timer Task Picker

The user-web top-bar timer task picker MUST allow the user to choose an existing visible task context or create a new task inside the selected visible project, MUST remain usable from the mobile timer strip, MUST support popup-owned timer Start and Stop actions, and MUST support reassigning the task of the currently running timer.

#### Scenario: Existing task selected for idle timer context

- **GIVEN** the top-bar timer task picker is open
- **AND** no timer is currently running
- **WHEN** the user selects a visible project and one of that project's tasks
- **THEN** the dialog allows starting a fresh timer for the selected task with `Start timer`
- **AND** the top-bar timer context updates to the selected `Project / Task`
- **AND** the start action starts a fresh timer for that task

#### Scenario: Running timer task is preselected

- **GIVEN** the authenticated user has a running timer
- **WHEN** the user opens the top-bar timer task picker
- **THEN** the dialog preselects the running timer's current project and task
- **AND** loading task options does not clear that preselected task unless the user selects a different project
- **AND** the dialog exposes the running timer's popup-owned `Stop timer` action

#### Scenario: Running timer task is reassigned

- **GIVEN** the authenticated user has a running timer
- **AND** the top-bar timer task picker is open
- **WHEN** the user selects a different visible active task and confirms the selection with the popup-owned task-change action
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
- **WHEN** the user confirms the selected running task
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
- **AND** the user can start an idle timer with `Start timer` or confirm a running timer task change through the popup-owned action

#### Scenario: Task picker states remain distinct

- **WHEN** project loading, task loading, empty results, validation failure, or request failure occurs in the task picker
- **THEN** the dialog renders a state specific to that condition
- **AND** failed requests are not collapsed into empty-data messaging

#### Scenario: Mobile task picker keeps full-width actions usable

- **GIVEN** the authenticated user opens the task picker from the mobile timer strip `Task & timer` opener
- **WHEN** the task-picker dialog renders below the mobile breakpoint
- **THEN** the dialog uses a near-full-width mobile layout with scrollable content
- **AND** the footer actions render as full-width stacked buttons
- **AND** the popup-owned primary timer action renders before `Cancel` in the mobile stacked button and keyboard order
- **AND** the dialog still separates existing task selection from creating a new task inside the selected visible project
