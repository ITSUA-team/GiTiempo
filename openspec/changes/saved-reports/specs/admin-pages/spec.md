## MODIFIED Requirements

### Requirement: Reports Generation And Export

The reports page MUST support report setup controls, a configurable ordered grouping builder of one to four levels, scoped report summaries for loaded data, table-only discovery filters, hierarchical grouped results, saved report presets, and CSV and PDF generation through an export menu that mirrors the on-screen report, while preserving project-scope restrictions for PM users.

#### Scenario: Reports page renders reporting surface

- **WHEN** an admin or PM opens the reports page through the authenticated admin shell
- **THEN** the page shows a reports header with title, descriptive copy, and a primary `Export` menu action offering "Export as CSV" and "Export as PDF"
- **AND** the page shows a saved reports bar above the summary totals
- **AND** the page shows project, member, date range, and grouping-builder report setup controls
- **AND** the page shows summary totals above the results table
- **AND** the results table shows report rows with grouping identity, hours, billable, billable share, and last activity columns

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

#### Scenario: Header setup controls define the exported report scope

- **WHEN** the user changes project, member, date range, or grouping-builder values in the header setup controls
- **THEN** those values are kept as report-generation setup state
- **AND** currently loaded table rows and summary cards do not change solely because those setup controls changed
- **AND** activating an export produces a file built from the report currently on screen, reflecting the setup state, the ordered grouping path, and every active table filter
- **AND** the `Export` menu stays enabled whenever the date range is valid and is not disabled by active table filters, because the exported file reflects those filters

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

#### Scenario: Saved reports bar lists workspace presets

- **WHEN** an admin or PM opens the reports page
- **THEN** the saved reports bar shows one tab per preset saved in the workspace
- **AND** the tab of the currently loaded preset is visually distinguished from the others
- **AND** the bar offers a `New report` action

#### Scenario: Opening a preset restores the whole report view

- **WHEN** the user activates a preset tab
- **THEN** the page restores that preset's date range, ordered grouping path, project and member scope, and column filters
- **AND** the restored date range is the exact absolute window saved by the preset
- **AND** the report reloads for the restored setup

#### Scenario: Unsaved changes are indicated against the loaded preset

- **WHEN** a preset is loaded and the user changes any setup control or column filter
- **THEN** the bar shows an unsaved-changes indicator
- **AND** reverting the change back to the preset's value clears the indicator

#### Scenario: Saving overwrites the loaded preset

- **WHEN** a preset is loaded, the view differs from it, and the user activates `Save`
- **THEN** the page stores the current configuration into that preset
- **AND** the unsaved-changes indicator clears

#### Scenario: Saving as new creates a named preset

- **WHEN** the user activates `Save as new…` and supplies a name
- **THEN** the page creates a preset carrying the current configuration
- **AND** the new preset becomes the loaded preset
- **AND** a name already used in the workspace is rejected with an inline message and no preset is created

#### Scenario: New report resets to defaults

- **WHEN** the user activates `New report`
- **THEN** the page clears the loaded preset and resets the grouping, scope, and column filters to their defaults
- **AND** no preset is created

#### Scenario: Preset references to removed projects or members degrade safely

- **WHEN** a preset names a project or member no longer available in the user's option scope
- **THEN** the page falls back to the unfiltered choice for that control
- **AND** the page reports the fallback to the user
- **AND** the report still loads

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
- **AND** it exposes a column filter for every table column: project, member, hours, billable, billable share, and last activity
- **AND** the billable share filter offers Any, Below 50%, 50%+, and 90%+; the last activity filter offers Any time, Today, Last 7 days, and Last 30 days
- **AND** table-only filters apply to leaf rows and the visible hierarchy with its subtotals is rebuilt from the surviving leaf rows
- **AND** clearing global search or column filters restores the rows loaded for the current report data state and role scope
- **AND** table-only search and column filters do not call report data endpoints

#### Scenario: Aggregate column filters compare displayed group totals

- **WHEN** the user sets the hours, billable, billable share, or last activity filter
- **THEN** top-level groups whose displayed totals satisfy the selected threshold remain, together with their whole subtree
- **AND** the comparison uses the group subtotals shown in the rows, never the invisible leaf aggregates underneath
- **AND** a group without a billable share only passes the Any option of the billable share filter
- **AND** Today matches groups whose last activity falls on the current local calendar day, and Last 7/30 days match activity within that many days of now
- **AND** the total row sums only the groups that remain visible

#### Scenario: CSV export mirrors the on-screen report

- **WHEN** the user activates "Export as CSV"
- **THEN** the page serializes the CSV in the browser from the filtered, grouped report tree currently shown, including the ordered grouping path with its subtotal and total rows
- **AND** the browser downloads that CSV without a dedicated backend export request
- **AND** the active global search and column filters are reflected in the exported rows, so the file matches the table
- **AND** workspace-controlled names are guarded against spreadsheet formula injection

#### Scenario: PDF export mirrors the on-screen report

- **WHEN** the user activates "Export as PDF"
- **THEN** the page builds a renderer-agnostic report document from the report currently shown — the same filtered, grouped rows, subtotals, and totals — and sends it to `POST /reports/time/export/pdf`
- **AND** the backend only styles that document into a PDF, behind the admin/PM role gate and a bounded strict schema, without re-querying report data
- **AND** the browser downloads the returned PDF, which matches the table including active table filters

#### Scenario: Report request errors stay distinct from empty results

- **WHEN** required report data fails to load
- **THEN** the reports page shows a request-error state with retry affordance
- **AND** it does not show the empty report state as a substitute for the failed request

#### Scenario: Empty filtered report results are handled

- **WHEN** report data loads successfully but no rows match the current table discovery filters
- **THEN** the results table shows the standard empty-state message for no matching report rows
- **AND** summary totals remain based on the loaded report data rather than the table-only filters
