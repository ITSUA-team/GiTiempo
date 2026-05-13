## MODIFIED Requirements

### Requirement: Reports Generation And Export

The reports page MUST support report-generation setup controls, scoped report summaries for loaded data, table-only discovery filters, and frontend CSV export while preserving project-scope restrictions for PM users.

#### Scenario: Reports page renders the approved reporting surface

- **WHEN** an admin or PM opens the reports page through the authenticated admin shell
- **THEN** the page shows a reports header with title, descriptive copy, and a primary `Export CSV` action
- **AND** the page shows project, member, date range, and group-by report setup controls
- **AND** the page shows summary totals above the results table
- **AND** the results table shows report rows with project, member, hours, and billable columns

#### Scenario: Initial report loading uses the reports skeleton

- **WHEN** the reports page is waiting for required initial report data
- **THEN** it shows a loading skeleton that matches the reports header, filter bar, summary cards, and results table structure
- **AND** it does not render an empty report message before the initial request finishes

#### Scenario: Default all-project report loading is bounded

- **WHEN** the reports page loads the default `All projects` report scope
- **THEN** it starts from the projects visible through the existing project list endpoint
- **AND** it fetches time entries only for visible projects that are active and already report tracked hours
- **AND** it requests project time-entry pages sequentially with the existing maximum page size until all pages are loaded
- **AND** stale report responses do not overwrite newer report state

#### Scenario: Header setup controls define CSV generation scope

- **WHEN** the user changes project, member, date range, or group-by values in the header setup controls
- **THEN** those values are kept as report-generation setup state
- **AND** the currently loaded results table rows and summary cards do not change solely because those setup controls changed
- **AND** activating `Export CSV` builds rows from the current setup state through existing project time-entry endpoints

#### Scenario: Date range input uses controlled validation

- **WHEN** the user edits the report setup date range
- **THEN** the page uses a PrimeVue range date picker with manual input disabled
- **AND** the page shows a validation message if an end-before-start range is represented
- **AND** an invalid date range does not trigger report fetch or CSV export generation
- **AND** an invalid date range is not sent to the existing project time-entry endpoints
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
- **AND** user-triggered sortable columns are not required for this change

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
