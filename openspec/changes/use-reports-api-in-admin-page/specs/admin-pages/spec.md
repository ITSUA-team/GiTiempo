## MODIFIED Requirements

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

#### Scenario: PM stays inside assigned scope

- **WHEN** a PM uses the reports page
- **THEN** project and member choices are limited to projects and users visible through the PM's existing project scope
- **AND** the PM cannot expand filters beyond that assigned scope from the reports UI
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
