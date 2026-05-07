## ADDED Requirements

### Requirement: Admin Projects Page Renders Stats Header

The admin projects page MUST display a stats header with title "Projects", a description, and three stat cards (Active Projects, Private, Public) sourced from `GET /projects/management-summary`.

#### Scenario: Stats cards reflect live summary data

- **WHEN** the admin navigates to the projects page
- **THEN** the page fetches `GET /projects/management-summary` and renders three stat cards showing `activeProjects`, `privateProjects`, and `publicProjects` counts

#### Scenario: Stats cards refresh after mutation

- **WHEN** the admin saves an edit, archives, or unarchives a project
- **THEN** the page re-fetches `GET /projects/management-summary` and updates all three stat cards without a full page reload

### Requirement: Admin Projects Page Renders Filterable Projects Table

The admin projects page MUST display a DataTable of all workspace projects with columns for Project, Source, Assigned members, Hours, Visibility, and Actions.

#### Scenario: Table loads projects on mount

- **WHEN** the admin navigates to the projects page
- **THEN** the page fetches `GET /projects` and populates the table with all workspace projects

#### Scenario: Table defaults to active-first sort

- **WHEN** the projects table is rendered
- **THEN** active projects (`isActive: true`) appear before archived projects (`isActive: false`)

#### Scenario: Member filter narrows visible rows

- **WHEN** the admin selects a workspace member from the Assigned Member dropdown filter
- **THEN** only projects whose `members` array contains that member's `userId` are shown in the table

#### Scenario: Member filter options loaded from API

- **WHEN** the admin opens the member filter dropdown
- **THEN** the options are populated from `GET /workspace-members`

### Requirement: Admin Can Inline-Edit Project Via Row Expansion

The admin projects page MUST allow editing a project's visibility and member assignments through an inline form that expands within the table row.

#### Scenario: Edit form opens on Edit action

- **WHEN** the admin clicks "Edit" on an active project row
- **THEN** the row expands and shows the ProjectEditForm with the current visibility and members pre-filled

#### Scenario: Edit form saves visibility update

- **WHEN** the admin changes the visibility field and clicks Save
- **THEN** the page calls `PATCH /projects/:id` with the updated visibility
- **AND** the table row reflects the new visibility badge

#### Scenario: Edit form syncs member assignments

- **WHEN** the admin modifies the members MultiSelect and clicks Save
- **THEN** the page posts `POST /projects/:id/assignments` for added members and calls `DELETE /projects/:id/assignments/:userId` for removed members

#### Scenario: Edit form cell has zero padding

- **WHEN** the edit form is expanded inside a DataTable row
- **THEN** the wrapping table cell has `padding: 0` so the form sits flush with the row boundaries

#### Scenario: Save triggers stats and table refresh

- **WHEN** the admin saves the edit form
- **THEN** the page re-fetches `GET /projects` and `GET /projects/management-summary`

### Requirement: Admin Can Archive And Unarchive Projects

The admin projects page MUST allow archiving active projects and unarchiving archived projects.

#### Scenario: Archive action marks project inactive

- **WHEN** the admin clicks "Archive" on an active project row
- **THEN** the page calls `PATCH /projects/:id` with `{ isActive: false }`
- **AND** the row moves to the archived section and shows only the "Unarchive" action

#### Scenario: Archived rows are visually distinct

- **WHEN** a project has `isActive: false`
- **THEN** the project name is rendered in `$color-text-muted` and only the "Unarchive" action button is shown

#### Scenario: Unarchive action restores project

- **WHEN** the admin clicks "Unarchive" on an archived project row
- **THEN** the page calls `PATCH /projects/:id` with `{ isActive: true }`
- **AND** the project returns to the active section with Edit and Archive actions restored

#### Scenario: Archive/unarchive triggers refresh

- **WHEN** archive or unarchive completes
- **THEN** the page re-fetches `GET /projects` and `GET /projects/management-summary`

### Requirement: New Project Button Redirects To Add Project Route

The admin projects page MUST provide a "New Project" button that navigates to the add-project route.

#### Scenario: New Project navigates to add-project route

- **WHEN** the admin clicks "New Project"
- **THEN** the router pushes `/admin/projects/new`

#### Scenario: Add Project route renders a placeholder

- **WHEN** the admin navigates to `/admin/projects/new`
- **THEN** a placeholder page is shown indicating the add-project form is coming soon

### Requirement: Every UI Section Is A Dedicated Vue Component

The admin projects page MUST be implemented as a composition of named Vue single-file components; no non-trivial markup SHALL live directly in `ProjectsView.vue`.

#### Scenario: Page view is composition-only

- **WHEN** `ProjectsView.vue` is rendered
- **THEN** it composes `StatsHeader`, `ProjectStatCard`, `ProjectsTable`, and `ProjectEditForm` components with no inline table or form markup

#### Scenario: StatsHeader is reusable across admin pages

- **WHEN** `StatsHeader` is imported
- **THEN** it is sourced from `packages/web-shared` and can be used in both `apps/admin-web` and `apps/user-web`

#### Scenario: All controls are PrimeVue components

- **WHEN** any interactive control is rendered (button, dropdown, multiselect, badge)
- **THEN** it uses a PrimeVue v4 component — no raw HTML `<button>`, `<input>`, or `<select>` elements are used in component templates
