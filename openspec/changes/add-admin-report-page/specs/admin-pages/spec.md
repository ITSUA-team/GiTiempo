## MODIFIED Requirements

### Requirement: Reports Filtering And Export

The reports page MUST support near-real-time filtering, scoped report summaries, discoverable table filtering, and frontend CSV export while preserving project-scope restrictions for PM users.

#### Scenario: Reports page renders the approved reporting surface

- **WHEN** an admin or PM opens the reports page through the authenticated admin shell
- **THEN** the page shows a reports header with title, descriptive copy, and a primary `Export CSV` action
- **AND** the page shows project, member, date range, and group-by filters
- **AND** the page shows summary totals above the results table
- **AND** the results table shows report rows with project, member, hours, and billable columns

#### Scenario: Initial report loading uses the reports skeleton

- **WHEN** the reports page is waiting for required initial report data
- **THEN** it shows a loading skeleton that matches the reports header, filter bar, summary cards, and results table structure
- **AND** it does not render an empty report message before the initial request finishes

#### Scenario: Report filters update results

- **WHEN** the user changes project or date range filters
- **THEN** the results update after the configured 300ms debounce behavior
- **AND** the summary totals stay aligned with the filtered result set

#### Scenario: Member and group filters derive from scoped rows

- **WHEN** the user changes member or group-by filters
- **THEN** the visible report rows and summary totals update using only rows loaded for the current project and date scope
- **AND** clearing those filters restores the full result set allowed by the current project and date scope

#### Scenario: PM stays inside assigned scope

- **WHEN** a PM uses the reports page
- **THEN** project and member choices are limited to projects and users visible through the PM's existing project scope
- **AND** the PM cannot expand filters beyond that assigned scope from the reports UI

#### Scenario: Results table supports discovery controls

- **WHEN** report rows are rendered
- **THEN** the results table is sortable
- **AND** it exposes a global search control with placeholder `Search report rows`
- **AND** it exposes column filters for project, member, hours, and billable columns when matching controls are available
- **AND** clearing global search or column filters restores the table rows allowed by page-level filters and role scope

#### Scenario: Frontend CSV export uses visible report rows

- **WHEN** the user activates `Export CSV`
- **THEN** the browser downloads a CSV built from the current visible report rows
- **AND** the export includes the same role scope and active report filters as the table
- **AND** the export does not require a backend CSV endpoint

#### Scenario: Report request errors stay distinct from empty results

- **WHEN** required report data fails to load
- **THEN** the reports page shows a request-error state with retry affordance
- **AND** it does not show the empty report state as a substitute for the failed request

#### Scenario: Empty filtered report results are handled

- **WHEN** report data loads successfully but no rows match the current filters
- **THEN** the results table shows the standard empty-state message for no matching report rows
- **AND** the summary totals reflect the empty filtered result set
