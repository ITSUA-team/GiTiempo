## MODIFIED Requirements

### Requirement: User Projects List Layout
The Projects list page MUST match the approved user Projects list design and render visible projects grouped with their active tasks.

#### Scenario: Projects page renders approved breadcrumb and search
- **WHEN** an authenticated user opens the Projects list page
- **THEN** the authenticated shell top-bar breadcrumb identifies the `Projects` page
- **AND** the filter row renders a single PrimeVue AutoComplete search field with placeholder `Search projects or tasks`
- **AND** the page does not render a separate page-content text `+ New task` opener when task creation is provided through contextual project sections.

#### Scenario: Visible projects render grouped task sections
- **GIVEN** visible projects and their active tasks load successfully
- **WHEN** the Projects list page renders the results
- **THEN** the content is grouped by visible project
- **AND** each project section header shows the project name and active task count
- **AND** each project section header renders a primary icon-only `Add task` action with explicit tooltip and accessible label copy `Add task`
- **AND** each task row shows a clickable task title, status, and updated metadata without separate `Edit` or `Delete` row-action cells.

#### Scenario: Inactive tasks are excluded from grouped list
- **GIVEN** a visible project has inactive tasks
- **WHEN** the Projects list page loads the project's default task list
- **THEN** inactive tasks are not shown in the grouped default list.

#### Scenario: Inactive projects are excluded from the page
- **GIVEN** the visible projects response includes inactive projects
- **WHEN** the Projects list page prepares grouped project sections
- **THEN** inactive projects are excluded from the rendered grouped list
- **AND** the page does not request default task lists for those inactive projects.

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
