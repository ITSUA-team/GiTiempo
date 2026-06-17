# user-projects-list-page Specification

## Purpose
TBD - created by archiving change implement-user-projects-list-page. Update Purpose after archive.
## Requirements
### Requirement: User Projects List Route
The user-web app MUST provide an authenticated Projects list page reached from the authenticated shell Projects navigation without requiring a placeholder project id.

#### Scenario: Projects navigation opens list page
- **GIVEN** an authenticated user is in the user-web shell
- **WHEN** the user activates the Projects navigation item
- **THEN** the app navigates to the Projects list page
- **AND** the Projects navigation item is marked active
- **AND** the route does not require a synthetic project id such as `workspace-alpha`

#### Scenario: Anonymous user is redirected from projects list
- **GIVEN** a user is not authenticated
- **WHEN** the user opens the Projects list route
- **THEN** the app redirects to the login route with the Projects list route preserved as the redirect target

### Requirement: User Projects List Layout
The Projects list page MUST match the approved user Projects list design and render visible projects grouped with their active tasks.

#### Scenario: Projects page renders approved breadcrumb and lightweight filters
- **WHEN** an authenticated user opens the Projects list page
- **THEN** the authenticated shell top-bar breadcrumb identifies the `Projects` page
- **AND** the filter row renders a combined PrimeVue AutoComplete search field with placeholder `Search projects or tasks`
- **AND** the filter row renders a `Status` PrimeVue Select with `All statuses`, `Open`, and `Closed` options
- **AND** the filter row renders an `Updated` PrimeVue Select with `Any time`, `Today`, `Last 7 days`, and `Older` options
- **AND** the page does not render a separate page-content text `+ New task` opener when task creation is provided through contextual project sections

#### Scenario: Visible projects render grouped task sections
- **GIVEN** visible projects and their active tasks load successfully
- **WHEN** the Projects list page renders the results
- **THEN** the content is grouped by visible project
- **AND** each project section header shows the project name and active task count
- **AND** each project section header renders a primary icon-only `Add task` action with tooltip and accessible label copy `Add task`
- **AND** each task row shows a clickable task title, status, and updated metadata without separate `Edit` or `Delete` row-action cells

#### Scenario: Inactive tasks are excluded from grouped list
- **GIVEN** a visible project has inactive tasks
- **WHEN** the Projects list page loads the project's default task list
- **THEN** inactive tasks are not shown in the grouped default list

#### Scenario: Inactive projects are excluded from the page
- **GIVEN** the visible projects response includes inactive projects
- **WHEN** the Projects list page prepares grouped project sections
- **THEN** inactive projects are excluded from the rendered grouped list
- **AND** the page does not request default task lists for those inactive projects

### Requirement: User Projects Combined Search
The Projects list page MUST filter already-loaded visible project and task data on the frontend using one combined projects/tasks search control plus lightweight `Status` and `Updated` controls. The `Updated` control MUST use the user's browser-local timezone for date buckets: `Today` is the current local calendar day, `Last 7 days` is the rolling seven-day local window including today, and `Older` is before that window.

#### Scenario: Project match keeps full project group visible
- **GIVEN** visible projects and tasks have loaded
- **AND** the `Status` filter is `All statuses`
- **AND** the `Updated` filter is `Any time`
- **WHEN** the user searches text that matches a project name
- **THEN** the matching project section remains visible
- **AND** all loaded active task rows for that matching project remain visible

#### Scenario: Task match narrows parent project rows
- **GIVEN** visible projects and tasks have loaded
- **AND** the `Status` filter is `All statuses`
- **AND** the `Updated` filter is `Any time`
- **WHEN** the user searches text that matches one or more task names
- **THEN** each parent project section for matching tasks remains visible
- **AND** each matching parent section shows only the matching task rows

#### Scenario: Status filter narrows task rows
- **GIVEN** visible projects and tasks have loaded with both open and closed tasks
- **WHEN** the user selects `Open` from the `Status` filter
- **THEN** only task rows with the user-facing status label `Open` remain visible
- **AND** project groups with no remaining matching task rows are removed
- **WHEN** the user selects `Closed` from the `Status` filter
- **THEN** only task rows with the user-facing status label `Closed` remain visible
- **AND** project groups with no remaining matching task rows are removed

#### Scenario: Updated filter narrows task rows
- **GIVEN** visible projects and tasks have loaded with tasks updated today, tasks updated within the last seven local days, and tasks updated before that seven-day window
- **WHEN** the user selects `Today` from the `Updated` filter
- **THEN** only task rows updated during the current browser-local calendar day remain visible
- **AND** project groups with no remaining matching task rows are removed
- **WHEN** the user selects `Last 7 days` from the `Updated` filter
- **THEN** only task rows updated within the rolling seven-day browser-local window remain visible
- **AND** project groups with no remaining matching task rows are removed
- **WHEN** the user selects `Older` from the `Updated` filter
- **THEN** only task rows updated before the rolling seven-day browser-local window remain visible
- **AND** project groups with no remaining matching task rows are removed

#### Scenario: Structured filters continue narrowing project-name matches
- **GIVEN** visible projects and tasks have loaded
- **AND** a project name matches the combined search text
- **AND** only some tasks in that project match the selected `Status` and `Updated` filters
- **WHEN** the Projects list page renders the filtered results
- **THEN** the matching project section remains visible
- **AND** that section shows only the task rows matching the selected `Status` and `Updated` filters
- **AND** the matching project section is removed if no task rows remain after those structured filters

#### Scenario: Filters stay frontend-only and user-scoped
- **GIVEN** visible projects and tasks have already loaded
- **WHEN** the user changes the combined search, `Status`, or `Updated` filters
- **THEN** the page filters the already loaded visible project/task data on the frontend
- **AND** the page does not add backend free-text search, backend status filters, backend updated filters, or new project/task list query parameters for these controls
- **AND** the page does not render admin-style filters such as source, members, visibility, or billable-default

#### Scenario: Clearing filters restores grouped list
- **GIVEN** the combined projects/tasks search or structured filters have filtered the page
- **WHEN** the user clears the search field and resets `Status` to `All statuses` and `Updated` to `Any time`
- **THEN** the full loaded grouped project list is restored

### Requirement: User Projects Task Dialogs
The Projects list page MUST use a true PrimeVue Dialog for task creation and update flows.

#### Scenario: Project-level add task opens preselected create dialog
- **GIVEN** a visible project section is rendered
- **WHEN** the user activates that section's primary icon-only `Add task` action
- **THEN** a task create dialog opens with that project selected
- **AND** submitting valid input creates the task in that project
- **AND** the dialog submit action copy remains unchanged.

#### Scenario: Task title opens update dialog
- **GIVEN** a task row is rendered
- **WHEN** the user activates the task title
- **THEN** a task update dialog opens
- **AND** the dialog pre-fills the task's project, title, and status
- **AND** the project field is display-only in update mode
- **AND** saving valid changes updates the task and refreshes the rendered row from the authoritative response.

#### Scenario: Task dialog validation and request failures are retryable
- **WHEN** task dialog validation fails or the create/update request fails
- **THEN** the dialog remains open
- **AND** the page surfaces the specific validation or request error
- **AND** the user can correct the input and retry without reopening the dialog.

### Requirement: User Projects Task Deletion
The Projects list page MUST use confirmation before deleting tasks and MUST treat backend delete responses as authoritative.

#### Scenario: Delete succeeds after confirmation
- **GIVEN** a task row is rendered
- **WHEN** the user confirms the row `Delete` action
- **AND** the backend returns `204 No Content`
- **THEN** the task is removed from the grouped list
- **AND** the page shows success feedback

#### Scenario: Delete conflict keeps task visible
- **GIVEN** a task has related time entries
- **WHEN** the user confirms deletion for that task
- **AND** the backend returns `409 Conflict` with an explanatory message
- **THEN** the task remains visible in the grouped list
- **AND** the page surfaces the backend message to the user

#### Scenario: Delete availability is not inferred from response metadata
- **WHEN** the Projects list page renders task rows
- **THEN** the page does not require `canDelete`, `hasTimeEntries`, or other delete-eligibility metadata on task responses
- **AND** delete failures are handled after the backend responds

### Requirement: User Projects Page States
The Projects list page MUST render loading, empty, and request-error states distinctly.

#### Scenario: Projects page loading state
- **WHEN** visible projects or project tasks are loading
- **THEN** the page renders a loading state that is distinct from empty and failed states

#### Scenario: Projects page empty state
- **GIVEN** visible projects and tasks load successfully
- **AND** no visible project/task rows are available for the current view
- **WHEN** the Projects list page renders
- **THEN** the page renders an empty state
- **AND** the page does not render request-error copy

#### Scenario: Projects page request error state
- **WHEN** visible projects or project tasks fail to load
- **THEN** the page renders a request-error state
- **AND** the page does not collapse the failure into empty-data messaging
- **AND** the page provides retryable feedback for the failed load

### Requirement: User Projects Client Boundary Regression Safety
Extending the user-web time/task client for Projects page task update and delete operations MUST NOT force unrelated read-only feature modules to depend on the full mutable task-management client surface.

#### Scenario: Dashboard overview keeps a read-only client dependency
- **GIVEN** the dashboard overview feature only reads own time entries
- **WHEN** the Projects page adds task update and delete methods to the existing time/task client
- **THEN** the dashboard overview composable depends on a narrow read-only client boundary for its required entry-list operation
- **AND** dashboard overview specs do not need to mock unrelated task mutation methods such as `updateTask` or `deleteTask`

### Requirement: User Projects Task Sections Adapt To Mobile Cards
User-web Projects task sections SHALL preserve desktop table rendering on tablet and desktop viewports while rendering mobile-readable stacked task cards below the documented mobile breakpoint.

#### Scenario: Projects task sections render mobile cards
- **GIVEN** the Projects page has a visible project section with active tasks
- **WHEN** the project section renders below the mobile breakpoint
- **THEN** the section renders one stacked card per task instead of the fixed-width desktop task table
- **AND** each task card shows a clickable task title, status, and updated metadata without separate `Edit` or `Delete` actions
- **AND** the project-level primary icon-only `Add task` action remains available in the section header with explicit tooltip and accessible label copy `Add task`.

#### Scenario: Projects task sections preserve desktop table
- **GIVEN** the Projects page has a visible project section with active tasks
- **WHEN** the project section renders at or above the mobile breakpoint
- **THEN** the section continues to render the existing desktop task table with task, status, and updated columns
- **AND** the project-level primary icon-only `Add task` action remains available in the section header with explicit tooltip and accessible label copy `Add task`.

### Requirement: User Projects Updated Metadata Uses Browser-Local Timezone

The user-web Projects list page SHALL format task updated metadata in the authenticated user's current browser-local timezone.

#### Scenario: Updated metadata uses local day-relative labels

- **GIVEN** the Projects list page renders task `updated` metadata from stored task timestamps
- **WHEN** a task timestamp falls on the user's current browser-local calendar day or previous browser-local calendar day
- **THEN** the rendered metadata uses browser-local `Today` or `Yesterday` labeling with browser-local time
- **AND** it does not derive those labels from UTC day boundaries

#### Scenario: Older updated metadata uses local weekday and time

- **GIVEN** the Projects list page renders task `updated` metadata for an older timestamp
- **WHEN** the timestamp is outside the user's current browser-local today/yesterday windows
- **THEN** the rendered metadata uses browser-local weekday and browser-local time formatting
- **AND** it does not render a raw ISO string or UTC-only formatted time label

