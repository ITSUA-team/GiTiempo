# Frontend Admin Pages Specification

## Purpose

Define admin and project-manager SPA behavior for the admin-facing product pages in `admin-web`.

## Requirements

### Requirement: Admin Login Entry Page

The `admin-web` app MUST provide a dedicated login page that offers the supported authentication methods and keeps the admin product visually distinct while following the shared auth direction.

#### Scenario: Login page renders admin entry sections

- **WHEN** an anonymous user opens the admin login route
- **THEN** the page shows the branded admin hero content panel and the sign-in form panel
- **AND** the sign-in form includes email and password entry, a primary sign-in action, and a Google continuation action
- **AND** the page exposes a visible link back to `user-web`

### Requirement: Authenticated Admin Page Entry Expectations

Each admin-facing page in `admin-web` MUST assume an authenticated shell-owned entry path instead of serving as a public first-load route.

#### Scenario: Admin page loads through authenticated route tree

- **WHEN** a user opens any admin-facing page in the admin-web app
- **THEN** the page is reached through the authenticated route tree
- **AND** the page receives shared shell chrome instead of defining standalone public entry behavior

### Requirement: Admin Dashboard Summary

The admin dashboard SHALL summarize workspace state through stat cards and recent activity.

#### Scenario: Dashboard renders summary surfaces

- GIVEN an admin or project manager opens the dashboard
- WHEN the page renders
- THEN it shows summary cards for key metrics
- AND it shows a recent-activity surface using the established table pattern

### Requirement: Reports Generation And Export

The reports page MUST support report-generation setup controls, scoped report summaries for loaded data, table-only discovery filters, and frontend CSV export while preserving project-scope restrictions for PM users.

#### Scenario: Reports page renders reporting surface

- **WHEN** an admin or PM opens the reports page through the authenticated admin shell
- **THEN** the page shows a reports header with title, descriptive copy, and a primary `Export CSV` action
- **AND** the page shows project, member, date range, and group-by report setup controls
- **AND** the page shows summary totals above the results table
- **AND** the results table shows report rows with project, member, hours, and billable columns

#### Scenario: Initial report loading uses skeleton surface

- **WHEN** the reports page is waiting for required initial report data
- **THEN** it shows a loading skeleton that matches the reports header, filter bar, summary cards, and results table structure
- **AND** it does not render an empty report message before the initial request finishes

#### Scenario: Default all-project report loading is bounded

- **WHEN** the reports page loads the default `All projects` report scope
- **THEN** it starts from the projects visible through the existing project list endpoint
- **AND** it fetches time entries only for visible active projects that already report tracked hours
- **AND** it requests project time-entry pages sequentially with the existing maximum page size until all pages are loaded
- **AND** stale report responses do not overwrite newer report state

#### Scenario: Header setup controls define CSV generation scope

- **WHEN** the user changes project, member, date range, or group-by values in the header setup controls
- **THEN** those values are kept as report-generation setup state
- **AND** currently loaded table rows and summary cards do not change solely because those setup controls changed
- **AND** activating `Export CSV` builds rows from the current setup state through existing project time-entry endpoints

#### Scenario: Date range input uses controlled validation

- **WHEN** the user edits the report setup date range
- **THEN** the page uses a PrimeVue range date picker with manual input disabled
- **AND** the page shows a validation message if an end-before-start range is represented
- **AND** an invalid date range does not trigger report fetch or CSV export generation
- **AND** no backend endpoint or shared contract change is required for date validation semantics

#### Scenario: Summary totals reflect loaded report data

- **WHEN** report data loads successfully
- **THEN** summary totals are derived from the loaded scoped entries
- **AND** table-only search or column filters do not recalculate summary cards
- **AND** header setup control edits do not recalculate summary cards until report data state changes

#### Scenario: PM stays inside assigned scope

- **WHEN** a PM uses the reports page
- **THEN** project and member choices are limited to projects and users visible through the PM's existing project scope
- **AND** the PM cannot expand filters beyond that assigned scope from the reports UI
- **AND** PM report generation remains limited to active visible projects returned by existing project visibility rules

#### Scenario: Admin can explicitly report inactive or empty visible projects

- **WHEN** an admin explicitly selects a project returned by the existing project list endpoint
- **THEN** report generation may target that selected project even when it is inactive or has zero tracked hours
- **AND** the default `All projects` scope still excludes inactive projects and projects with zero tracked hours

#### Scenario: Results table supports discovery controls

- **WHEN** report rows are rendered
- **THEN** it exposes a global search control with placeholder `Search report rows`
- **AND** it exposes column filters for project, member, hours, and billable columns when matching controls are available
- **AND** clearing global search or column filters restores the rows loaded for the current report data state and role scope

#### Scenario: Frontend CSV export uses report setup controls

- **WHEN** the user activates `Export CSV`
- **THEN** the browser downloads a CSV built from generated rows for the current header setup controls
- **AND** the export includes the same role scope as the existing project and project time-entry endpoints
- **AND** table global search and column filters do not change the CSV export scope
- **AND** the export does not require a backend CSV endpoint

#### Scenario: Report request errors stay distinct from empty results

- **WHEN** required report data fails to load
- **THEN** the reports page shows a request-error state with retry affordance
- **AND** it does not show the empty report state as a substitute for the failed request

#### Scenario: Empty filtered report results are handled

- **WHEN** report data loads successfully but no rows match the current table discovery filters
- **THEN** the results table shows the standard empty-state message for no matching report rows
- **AND** summary totals remain based on the loaded report data rather than the table-only filters

### Requirement: Invoice Creation Workflow

The invoices page SHALL provide invoice creation through a modal workflow.

#### Scenario: Create invoice from dialog

- GIVEN a user opens the invoice creation flow
- WHEN the dialog is rendered
- THEN the dialog exposes project, date range, rate, discount, and total amount inputs

### Requirement: Administrative Management Pages

The members, projects, and settings pages MUST support the documented administrative management flows.

#### Scenario: Members management view

- GIVEN an admin opens the members page
- WHEN the page renders
- THEN it shows a stats header with title, description, and a primary `Invite Member` action
- AND it shows stat cards covering active members, pending invites, and assigned PMs
- AND it shows a members table with member identity, role, project assignment count, last activity, and actions
- AND it exposes inline PM assignment only for non-admin member rows
- AND it exposes inline edit and confirmed removal flows through the members table action column

#### Scenario: Workspace settings view

- GIVEN an admin opens the settings page
- WHEN the page renders
- THEN workspace settings are shown in a grouped single-column form layout
- AND the form includes workspace name, currency, default hourly rate, and time zone fields
- AND save actions remain discoverable at section level or page bottom

### Requirement: Projects Navigation Item Is Active On Project Subpages

The admin-web navigation MUST mark the Projects item as active whenever the user is on any page under the projects section.

#### Scenario: Projects nav item is active on Add Project page

- **WHEN** an authenticated admin user is on the `/projects/new` route
- **THEN** the Projects navigation item is rendered in the active state
- **AND** no other navigation item is rendered as active
