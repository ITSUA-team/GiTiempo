## MODIFIED Requirements

### Requirement: Time Entries Page Record Management
The Time Entries page MUST allow authenticated users to review, filter, create, edit, and delete their own time entries while keeping manual completed-entry creation out of the global top-bar timer surface, including GitHub-issue selection for visible GitHub-backed projects.

#### Scenario: Page renders approved record-management shell

- **WHEN** an authenticated user opens the Time Entries page
- **THEN** the page renders inside the authenticated shell
- **AND** the top-bar breadcrumb identifies the Time Entries page
- **AND** the page renders date-range, single-project, and task lookup filters above the grouped results region
- **AND** the page does not render a separate page-content text `+ New time entry` opener when the approved design relies on contextual group actions.

#### Scenario: User filters own entries

- **GIVEN** the user is viewing their own time entries
- **WHEN** the user applies date range, project, task search, selected task, or pagination controls
- **THEN** the page requests `GET /time-entries` with the matching shared list query fields
- **AND** task-title search filters the server-side paginated result set through `search`
- **AND** selecting a concrete task option may additionally filter by that task's `taskId`.

#### Scenario: Entries render grouped by day

- **GIVEN** the own-entry list request succeeds with entries across multiple dates
- **WHEN** the page renders results
- **THEN** entries are grouped by their started-at day
- **AND** each day group shows a day heading, the total time tracked that day, and a primary icon-only `New time entry` action with explicit tooltip and accessible label copy `New time entry`
- **AND** each entry row shows task, project, time range, duration, edit, and delete affordances according to entry state.

#### Scenario: Day heading shows the tracked total for that day

- **GIVEN** a day group renders with one or more own time entries
- **WHEN** the page renders the day heading
- **THEN** the heading shows the sum of the durations of that group's entries beside the day label
- **AND** the total uses the same compact duration format as the entry rows
- **AND** each entry contributes its full duration, matching the duration its own row displays

#### Scenario: Day total advances while an entry in that day is running

- **GIVEN** a day group contains a running entry
- **WHEN** the running duration advances
- **THEN** that day's total advances with it without requiring a page reload

#### Scenario: Day total is presented as the approved chip

- **WHEN** the page renders a day heading total
- **THEN** it renders as a tinted chip carrying a clock glyph and the duration
- **AND** the heading does not place a separator character between the day label and the total

#### Scenario: Running entries stay visible but not editable

- **GIVEN** the own-entry list includes a running entry
- **WHEN** the Time Entries page renders that row
- **THEN** the row is visually highlighted as running
- **AND** the row displays running duration in `HH:MM:SS` format
- **AND** the page does not allow editing or deleting it as a completed manual interval before it is stopped
- **AND** timer stop remains owned by the global top-bar timer.

#### Scenario: Day create opens manual-entry dialog with day preset

- **WHEN** the user activates a day-level primary icon-only `New time entry` action
- **THEN** the page opens the same PrimeVue dialog in create mode
- **AND** the dialog pre-fills the selected day in the started-at and ended-at fields while allowing the user to adjust times
- **AND** the dialog submit action copy remains unchanged.

#### Scenario: Pagination reflects backend metadata

- **GIVEN** the own-entry list response includes pagination metadata
- **WHEN** the page renders pagination
- **THEN** it uses the backend total and current page metadata for the PrimeVue paginator
- **AND** changing page requests the corresponding server-side page without discarding active filters.

#### Scenario: Manual entry dialog appends unsynced GitHub issues

- **GIVEN** the user opens the manual time-entry create or edit dialog
- **AND** the user selects a visible active GitHub-backed project
- **WHEN** the project has open GitHub issues that are not yet represented by visible local tasks
- **THEN** the dialog keeps visible local tasks available first
- **AND** it appends unsynced GitHub issue options for that project

#### Scenario: Manual entry dialog materializes selected GitHub issue before save

- **GIVEN** the user opens the manual time-entry create or edit dialog
- **AND** the selected task option is an unsynced GitHub issue
- **WHEN** the user saves the dialog successfully
- **THEN** the app first requests local task materialization for that issue
- **AND** it creates or updates the time entry with the returned local task id

#### Scenario: Manual entry dialog keeps GitHub suggestion request failure distinct

- **GIVEN** the user opens the manual time-entry create or edit dialog for a visible active GitHub-backed project
- **WHEN** GitHub issue suggestion loading fails
- **THEN** the dialog keeps a request-failure state visible
- **AND** it does not replace that failure with empty-task messaging
