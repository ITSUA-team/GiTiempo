## MODIFIED Requirements

### Requirement: User Projects List Layout
The Projects list page MUST match the approved user Projects list design and render visible projects grouped with their active tasks.

#### Scenario: Projects page renders approved header and lightweight filters
- **WHEN** an authenticated user opens the Projects list page
- **THEN** the page renders the title `Projects`
- **AND** the page renders descriptive copy for managing tasks across visible projects
- **AND** the header row renders a primary `+ New task` action
- **AND** the filter row renders a combined PrimeVue AutoComplete search field with placeholder `Search projects or tasks`
- **AND** the filter row renders a `Status` PrimeVue Select with `All statuses`, `Open`, and `Closed` options
- **AND** the filter row renders an `Updated` PrimeVue Select with `Any time`, `Today`, `Last 7 days`, and `Older` options

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
