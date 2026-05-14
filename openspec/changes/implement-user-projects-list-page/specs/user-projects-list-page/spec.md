## ADDED Requirements

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

#### Scenario: Projects page renders approved header and search
- **WHEN** an authenticated user opens the Projects list page
- **THEN** the page renders the title `Projects`
- **AND** the page renders descriptive copy for managing tasks across visible projects
- **AND** the header row renders a primary `+ New task` action
- **AND** the filter row renders a single PrimeVue AutoComplete search field with placeholder `Search projects or tasks`

#### Scenario: Visible projects render grouped task sections
- **GIVEN** visible projects and their active tasks load successfully
- **WHEN** the Projects list page renders the results
- **THEN** the content is grouped by visible project
- **AND** each project section header shows the project name and active task count
- **AND** each project section header renders a secondary `+ Add task` action
- **AND** each task row shows task title, status, updated metadata, and icon-only `Edit` and `Delete` row actions

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
The Projects list page MUST filter already-loaded visible project and task data on the frontend using one combined projects/tasks search control.

#### Scenario: Project match keeps full project group visible
- **GIVEN** visible projects and tasks have loaded
- **WHEN** the user searches text that matches a project name
- **THEN** the matching project section remains visible
- **AND** all loaded active task rows for that matching project remain visible

#### Scenario: Task match narrows parent project rows
- **GIVEN** visible projects and tasks have loaded
- **WHEN** the user searches text that matches one or more task names
- **THEN** each parent project section for matching tasks remains visible
- **AND** each matching parent section shows only the matching task rows

#### Scenario: Clearing search restores grouped list
- **GIVEN** the combined projects/tasks search has filtered the page
- **WHEN** the user clears the search field
- **THEN** the full loaded grouped project list is restored

### Requirement: User Projects Task Dialogs
The Projects list page MUST use a true PrimeVue Dialog for task creation and update flows.

#### Scenario: Page-level new task opens create dialog
- **GIVEN** visible projects are available
- **WHEN** the user activates the page-level `+ New task` action
- **THEN** a task create dialog opens
- **AND** the dialog requires a project selection
- **AND** the dialog requires a task title
- **AND** submitting valid input creates the task in the selected visible project

#### Scenario: Project-level add task opens preselected create dialog
- **GIVEN** a visible project section is rendered
- **WHEN** the user activates that section's `+ Add task` action
- **THEN** the task create dialog opens with that project selected
- **AND** submitting valid input creates the task in that project

#### Scenario: Edit action opens update dialog
- **GIVEN** a task row is rendered
- **WHEN** the user activates the row `Edit` action
- **THEN** a task update dialog opens
- **AND** the dialog pre-fills the task's project, title, and status
- **AND** the project field is display-only in update mode
- **AND** saving valid changes updates the task and refreshes the rendered row from the authoritative response

#### Scenario: Task dialog validation and request failures are retryable
- **WHEN** task dialog validation fails or the create/update request fails
- **THEN** the dialog remains open
- **AND** the page surfaces the specific validation or request error
- **AND** the user can correct the input and retry without reopening the dialog

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
