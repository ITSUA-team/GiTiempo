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
- **AND** the table shows Project, Source, Assigned members, Hours, and Visibility columns without a separate row-actions column
- **AND** active projects appear before archived projects
- **AND** the table card header exposes a global search control with placeholder `Search projects`
- **AND** the table card header exposes a primary icon-only `New project` action next to the search control with explicit tooltip and accessible label copy `New project`.

#### Scenario: Projects member filters require loaded workspace member data

- **GIVEN** project data has loaded
- **AND** workspace member data is still loading
- **WHEN** the Projects page is still completing its initial load
- **THEN** the page keeps the initial loading surface instead of rendering the Projects table with empty assigned-member filter options
- **AND** if workspace member data fails during initial load, the page renders the retryable Projects request-error surface
- **AND** the table does not imply that no workspace members are available only because workspace member data is unavailable.

#### Scenario: Project discovery filters narrow visible rows

- **WHEN** the admin enters global search text or selects Project, Source, Assigned members, Hours, or Visibility filters
- **THEN** visible project rows and mobile cards are limited to loaded projects matching all active filters
- **AND** global search matches project name, source label, assigned member names or emails or count, formatted total time, visibility label, and archived row status when rendered
- **AND** assigned-member filter options come from `GET /workspace-members`
- **AND** assigned-member row matching uses loaded project member assignments
- **AND** hours filter options are `Any`, `Tracked`, `40h+`, and `No hours`
- **AND** `Tracked` matches loaded rows with `totalSeconds > 0`
- **AND** `40h+` matches loaded rows with `totalSeconds >= 144000`
- **AND** `No hours` matches loaded rows with `totalSeconds === 0`
- **AND** clearing active filters restores all loaded projects allowed by the page's role scope
- **AND** filtering does not require a projects API request solely for table discovery.

#### Scenario: Projects filters follow approved table layout

- **WHEN** the Projects table renders on desktop
- **THEN** it shows a filter row directly below the column header with controls for Project, Source, Assigned members, Hours, and Visibility
- **AND** no row-actions column or row-action filter control is rendered
- **AND** the mobile card list exposes equivalent search and filter controls above the cards.

### Requirement: Projects Table Is A Dumb Presentational Table

The Projects table rendering component MUST NOT own project filtering, filtered-row derivation, expansion state, or project settings form rendering.

#### Scenario: Projects page owns table view model

- **GIVEN** the Projects page has loaded projects and workspace member data
- **WHEN** the page renders the Projects table
- **THEN** the page or a focused page composable derives the visible project table rows, filter options, empty-state copy, and expanded rows
- **AND** the Projects table receives those values as props and emits updates or row intents without storing or deriving them internally

#### Scenario: Projects table forwards presentational intents

- **GIVEN** the Projects table renders prepared desktop rows or mobile cards
- **WHEN** the admin changes a search/filter control or invokes Edit
- **THEN** the table emits the corresponding filter update or row intent with the selected project
- **AND** the table itself does not filter projects, toggle expansion, collapse rows, render project settings forms, call APIs, show toasts, or open confirmations

#### Scenario: Projects table remains presentational after archive refactor

- **WHEN** the Projects table is mounted for isolated component testing
- **THEN** it can render supplied rows, filters, mobile cards, and row-expansion slots without providing admin API clients, auth stores, toast services, confirmation services, workspace member derivation, or project settings form components
- **AND** existing Edit, Archive, and Unarchive action labels, tooltips, row expansion behavior, active/archived action visibility, and filter behavior remain unchanged from the user's perspective

### Requirement: Admin Can Inline-Edit Project Via Row Expansion

The admin Projects page MUST allow editing a project's visibility and member assignments through an inline expanded row form.

#### Scenario: Edit form saves project changes

- **WHEN** the admin edits an active project row
- **THEN** the row expands with current visibility and members pre-filled
- **AND** saving visibility calls `PATCH /projects/:id`
- **AND** saving member changes creates and removes assignment records for the changed members
- **AND** the page refreshes project rows and summary stats after save

#### Scenario: Projects expansion form emits save payload

- **GIVEN** the Projects page renders project settings expansion content
- **WHEN** the admin submits visibility or assigned-member changes
- **THEN** the expansion form emits a typed save payload
- **AND** the Projects page or focused composable performs auth checks, project update, assignment add/remove calls, success/error toast feedback, summary/row refresh, and row collapse
- **AND** the expansion form itself does not import admin API clients, auth stores, toast helpers, or confirmation helpers

### Requirement: Admin Can Archive And Unarchive Projects

The admin Projects page MUST allow archiving active projects and unarchiving archived projects.

#### Scenario: Archive and unarchive update project activity

- **WHEN** the admin archives an active project
- **THEN** the page calls `PATCH /projects/:id` with `{ isActive: false }`
- **AND** the project is visually treated as archived with only an Unarchive action
- **AND** unarchiving calls `PATCH /projects/:id` with `{ isActive: true }` and restores active project settings actions
- **AND** the page refreshes project rows and summary stats after either mutation

### Requirement: Project Settings Expansion Emits Archive Intents

The Projects page MUST keep project archive and unarchive API orchestration outside the Projects table and project settings rendering components while preserving the documented inline-settings action placement.

#### Scenario: Project settings archive action emits intent

- **GIVEN** the Projects page renders inline project settings for an active project
- **WHEN** the admin invokes the settings section's `Archive project` action
- **THEN** the page-owned settings content emits an `archive` intent with the selected project
- **AND** the Projects table itself does not expose row-level archive controls, open the confirmation dialog, call the project-update API, refresh loaded projects or summary stats, or show toast feedback

#### Scenario: Projects page handles confirmed archive

- **GIVEN** the Projects page receives an `archive` intent from the page-owned inline settings content
- **WHEN** the page handles the intent
- **THEN** it opens the shared destructive confirmation dialog using the selected project's name
- **AND** confirming updates the project with `{ isActive: false }`, refreshes project rows and summary stats on success, and shows success toast feedback
- **AND** cancelling sends no project-update request
- **AND** archive API errors are surfaced through error toast feedback without removing or changing the row in loaded data

#### Scenario: Project settings unarchive action emits intent

- **GIVEN** the Projects page renders inline project settings for an archived project
- **WHEN** the admin invokes the settings section's `Unarchive project` action
- **THEN** the page-owned settings content emits an `unarchive` intent with the selected project
- **AND** the Projects table itself does not expose row-level unarchive controls, call the project-update API, refresh loaded projects or summary stats, or show toast feedback

#### Scenario: Projects page handles unarchive

- **GIVEN** the Projects page receives an `unarchive` intent from the page-owned inline settings content
- **WHEN** the page handles the intent
- **THEN** it updates the project with `{ isActive: true }`, refreshes project rows and summary stats on success, and shows success toast feedback
- **AND** unarchive API errors are surfaced through error toast feedback without changing the row in loaded data

### Requirement: New Project Button Navigates To Add Project Route
The admin Projects page MUST provide a table-header New Project action that navigates to the add-project route.

#### Scenario: New Project navigates to add-project route

- **WHEN** the admin clicks the table-header primary icon-only `New project` action
- **THEN** the router navigates to `/projects/new`
- **AND** the action exposes tooltip and accessible label copy `New project`.

### Requirement: Admin Projects Page Uses Component Composition

The admin Projects page MUST be implemented as named Vue components and standard PrimeVue controls.

#### Scenario: Page view is composition-only

- **WHEN** `ProjectsView.vue` renders
- **THEN** it composes dedicated stats header, stat card, projects table, and project edit form components
- **AND** non-trivial table or form markup does not live directly in the route view
- **AND** standard interactive controls use PrimeVue components

### Requirement: Admin Projects Page Edits Project Billable Default
The admin Projects page MUST expose the project default billable value in project creation and settings flows and MUST save future-default changes before offering existing-record propagation.

#### Scenario: Add Project form includes task billable default
- **WHEN** an admin or PM opens the Add Project page
- **THEN** the form includes `Default billable for new tasks`
- **AND** submitting the form sends the selected project default billable value with the project create request

#### Scenario: Project settings form includes task billable default
- **GIVEN** the Projects page has loaded project rows
- **WHEN** an admin or PM opens a project's settings row
- **THEN** the form includes `New task billable default`
- **AND** the control is initialized from the project's `defaultBillableForTasks` value

#### Scenario: Saving changed project default persists future default immediately
- **GIVEN** an admin or PM changes `New task billable default`
- **WHEN** they save the project settings form
- **THEN** the page sends the new default in the project update request
- **AND** it treats the returned project as the authoritative future-default state

### Requirement: Admin Projects Page Prompts For Project Existing-Record Backfill
The admin Projects page MUST show the approved follow-up popup only after a project default billable value has changed and the project already has downstream records that can be updated.

#### Scenario: Project follow-up popup appears after saved default change with existing records
- **GIVEN** a project default billable save succeeds
- **AND** the saved default differs from the previous value
- **AND** the project has existing tasks or existing time entries
- **WHEN** the save flow settles
- **THEN** the page opens a PrimeVue Dialog titled `Update project billable default?`
- **AND** the popup explains that the future default is already saved

#### Scenario: Project follow-up popup offers only backfill choices
- **GIVEN** the project follow-up popup is open
- **WHEN** the popup renders
- **THEN** it offers checkbox choices for updating existing tasks in the project and existing time entries in the project
- **AND** it renders a primary action labeled `Update existing records`
- **AND** it does not render a separate `keep future defaults only` action

#### Scenario: Dismissing project follow-up leaves existing records unchanged
- **GIVEN** the project follow-up popup is open after the future default was saved
- **WHEN** the user dismisses the popup without choosing the primary action
- **THEN** the page sends no project backfill request
- **AND** existing tasks and time entries remain unchanged

#### Scenario: Confirming project follow-up requests selected backfills
- **GIVEN** the project follow-up popup is open
- **WHEN** the user selects one or both backfill choices and activates `Update existing records`
- **THEN** the page calls the project billable-default backfill endpoint with the selected choices
- **AND** success feedback uses the returned update counts
- **AND** failure feedback keeps the saved future default visible and does not imply existing records were updated

#### Scenario: No project follow-up appears when no downstream records exist
- **GIVEN** a project default billable save succeeds
- **AND** the project has no existing tasks and no existing time entries
- **WHEN** the save flow settles
- **THEN** the page does not show the project follow-up popup
