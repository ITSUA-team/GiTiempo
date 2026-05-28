# Admin Projects Page Specification

## Purpose

Define the admin Projects management page behavior in `admin-web`.

## Requirements

### Requirement: Admin Projects Page Renders Stats Header

The admin Projects page MUST display a stats header and three stat cards sourced from `GET /projects/management-summary`.

#### Scenario: Stats cards reflect live summary data

- **WHEN** the admin opens the Projects page
- **THEN** the page fetches `GET /projects/management-summary`
- **AND** it renders Active Projects, Private, and Public counts from the response

#### Scenario: Stats refresh after mutation

- **WHEN** the admin saves an edit, archives, or unarchives a project
- **THEN** the page re-fetches `GET /projects/management-summary` without a full page reload

### Requirement: Admin Projects Page Renders Filterable Projects Table

The admin Projects page MUST display all workspace projects in a searchable, column-filterable management table.

#### Scenario: Table loads projects on mount

- **WHEN** the admin opens the Projects page
- **THEN** the page fetches `GET /projects`
- **AND** it fetches `GET /workspace-members` for assigned-member filter options
- **AND** the table shows Project, Source, Assigned members, Hours, Visibility, and Actions columns
- **AND** active projects appear before archived projects
- **AND** the table card header exposes a global search control with placeholder `Search projects`

#### Scenario: Projects member filters require loaded workspace member data

- **GIVEN** project data has loaded
- **AND** workspace member data is still loading
- **WHEN** the Projects page is still completing its initial load
- **THEN** the page keeps the initial loading surface instead of rendering the Projects table with empty assigned-member filter options
- **AND** if workspace member data fails during initial load, the page renders the retryable Projects request-error surface
- **AND** the table does not imply that no workspace members are available only because workspace member data is unavailable

#### Scenario: Project discovery filters narrow visible rows

- **WHEN** the admin enters global search text or selects Project, Source, Assigned members, Hours, or Visibility filters
- **THEN** visible project rows and mobile cards are limited to loaded projects matching all active filters
- **AND** global search matches project name, source label, assigned member names or emails or count, total hours, visibility label, and archived row status when rendered
- **AND** assigned-member filter options come from `GET /workspace-members`
- **AND** assigned-member row matching uses loaded project member assignments
- **AND** hours filter options are `Any`, `Tracked`, `40h+`, and `No hours`
- **AND** `Tracked` matches loaded rows with `totalHours > 0`
- **AND** `40h+` matches loaded rows with `totalHours >= 40`
- **AND** `No hours` matches loaded rows with `totalHours === 0`
- **AND** clearing active filters restores all loaded projects allowed by the page's role scope
- **AND** filtering does not require a projects API request solely for table discovery

#### Scenario: Projects filters follow approved table layout

- **WHEN** the Projects table renders on desktop
- **THEN** it shows a filter row directly below the column header with controls for Project, Source, Assigned members, Hours, and Visibility
- **AND** the Actions column does not render a filter control
- **AND** the mobile card list exposes equivalent search and filter controls above the cards

### Requirement: Admin Can Inline-Edit Project Via Row Expansion

The admin Projects page MUST allow editing a project's visibility and member assignments through an inline expanded row form.

#### Scenario: Edit form saves project changes

- **WHEN** the admin edits an active project row
- **THEN** the row expands with current visibility and members pre-filled
- **AND** saving visibility calls `PATCH /projects/:id`
- **AND** saving member changes creates and removes assignment records for the changed members
- **AND** the page refreshes project rows and summary stats after save

### Requirement: Admin Can Archive And Unarchive Projects

The admin Projects page MUST allow archiving active projects and unarchiving archived projects.

#### Scenario: Archive and unarchive update project activity

- **WHEN** the admin archives an active project
- **THEN** the page calls `PATCH /projects/:id` with `{ isActive: false }`
- **AND** the project is visually treated as archived with only an Unarchive action
- **AND** unarchiving calls `PATCH /projects/:id` with `{ isActive: true }` and restores active row actions
- **AND** the page refreshes project rows and summary stats after either mutation

### Requirement: New Project Button Navigates To Add Project Route

The admin Projects page MUST provide a New Project action that navigates to the add-project route.

#### Scenario: New Project navigates to add-project route

- **WHEN** the admin clicks New Project
- **THEN** the router navigates to `/projects/new`

### Requirement: Admin Projects Page Uses Component Composition

The admin Projects page MUST be implemented as named Vue components and standard PrimeVue controls.

#### Scenario: Page view is composition-only

- **WHEN** `ProjectsView.vue` renders
- **THEN** it composes dedicated stats header, stat card, projects table, and project edit form components
- **AND** non-trivial table or form markup does not live directly in the route view
- **AND** standard interactive controls use PrimeVue components
