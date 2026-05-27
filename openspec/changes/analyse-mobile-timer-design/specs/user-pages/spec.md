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
- **AND** the dialog uses visible Project -> Task selection only
- **AND** the dialog does not include manual interval entry controls

### Requirement: Top-Bar Timer Task Picker

The user-web top-bar timer task picker MUST allow the user to choose an existing visible task context or create a new task inside the selected visible project, and MUST remain usable from the mobile timer strip.

#### Scenario: Existing task selected for timer context

- **GIVEN** the top-bar timer task picker is open
- **WHEN** the user selects a visible project and one of that project's tasks
- **THEN** the dialog allows confirmation with `Use selected task`
- **AND** the top-bar timer context updates to the selected `Project / Task`
- **AND** a subsequent idle start action starts a fresh timer for that task

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
