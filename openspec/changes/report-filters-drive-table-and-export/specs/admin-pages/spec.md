## MODIFIED Requirements

### Requirement: Reports Generation And Export

The reports page MUST support a date range control that scopes both loaded report data and backend CSV export, a grouping control that regroups loaded report data and travels to the CSV as metadata, scoped report summaries for loaded data, table discovery filters whose identity filters also scope the export, and backend CSV generation while preserving project-scope restrictions for PM users.

#### Scenario: Reports page renders reporting surface

- **WHEN** an admin or PM opens the reports page through the authenticated admin shell
- **THEN** the page shows a reports header with title, descriptive copy, and summary totals above the results table
- **AND** the results table header shows a date range control, a grouping control, a global search control, and a single primary `Export CSV` action
- **AND** the page does not show a separate report setup bar, nor project or member setup controls
- **AND** the results table shows report rows with hours and billable columns alongside the identity columns for the selected grouping

#### Scenario: Initial report loading uses skeleton surface

- **WHEN** the reports page is waiting for required initial report data
- **THEN** it shows a loading skeleton that matches the reports header, summary cards, and results table structure including its header controls
- **AND** the skeleton does not reserve space for a separate report setup bar
- **AND** it does not render an empty report message before the initial request finishes

#### Scenario: Date range scopes loaded report data and CSV export

- **WHEN** the user changes the date range control in the results table header
- **THEN** the page refetches report data for the new range
- **AND** loaded table rows and summary totals update to reflect the new range
- **AND** activating `Export CSV` requests backend CSV generation for that same range

#### Scenario: Grouping selects what a results row represents

- **WHEN** the user changes the grouping control in the results table header
- **THEN** the page regroups the already-loaded report without calling report data endpoints
- **AND** `Project` is the default grouping and groups rows by project
- **AND** `Member` groups rows by member
- **AND** summary totals reflect the regrouped report data

#### Scenario: Groupings cover the same report scope

- **WHEN** the user switches between groupings without changing the date range
- **THEN** every grouping covers the same visible projects for the current role scope
- **AND** summary totals stay the same, because changing grouping regroups the loaded report rather than rescoping it
- **AND** only the date range triggers a report refetch

#### Scenario: Project grouping totals time spent on each project

- **WHEN** the user groups by `Project`
- **THEN** each row totals the time spent on one project across all members
- **AND** the row reports how many members contributed to that project, phrased as a count of members
- **AND** the table hides the member column rather than showing an aggregate placeholder label

#### Scenario: Member grouping shows how each member spent time on projects

- **WHEN** the user groups by `Member`
- **THEN** each row still identifies the project the tracked time belongs to
- **AND** rows lead with the member column, ordered by member and then project

#### Scenario: Both groupings keep project and member filters

- **WHEN** report rows are rendered for any grouping
- **THEN** the project and member column filters both remain available, ordered to follow the columns
- **AND** filtering by a member under `Project` grouping narrows the projects shown to those that member contributed to
- **AND** the hours and billable columns remain available for every grouping

#### Scenario: Date range input uses controlled validation

- **WHEN** the user edits the report date range
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
- **THEN** loaded report rows and CSV export are limited to active projects and users visible through the PM's existing report scope
- **AND** the PM cannot widen that scope from the reports UI for any grouping
- **AND** the existing scoped project and report APIs remain responsible for enforcing PM scope on loaded rows and CSV export

#### Scenario: Results table supports discovery controls

- **WHEN** report rows are rendered
- **THEN** it exposes a global search control with placeholder `Search report rows`
- **AND** it exposes column filters for the visible identity columns plus hours and billable columns when matching controls are available
- **AND** clearing global search or column filters restores the rows loaded for the current report data state and role scope
- **AND** table search and column filters do not call report data endpoints

#### Scenario: CSV export uses backend report endpoint

- **WHEN** the user activates `Export CSV`
- **THEN** the page requests `GET /reports/time/export` scoped to the active date range, carrying the selected grouping
- **AND** the request also carries the table's project filter, and its member filter when grouping by member, so the CSV is scoped to the same rows and sums the table shows
- **AND** the browser downloads the CSV returned by the backend
- **AND** the downloaded CSV contains backend-generated detailed project-task-user rows regardless of the selected grouping
- **AND** the selected grouping is preserved as CSV metadata and does not collapse CSV row granularity
- **AND** no browser-side report row aggregation or CSV serialization is required

#### Scenario: Unexportable table filters block CSV export

- **WHEN** a global search, hours, or billable table filter is active, or a member filter is active while grouping by project
- **THEN** `Export CSV` is disabled and states why that filter cannot be exported
- **AND** activating it generates no CSV
- **AND** clearing the filter, or switching a member-filtered table to `Member` grouping, restores export

#### Scenario: Only filters the table and CSV agree on are exportable

- **WHEN** the system decides which table filters can scope the CSV
- **THEN** the project filter scopes it under either grouping, because folded project totals and per-member rows both cover exactly that project's entries
- **AND** the member filter scopes it only under `Member` grouping, where each row carries that member's own sums; over folded project rows the table keeps everyone's time while a member-scoped file would hold a fraction of it
- **AND** hours and billable do not, because they filter aggregate row totals and the CSV holds detailed project-task-user rows with no such totals to match
- **AND** global search does not, because it matches formatted labels including durations and percentages that the CSV cannot express, and the export endpoint's own search matches task titles the table never shows while ignoring those labels
- **AND** the export never silently ignores an active filter, nor silently applies a different one

#### Scenario: Report request errors stay distinct from empty results

- **WHEN** required report data fails to load
- **THEN** the reports page shows a request-error state with retry affordance
- **AND** it does not show the empty report state as a substitute for the failed request

#### Scenario: Empty filtered report results are handled

- **WHEN** report data loads successfully but no rows match the current table discovery filters
- **THEN** the results table shows the standard empty-state message for no matching report rows
- **AND** summary totals remain based on the loaded report data rather than the table-only filters
