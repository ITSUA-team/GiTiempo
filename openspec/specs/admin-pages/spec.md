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

Each admin-facing product page in `admin-web` MUST assume an authenticated shell-owned entry path instead of serving as a public first-load route. Route-level 403 and 404 pages are standalone authenticated error-page exceptions to this shell-owned page-entry rule.

#### Scenario: Admin product page loads through authenticated route tree

- **WHEN** a user opens a dashboard, reports, invoices, members, projects, or settings page in the admin-web app
- **THEN** the page is reached through the authenticated route tree
- **AND** the page receives shared shell chrome instead of defining standalone public entry behavior

#### Scenario: Route-level admin error page stays outside shell chrome

- **WHEN** an authenticated user reaches an admin-web route-level 403 or 404 page
- **THEN** the page remains part of the authenticated route tree
- **AND** the page may render as a standalone error surface without shared shell chrome

### Requirement: Admin Dashboard Summary

The admin dashboard MUST summarize workspace state through a design-matched stat header, four role-appropriate summary cards, and a design-matched recent activity feed using only existing API-backed data.

#### Scenario: Dashboard renders summary surfaces

- GIVEN an admin or project manager opens the dashboard
- WHEN the page renders
- THEN it shows a `Dashboard` header with supporting copy matching the approved Admin Dashboard design
- AND it shows four summary cards for current workspace metrics derived from endpoints allowed for the authenticated role
- AND it shows a recent-activity feed matching the approved compact row design
- AND PM users do not require member or invite management endpoints to render the dashboard
- AND it does not require backend, shared contract, database, seed, migration, or OpenAPI changes

### Requirement: Reports Generation And Export

The reports page MUST support report setup controls for backend CSV export, scoped report summaries for loaded data, table-only discovery filters, and backend CSV generation while preserving project-scope restrictions for PM users.

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

#### Scenario: Header setup controls define backend CSV export scope

- **WHEN** the user changes project, member, date range, or group-by values in the header setup controls
- **THEN** those values are kept as report-generation setup state
- **AND** currently loaded table rows and summary cards do not change solely because those setup controls changed
- **AND** activating `Export CSV` requests backend CSV generation with the current setup state

#### Scenario: Results table keeps project-member time breakdowns

- **WHEN** report data loads successfully for the table
- **THEN** rows identify the member, project, tracked hours, and billable hours represented by that row
- **AND** project rows do not collapse member identity into aggregate placeholder labels

#### Scenario: Date range input uses controlled validation

- **WHEN** the user edits the report setup date range
- **THEN** the page uses a PrimeVue range date picker with manual input disabled
- **AND** the page shows a validation message if an end-before-start range is represented
- **AND** an invalid date range does not trigger report fetch or CSV export generation
- **AND** validation remains aligned with the shared report export query contract

#### Scenario: Summary totals reflect loaded report data

- **WHEN** report data loads successfully
- **THEN** summary totals are derived from the loaded backend-generated report rows
- **AND** table-only search or column filters do not recalculate summary cards

#### Scenario: PM stays inside visible report scope

- **WHEN** a PM uses the reports page
- **THEN** project and member choices are limited to active projects and users visible through the PM's existing report scope
- **AND** the PM cannot expand filters beyond active public projects plus active private projects assigned to that PM from the reports UI
- **AND** the existing scoped project and report APIs remain responsible for enforcing PM scope on loaded rows and CSV export

#### Scenario: Admin can explicitly report inactive or empty visible projects

- **WHEN** an admin explicitly selects a project returned by the existing project list endpoint
- **THEN** the backend CSV export request includes that project filter even when it is inactive or has zero tracked hours
- **AND** the backend export response determines whether any aggregate rows exist for that selection

#### Scenario: Results table supports discovery controls

- **WHEN** report rows are rendered
- **THEN** it exposes a global search control with placeholder `Search report rows`
- **AND** it exposes column filters for project, member, hours, and billable columns when matching controls are available
- **AND** clearing global search or column filters restores the rows loaded for the current report data state and role scope
- **AND** table-only search and column filters do not call report data endpoints

#### Scenario: CSV export uses backend report endpoint

- **WHEN** the user activates `Export CSV`
- **THEN** the page requests `GET /reports/time/export` with the current report setup controls
- **AND** the browser downloads the CSV returned by the backend
- **AND** table global search and column filters do not change the CSV export scope
- **AND** no browser-side report row aggregation or CSV serialization is required

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
- THEN workspace settings are shown in a grouped single-column form layout using the current API-supported workspace settings fields
- AND save actions remain discoverable at the page bottom
- AND the page uses the approved Settings design as the visual reference without adding unsupported backend fields

### Requirement: Projects Navigation Item Is Active On Project Subpages

The admin-web navigation MUST mark the Projects item as active whenever the user is on any page under the projects section.

#### Scenario: Projects nav item is active on Add Project page

- **WHEN** an authenticated admin user is on the `/projects/new` route
- **THEN** the Projects navigation item is rendered in the active state
- **AND** no other navigation item is rendered as active
