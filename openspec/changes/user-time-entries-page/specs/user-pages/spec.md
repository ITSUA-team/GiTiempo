## MODIFIED Requirements

### Requirement: Time Entries Page Record Management

The Time Entries page MUST allow authenticated users to review, filter, create, edit, and delete their own time entries while keeping manual completed-entry creation out of the global top-bar timer surface.

#### Scenario: Page renders approved record-management shell

- **WHEN** an authenticated user opens the Time Entries page
- **THEN** the page renders inside the authenticated shell
- **AND** the header shows the Time Entries title, descriptive subtitle, and a primary `+ New time entry` action
- **AND** the page renders date-range, single-project, and task lookup filters above the grouped results region

#### Scenario: User filters own entries

- **GIVEN** the user is viewing their own time entries
- **WHEN** the user applies date range, project, task search, selected task, or pagination controls
- **THEN** the page requests `GET /time-entries` with the matching shared list query fields
- **AND** task-title search filters the server-side paginated result set through `search`
- **AND** selecting a concrete task option may additionally filter by that task's `taskId`

#### Scenario: Entries render grouped by day

- **GIVEN** the own-entry list request succeeds with entries across multiple dates
- **WHEN** the page renders results
- **THEN** entries are grouped by their started-at day
- **AND** each day group shows a day heading and a day-level `+ New time entry` action
- **AND** each entry row shows task, project, time range, duration, edit, and delete affordances according to entry state

#### Scenario: Running entries stay visible but not editable

- **GIVEN** the own-entry list includes a running entry
- **WHEN** the Time Entries page renders that row
- **THEN** the row is visually highlighted as running
- **AND** the row displays running duration in `HH:MM:SS` format
- **AND** the page does not allow editing or deleting it as a completed manual interval before it is stopped
- **AND** timer stop remains owned by the global top-bar timer

#### Scenario: Header create opens manual-entry dialog

- **WHEN** the user activates the page-level `+ New time entry` action
- **THEN** the page opens a PrimeVue dialog in create mode without a preset day
- **AND** the dialog creates a completed manual time entry instead of starting or resuming a running timer

#### Scenario: Day create opens manual-entry dialog with day preset

- **WHEN** the user activates a day-level `+ New time entry` action
- **THEN** the page opens the same PrimeVue dialog in create mode
- **AND** the dialog pre-fills the selected day in the started-at and ended-at fields while allowing the user to adjust times

#### Scenario: Delete confirms before removal

- **GIVEN** the user views a completed own time entry
- **WHEN** the user activates delete for that entry
- **THEN** the page asks for confirmation using the standard PrimeVue confirmation dialog pattern
- **AND** accepting the confirmation deletes the entry, refreshes the list, and shows success toast feedback
- **AND** deletion failure keeps the entry visible and shows error toast feedback

#### Scenario: Loading empty and request-error states stay distinct

- **WHEN** the Time Entries page loads or refreshes own entries
- **THEN** loading, empty results, and request-error states are rendered as distinct user-visible states
- **AND** a failed request is not collapsed into an empty-data message

#### Scenario: Pagination reflects backend metadata

- **GIVEN** the own-entry list response includes pagination metadata
- **WHEN** the page renders pagination
- **THEN** it uses the backend total and current page metadata for the PrimeVue paginator
- **AND** changing page requests the corresponding server-side page without discarding active filters

### Requirement: Time Entries Editing Flow

The time entries page SHALL allow the user to review and edit their own completed entries through a shared dialog surface.

#### Scenario: Dialog edit for a time entry

- **GIVEN** the user views their time entries list
- **WHEN** they choose to edit one completed entry
- **THEN** the edit interaction opens in a PrimeVue dialog
- **AND** the dialog pre-fills the selected entry's project, task, started-at, ended-at, description, and billable state
- **AND** saving valid changes updates the entry, closes or resets the dialog according to the page flow, refreshes the list, and shows toast feedback

#### Scenario: Edit dialog uses approved field order

- **WHEN** the create or edit time-entry dialog renders
- **THEN** it renders project, task, started-at, ended-at, description, and billable fields in the approved order
- **AND** project uses a PrimeVue Select, task uses a PrimeVue AutoComplete, dates use PrimeVue DatePicker with time, description uses PrimeVue Textarea, and billable uses a binary PrimeVue Checkbox

#### Scenario: Completed entry can move to a different visible task

- **GIVEN** the user edits a completed own time entry
- **WHEN** the user selects a different visible active project and task and saves
- **THEN** the page submits the selected task identifier in the update request
- **AND** the refreshed row reflects the updated project and task display context

#### Scenario: Running entry is not editable before stop

- **GIVEN** the user views a running time entry in the Time Entries page
- **WHEN** edit controls are rendered for that entry
- **THEN** the page does not allow editing it as a completed manual interval
- **AND** the user can stop the running timer from the global top-bar timer instead

#### Scenario: Edit failures stay retryable

- **GIVEN** the user has changed values in the edit dialog
- **WHEN** the update request fails validation, authorization, visibility, or conflict checks
- **THEN** the dialog remains open with the user's pending values available for correction
- **AND** the page shows error toast feedback using the repository error-message order
