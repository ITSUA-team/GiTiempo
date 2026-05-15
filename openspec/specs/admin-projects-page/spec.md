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

The admin Projects page MUST display all workspace projects in a filterable management table.

#### Scenario: Table loads projects on mount

- **WHEN** the admin opens the Projects page
- **THEN** the page fetches `GET /projects`
- **AND** the table shows Project, Source, Assigned members, Hours, Visibility, and Actions columns
- **AND** active projects appear before archived projects

#### Scenario: Member filter narrows visible rows

- **WHEN** the admin selects a workspace member in the Assigned Member filter
- **THEN** only projects assigned to that member are shown
- **AND** member filter options come from `GET /workspace-members`

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
