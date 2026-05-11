## ADDED Requirements

### Requirement: Global Top-Bar Timer

The user-web authenticated shell MUST expose timer start, stop, and task-context selection through a compact top-bar timer surface on every authenticated member page.

#### Scenario: Running timer shown in authenticated top bar

- **GIVEN** the authenticated user has a running timer
- **WHEN** any authenticated user-web page renders
- **THEN** the top bar shows a compact running timer surface with live `HH:MM:SS`, current `Project / Task`, a clickable task information field, and one stop action
- **AND** the elapsed display advances while the timer remains active without requiring a page refresh

#### Scenario: Idle top-bar timer uses eligible last tracked task

- **GIVEN** the authenticated user has no running timer
- **AND** the user has a most recent own time entry whose task and parent project are still visible and active
- **WHEN** any authenticated user-web page renders
- **THEN** the top bar shows that last tracked `Project / Task` context
- **AND** the top bar start action creates a fresh running time entry for that task
- **AND** the previous time entry record is not resumed or mutated

#### Scenario: No eligible task keeps picker available

- **GIVEN** the authenticated user has no running timer
- **AND** no recent own time entry resolves to a currently visible active project and active task
- **WHEN** the top-bar timer renders
- **THEN** the top bar keeps the compact timer surface visible in a no-eligible-task state
- **AND** the task information field remains clickable
- **AND** the start action is disabled until a valid task context is selected

#### Scenario: Timer summary load failure stays compact

- **WHEN** current timer or timer-summary data fails to load in the authenticated shell
- **THEN** the top-bar timer keeps the same compact surface shape visible
- **AND** the start or stop action is disabled while the state is not actionable
- **AND** the failure is surfaced through standard toast feedback

#### Scenario: Task information opens picker dialog

- **WHEN** the user activates the top-bar task information field
- **THEN** a centered task-picker dialog opens
- **AND** the dialog uses visible Project -> Task selection only
- **AND** the dialog does not include manual interval entry controls

### Requirement: Top-Bar Timer Task Picker

The user-web top-bar timer task picker MUST allow the user to choose an existing visible task context or create a new task inside the selected visible project.

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

### Requirement: Time Entries Page Record Management

The Time Entries page MUST allow authenticated users to review, filter, create, edit, and delete their own time entries, with manual interval creation owned by this page rather than the top-bar timer.

#### Scenario: Time entries page renders documented header and filters

- **WHEN** the authenticated user opens Time Entries
- **THEN** the page header shows a primary `+ New time entry` action beside the page title
- **AND** the filter bar includes date range, project filter, and task lookup controls
- **AND** loading, empty, and request-error states remain visually distinct

#### Scenario: Manual entry dialog creates a completed entry

- **GIVEN** the user opens the Time Entries `New time entry` dialog
- **WHEN** the user selects project, task, started-at, ended-at, optional description, and billable state, then submits valid data
- **THEN** the app creates a completed manual time entry
- **AND** the page refreshes the visible entry list
- **AND** success or failure is surfaced through standard toast feedback

#### Scenario: Day-level new entry action presets date

- **GIVEN** the Time Entries page is grouped by day
- **WHEN** the user activates a day row `+ New time entry` action
- **THEN** the same manual-entry dialog opens
- **AND** the dialog pre-fills the selected day while leaving task and time selection editable

#### Scenario: Delete uses confirmation

- **GIVEN** the Time Entries page displays a completed entry
- **WHEN** the user chooses to delete it
- **THEN** the app asks for confirmation using the shared confirmation dialog pattern
- **AND** confirming the action deletes the entry and refreshes the list
- **AND** cancellation leaves the entry unchanged

## MODIFIED Requirements

### Requirement: Time Entries Editing Flow

The time entries page SHALL allow the user to review and edit their own completed entries through a shared dialog surface.

#### Scenario: Dialog edit for a time entry

- GIVEN the user views their time entries list
- WHEN they choose to edit one completed entry
- THEN the edit interaction opens in a PrimeVue dialog
- AND the dialog pre-fills the selected entry's project, task, started-at, ended-at, description, and billable state
- AND saving valid changes updates the entry, closes or resets the dialog according to the page flow, refreshes the list, and shows toast feedback

#### Scenario: Running entry is not editable before stop

- GIVEN the user views a running time entry in the Time Entries page
- WHEN edit controls are rendered for that entry
- THEN the page does not allow editing it as a completed manual interval
- AND the user can stop the running timer from the global top-bar timer instead

## REMOVED Requirements

### Requirement: Timer Workflow Page

**Reason**: Timer start, stop, and task-context selection now live in the authenticated user-web top bar, and manual interval entry belongs on Time Entries.

**Migration**: Use the Global Top-Bar Timer and Top-Bar Timer Task Picker for timer control. Use the Time Entries page manual-entry dialog for completed manual intervals.
