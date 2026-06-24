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

### Requirement: Role-Aware Admin Shell Navigation

The authenticated `admin-web` shell MUST render navigation affordances only for product routes available to the current user's workspace role.

#### Scenario: Member denial stays outside admin shell navigation

- **WHEN** an authenticated user with workspace role `member` reaches an allowed admin-web surface such as the standalone `/403` route
- **THEN** the standalone route-level page renders without admin shell chrome
- **AND** the user is not offered sidebar, mobile navigation, or profile-menu route actions that would open admin-only or PM-only product routes

#### Scenario: Member forbidden recovery does not loop

- **WHEN** an authenticated user with workspace role `member` reaches the standalone admin-web `/403` route
- **THEN** the primary recovery action switches to the configured user workspace destination
- **AND** the page does not render `Back to dashboard` as the primary recovery action for the member role

#### Scenario: Admin and PM forbidden recovery can return to dashboard

- **WHEN** an authenticated user with workspace role `admin` or `pm` reaches the standalone admin-web `/403` route
- **THEN** the page may render `Back to dashboard` as the primary recovery action
- **AND** that primary action targets an admin product route available to the current role

#### Scenario: PM sees only PM-allowed product navigation

- **WHEN** an authenticated user with workspace role `pm` renders the admin-web shell
- **THEN** the shell shows navigation entries for admin product routes available to PM users
- **AND** the shell omits navigation entries and profile-menu route actions that open admin-only pages

#### Scenario: Admin sees the full current admin navigation

- **WHEN** an authenticated user with workspace role `admin` renders the admin-web shell
- **THEN** the shell shows the current documented admin navigation entries for available admin product pages
- **AND** the profile settings entry remains available to the admin user

#### Scenario: Direct URL denial remains distinct from hidden navigation

- **WHEN** a user's workspace role does not allow a hidden admin-web navigation destination and the user enters that destination URL directly
- **THEN** route-level authorization redirects the user to `/403`
- **AND** the shell does not rely on hidden navigation as the only access control mechanism

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
The invoices page UI SHALL remain hidden until an invoice API/contract exists.

#### Scenario: Deferred invoice route renders no temporary invoice section

- **GIVEN** a user opens the invoices page
- **WHEN** the route content renders
- **THEN** the page does not render an invoice table, search control, create action, or modal dialog
- **AND** the admin shell navigation does not expose an Invoices entry while the invoice UI is deferred.

### Requirement: Administrative Management Pages
The members, projects, and settings pages MUST support the documented administrative management flows.

#### Scenario: Members management view

- GIVEN an admin opens the members page
- WHEN the page renders
- THEN it shows stat cards covering active members, pending invites, and assigned PMs
- AND it shows a members table with member identity, role, project assignment count, and last activity without a separate row action column
- AND the members table header exposes a search control plus a primary icon-only `Invite member` action with explicit tooltip and accessible label copy `Invite member`
- AND member names open inline settings that expose page-owned inline PM assignment only for non-admin member rows
- AND member names open inline settings that expose page-owned inline edit and confirmed removal flows.

#### Scenario: Workspace settings view

- GIVEN an admin opens the settings page
- WHEN the page renders
- THEN workspace settings are shown in a grouped single-column form layout
- AND the form includes workspace name, currency, default hourly rate, and time zone fields
- AND the time zone field is an editable selector populated with contract-valid time-zone options, including `UTC` and IANA time-zone names, the current persisted time-zone value, and the current draft/form time-zone value
- AND save actions remain discoverable at section level or page bottom.

#### Scenario: Workspace settings time zone save

- GIVEN an admin changes the Settings page time zone to a contract-valid time-zone value
- WHEN the admin saves settings
- THEN the page submits the changed `timeZone` through the existing workspace settings update boundary
- AND the saved form reconciles from the authoritative workspace settings response
- AND unchanged workspace settings fields are not sent only to satisfy schemas.

#### Scenario: Workspace settings time zone validation

- GIVEN an invalid time-zone value is represented in the Settings form state
- WHEN the admin attempts to save settings
- THEN the page shows field-level validation feedback for Time zone
- AND no workspace settings update request is sent.

### Requirement: Members Management Table Actions

The admin Members page SHALL use the member name as the inline settings entry point and SHALL NOT render a separate action column for the main members table.

#### Scenario: Member settings open from the member name

- **GIVEN** a manageable member row is rendered
- **WHEN** the user activates the member name
- **THEN** the inline member settings section opens
- **AND** the main members table does not render a separate `Actions` column with edit or remove icons
- **AND** the inline settings section keeps the role, project assignment, and `Remove member` controls available according to the member permissions

### Requirement: Projects Management Table Actions

The admin Projects page SHALL use the project name as the inline settings entry point and SHALL NOT render a separate row action column.

#### Scenario: Project settings own status-specific actions

- **GIVEN** a project row is rendered
- **WHEN** the user activates the project name
- **THEN** the inline project settings section opens
- **AND** the projects table does not render a separate `Actions` column with edit, archive, or unarchive icons
- **AND** active projects expose `Archive project` inside the inline settings section
- **AND** archived projects expose `Unarchive project` inside the inline settings section

### Requirement: Projects Navigation Item Is Active On Project Subpages

The admin-web navigation MUST mark the Projects item as active whenever the user is on any page under the projects section.

#### Scenario: Projects nav item is active on Add Project page

- **WHEN** an authenticated admin user is on the `/projects/new` route
- **THEN** the Projects navigation item is rendered in the active state
- **AND** no other navigation item is rendered as active

### Requirement: Settings Page Manages GitHub Workspace Access
The admin Settings page MUST provide an interactive GitHub Workspace Access card for managing the workspace GitHub organization allow-list.

#### Scenario: Settings page renders allowed organization management
- **GIVEN** an admin opens the Settings page
- **WHEN** the GitHub Workspace Access card loads successfully
- **THEN** the card shows the saved allowed GitHub organization logins
- **AND** each saved organization row shows helper copy indicating it is allowed for the workspace
- **AND** each row exposes a remove action
- **AND** the card exposes an Organization login field and primary Add organization action

#### Scenario: Settings page shows empty organization policy state
- **GIVEN** an admin opens the Settings page
- **AND** the workspace has no allowed GitHub organizations
- **WHEN** the GitHub Workspace Access card loads successfully
- **THEN** the card shows an empty state for allowed organizations
- **AND** the Add organization form remains available

#### Scenario: Settings page validates add organization input
- **GIVEN** an admin enters an empty or whitespace-only organization login
- **WHEN** the admin activates Add organization
- **THEN** the page shows field-level validation feedback
- **AND** no add organization request is sent

#### Scenario: Settings page adds organization
- **GIVEN** an admin enters a valid organization login
- **WHEN** the admin activates Add organization and the backend saves the policy row
- **THEN** the card reconciles from the authoritative response or refreshed policy list
- **AND** the page shows success toast feedback

#### Scenario: Settings page handles add organization failure
- **GIVEN** an admin enters an organization login that the backend rejects
- **WHEN** the add organization request fails
- **THEN** the card keeps the entered login available for correction
- **AND** the page shows error feedback without adding a local-only organization row

#### Scenario: Settings page guides GitHub App access recovery
- **GIVEN** an admin enters an organization login
- **AND** the backend rejects the add request with a frontend-safe recovery payload for missing GitHub connection, inaccessible organization, GitHub App blocked or needing approval, or retryable provider failure
- **WHEN** the Settings page renders the failed GitHub Workspace Access card
- **THEN** the card shows a GitHub App access recovery card group above the Add organization form
- **AND** each recovery card instruction and action state is derived from the backend response step status
- **AND** each recovery card shows instruction copy and the appropriate action button or link without visible status tags
- **AND** the recovery cards include install GitHub App, approve or unblock organization access, reconnect GitHub account, and retry allow-list check steps
- **AND** GitHub actions open the configured GitHub App install URL or default GiTiempo GitHub App installation request URL in a new tab
- **AND** the reconnect action routes to the existing user profile GitHub connection flow
- **AND** the retry action reuses the same organization login without requiring the admin to retype it

#### Scenario: Settings page removes organization
- **GIVEN** an admin sees a saved allowed GitHub organization row
- **WHEN** the admin activates Remove and the backend removes the policy row
- **THEN** the row is removed from the rendered allow-list after authoritative reconciliation
- **AND** the page shows success toast feedback

#### Scenario: Settings page handles organization policy request errors
- **GIVEN** the GitHub Workspace Access policy request fails
- **WHEN** the Settings page renders the GitHub card
- **THEN** the card shows a request-error state with retry
- **AND** it does not render a default empty allow-list as a substitute for the failed request

#### Scenario: Non-admin cannot reach management card through shell navigation
- **GIVEN** an authenticated user is not an admin member of the workspace
- **WHEN** the admin shell renders available navigation
- **THEN** the Settings route remains unavailable according to existing role-aware admin navigation behavior

