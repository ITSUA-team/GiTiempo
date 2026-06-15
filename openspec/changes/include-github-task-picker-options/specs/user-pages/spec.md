## MODIFIED Requirements

### Requirement: Global Top-Bar Timer

The user-web authenticated shell MUST expose timer start, stop, and task-context selection through a compact top-bar timer surface on tablet and desktop, and through the approved mobile timer strip on mobile authenticated member pages.

#### Scenario: Running timer shown in authenticated top bar

- **GIVEN** the authenticated user has a running timer
- **WHEN** any authenticated user-web page renders at tablet or desktop width
- **THEN** the top bar shows a compact running timer surface with live `HH:MM:SS`, current `Project / Task`, a clickable task information field, and one stop action
- **AND** the elapsed display advances while the timer remains active without requiring a page refresh

#### Scenario: Running timer shown in mobile timer strip

- **GIVEN** the authenticated user has a running timer
- **WHEN** any authenticated user-web page renders below the mobile breakpoint
- **THEN** the mobile timer strip shows live `HH:MM:SS`, current `Project / Task`, a task-change affordance, and one stop action
- **AND** the stop action and task-change affordance remain available even if the profile menu opens from the top-right identity control
- **AND** the elapsed display advances while the timer remains active without requiring a page refresh

#### Scenario: Idle top-bar timer uses eligible last tracked task

- **GIVEN** the authenticated user has no running timer
- **AND** the user has a most recent own time entry whose task and parent project are still visible and active
- **WHEN** any authenticated user-web page renders
- **THEN** the timer surface shows that last tracked `Project / Task` context
- **AND** the start action creates a fresh running time entry for that task
- **AND** the previous time entry record is not resumed or mutated

#### Scenario: No eligible task keeps picker available

- **GIVEN** the authenticated user has no running timer
- **AND** no recent own time entry resolves to a currently visible active project and active task
- **WHEN** the timer surface renders
- **THEN** the timer surface keeps a no-eligible-task state visible
- **AND** the task information or task-change affordance remains clickable
- **AND** the start action is disabled until a valid task context is selected

#### Scenario: Timer summary load failure stays compact

- **WHEN** current timer or timer-summary data fails to load in the authenticated shell
- **THEN** the timer surface keeps the same compact desktop or mobile strip shape visible
- **AND** the start or stop action is disabled while the state is not actionable
- **AND** the failure is surfaced through standard toast feedback

#### Scenario: Task information opens picker dialog

- **WHEN** the user activates the timer task information field or mobile task-change affordance
- **THEN** a centered task-picker dialog opens
- **AND** the dialog uses task-target selection with workspace-local visible options and connected-user GitHub-backed options when available
- **AND** the dialog includes an optional Description field
- **AND** the dialog does not include manual interval entry controls

### Requirement: Top-Bar Timer Task Picker

The user-web top-bar timer task picker MUST allow the user to choose an existing visible workspace task context, choose a GitHub-backed issue candidate visible through the connected GitHub account, add an optional time-entry description, or create a new task inside the selected visible workspace project, and MUST remain usable from the mobile timer strip.

#### Scenario: Existing workspace task and description selected for idle timer context

- **GIVEN** the top-bar timer task picker is open while the timer is idle
- **WHEN** the user selects a visible workspace project, one of that project's tasks, and enters a description
- **THEN** the dialog allows confirmation with `Use selected task`
- **AND** the top-bar timer context updates to the selected `Project / Task`
- **AND** a subsequent idle start action starts a fresh timer for that task with the submitted description
- **AND** the previous time entry record is not resumed or mutated

#### Scenario: Connected GitHub issue selected for idle timer context

- **GIVEN** the top-bar timer task picker is open while the timer is idle
- **AND** the authenticated user has a connected GitHub account
- **WHEN** the user selects a GitHub-backed project or repository source and one of its visible GitHub issue options
- **THEN** the app resolves the GitHub issue option to a local timer task context
- **AND** the top-bar timer context updates from the resolved local `Project / Task`
- **AND** a subsequent idle start action starts a fresh timer for the resolved task with the submitted description

#### Scenario: Idle timer can start with no description

- **GIVEN** the top-bar timer task picker is open while the timer is idle
- **WHEN** the user selects a valid workspace task or GitHub issue option and leaves Description empty
- **THEN** the dialog allows confirmation with `Use selected task`
- **AND** a subsequent idle start action starts a fresh timer for the selected or resolved task with no description

#### Scenario: Running timer task and description are updated without stopping

- **GIVEN** the top-bar timer task picker is open while a timer is running
- **WHEN** the user selects a visible workspace task, changes Description, and confirms with `Use selected task`
- **THEN** the app updates the running entry's task and description
- **AND** the timer remains running
- **AND** the top-bar timer context updates from the authoritative response

#### Scenario: Running timer can move to connected GitHub issue

- **GIVEN** the top-bar timer task picker is open while a timer is running
- **AND** the authenticated user has a connected GitHub account
- **WHEN** the user selects a visible GitHub issue option, changes Description, and confirms with `Use selected task`
- **THEN** the app resolves the GitHub issue option to a local timer task context
- **AND** the app updates the running entry to the resolved task and description without stopping the timer
- **AND** the top-bar timer context updates from the authoritative response

#### Scenario: Running timer description can be cleared

- **GIVEN** the top-bar timer task picker is open while a running timer has a description
- **WHEN** the user clears Description and confirms with `Use selected task`
- **THEN** the app clears the running entry description without stopping the timer

#### Scenario: New task option remains last for workspace project tasks

- **GIVEN** the top-bar timer task picker is open with a visible workspace project selected
- **WHEN** the task dropdown options are shown
- **THEN** visible existing tasks for that project appear before `New task`
- **AND** `New task` is the last task option
- **AND** selecting `New task` shows a single required new-task title field directly below the task selector

#### Scenario: New task created inside selected workspace project

- **GIVEN** the top-bar timer task picker is open with a visible workspace project selected
- **WHEN** the user submits a valid new task title
- **THEN** the app creates the task inside the selected workspace project
- **AND** the dialog remains open with the newly created task selected
- **AND** the user can confirm the context with `Use selected task`

#### Scenario: Manual task creation is not offered for GitHub source selection

- **GIVEN** the top-bar timer task picker is open with a GitHub-backed project or repository source selected
- **WHEN** the task dropdown options are shown
- **THEN** the task options contain visible GitHub issue candidates for that source
- **AND** the task options do not include manual `New task` creation for the GitHub source

#### Scenario: Disconnected GitHub account keeps workspace selector valid

- **GIVEN** the authenticated user has no connected GitHub account
- **WHEN** the top-bar timer task picker loads options
- **THEN** the project and task selectors still show visible workspace-local options
- **AND** no GitHub-backed project or issue options are required for the dialog to remain usable
- **AND** disconnected GitHub state is not rendered as a workspace project/task request failure

#### Scenario: Selector source precedence is explicit

- **GIVEN** the authenticated user has visible workspace-local projects and connected GitHub-backed sources
- **WHEN** the top-bar timer task picker shows project options
- **THEN** visible workspace-local projects are listed before GitHub-backed project or repository sources
- **AND** selecting a workspace project loads workspace-local tasks for that project
- **AND** selecting a GitHub-backed source loads GitHub issue candidates visible through the connected GitHub account

#### Scenario: Task picker states remain distinct

- **WHEN** workspace project loading, workspace task loading, GitHub source loading, GitHub issue loading, empty results, validation failure, or request failure occurs in the task picker
- **THEN** the dialog renders a state specific to that condition
- **AND** failed requests are not collapsed into empty-data messaging

#### Scenario: Running update failure keeps dialog retryable

- **GIVEN** the top-bar timer task picker is open while a timer is running
- **WHEN** workspace task update, GitHub issue materialization, or running task or description update fails
- **THEN** the failure is surfaced through standard toast feedback
- **AND** the app refreshes authoritative timer state when the failure indicates timer-state conflict
- **AND** the dialog inputs remain available for retry unless the refreshed state makes the selection invalid

#### Scenario: Mobile task picker keeps full-width actions usable

- **GIVEN** the authenticated user opens the task picker from the mobile timer strip Change affordance
- **WHEN** the task-picker dialog renders below the mobile breakpoint
- **THEN** the dialog uses a near-full-width mobile layout with scrollable content
- **AND** the footer actions render as full-width stacked buttons
- **AND** `Use selected task` renders before `Cancel` in the mobile stacked button and keyboard order
- **AND** the dialog still separates task selection and Description from creating a new task inside the selected visible workspace project
