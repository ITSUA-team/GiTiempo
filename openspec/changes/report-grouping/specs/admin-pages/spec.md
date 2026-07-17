## MODIFIED Requirements

### Requirement: Reports Generation And Export

The reports page MUST support report setup controls for backend CSV export, a configurable ordered grouping builder of one to four levels, scoped report summaries for loaded data, table-only discovery filters, hierarchical grouped results, and backend CSV generation while preserving project-scope restrictions for PM users.

#### Scenario: Reports page renders reporting surface

- **WHEN** an admin or PM opens the reports page through the authenticated admin shell
- **THEN** the page shows a reports header with title, descriptive copy, and a primary `Export CSV` action
- **AND** the page shows project, member, date range, and grouping-builder report setup controls
- **AND** the page shows summary totals above the results table
- **AND** the results table shows report rows with grouping identity, entries, hours, billable, billable share, and last activity columns

#### Scenario: Grouping builder configures an ordered multi-level grouping

- **WHEN** the user edits the grouping builder
- **THEN** the builder shows the current grouping as an ordered sequence of level chips drawn from project, member, and task
- **AND** the user can add a level (only dimensions not already selected are offered), remove a level, and reorder levels
- **AND** the builder enforces at least one and at most four unique levels
- **AND** the default grouping is a single project level

#### Scenario: Results table renders grouped rows as an expandable hierarchy

- **WHEN** report data loads for a multi-level grouping
- **THEN** the results table renders one row per group node, indented by its level in the grouping order
- **AND** non-leaf rows show subtotals aggregated from their subtree and can be expanded and collapsed
- **AND** subtotals shown for a parent row equal the sum of its visible subtree leaf rows
- **AND** the table shows an overall total row for the loaded result set

#### Scenario: Initial report loading uses skeleton surface

- **WHEN** the reports page is waiting for required initial report data
- **THEN** it shows a loading skeleton that matches the reports header, filter bar, summary cards, and results table structure
- **AND** it does not render an empty report message before the initial request finishes

#### Scenario: Header setup controls define backend CSV export scope

- **WHEN** the user changes project, member, date range, or grouping-builder values in the header setup controls
- **THEN** those values are kept as report-generation setup state
- **AND** currently loaded table rows and summary cards do not change solely because those setup controls changed
- **AND** activating `Export CSV` requests backend CSV generation with the current setup state, including the ordered grouping path

#### Scenario: Results table keeps grouped identity breakdowns

- **WHEN** report data loads successfully for the table
- **THEN** each row identifies the project, member, or task context for every dimension on its grouping path, plus tracked hours and billable hours
- **AND** rows do not collapse identities of requested grouping dimensions into aggregate placeholder labels

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
- **AND** table-only filters apply to leaf rows and the visible hierarchy with its subtotals is rebuilt from the surviving leaf rows
- **AND** clearing global search or column filters restores the rows loaded for the current report data state and role scope
- **AND** table-only search and column filters do not call report data endpoints

#### Scenario: CSV export uses backend report endpoint

- **WHEN** the user activates `Export CSV`
- **THEN** the page requests `GET /reports/time/export` with the current report setup controls, including the ordered grouping path
- **AND** the browser downloads the CSV returned by the backend
- **AND** the downloaded CSV contains backend-generated detailed project-task-user rows for the selected setup controls
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
