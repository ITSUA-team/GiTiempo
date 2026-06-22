## MODIFIED Requirements

### Requirement: Time Entries Page Record Management
The Time Entries page MUST allow authenticated users to review, filter, create, edit, and delete their own time entries while keeping manual completed-entry creation out of the global top-bar timer surface.

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
- **AND** each day group shows a day heading and a primary icon-only `New time entry` action with explicit tooltip and accessible label copy `New time entry`
- **AND** each entry row shows task, project, time range, duration, and entry-state actions.
- **AND** completed entries expose a direct `Start timer` action for the entry's task.
- **AND** the active running entry exposes a direct `Stop timer` action.

#### Scenario: Running entries stay visible but not editable

- **GIVEN** the own-entry list includes a running entry
- **WHEN** the Time Entries page renders that row
- **THEN** the row is visually highlighted as running
- **AND** the row displays running duration in `HH:MM:SS` format
- **AND** the page does not allow editing or deleting it as a completed manual interval before it is stopped
- **AND** the row exposes a direct `Stop timer` action for that running entry.
- **AND** global top-bar timer state stays synchronized from the authoritative stop response.

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
