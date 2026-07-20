## MODIFIED Requirements

### Requirement: Time Reports Aggregate By Project Task Or User

The backend MUST accept report requests as a validated JSON body of named properties rather than query-string parameters, rejecting any property outside the contract. It MUST support report grouping by an ordered `groupBy` array of one to four unique dimensions drawn from `project`, `task`, and `user`, with `project` as the default grouping. Single-dimension paths MUST keep the same aggregation behavior as the previous single-value `groupBy`. For multi-dimension paths, the backend MUST return one aggregate leaf row per distinct combination of the requested dimensions, and each row MUST carry the identity context for every dimension on the requested path so clients can assemble the hierarchy and derive per-level subtotals.

#### Scenario: Report groups by project by default
- **GIVEN** an authenticated admin or PM requests a time report without `groupBy`
- **WHEN** matching completed time entries exist across projects
- **THEN** the backend returns one aggregate row per matching project

#### Scenario: Report groups by project
- **GIVEN** an authenticated admin or PM requests a time report with `groupBy: ["project"]`
- **WHEN** matching completed time entries exist across projects
- **THEN** the backend returns one aggregate row per matching project
- **AND** each row includes project context

#### Scenario: Report groups by task
- **GIVEN** an authenticated admin or PM requests a time report with `groupBy: ["task"]`
- **WHEN** matching completed time entries exist across tasks
- **THEN** the backend returns one aggregate row per matching task
- **AND** each row includes task context and parent project context

#### Scenario: Report groups by user
- **GIVEN** an authenticated admin or PM requests a time report with `groupBy: ["user"]`
- **WHEN** matching completed time entries exist across users
- **THEN** the backend returns one aggregate row per matching user
- **AND** each row includes user/member context

#### Scenario: Report groups by an ordered multi-level path
- **GIVEN** an authenticated admin or PM requests a time report with `groupBy: ["project", "user", "task"]`
- **WHEN** matching completed time entries exist across projects, users, and tasks
- **THEN** the backend returns one aggregate leaf row per distinct project-user-task combination
- **AND** each row includes project context, user/member context, and task context
- **AND** the response echoes the ordered grouping path

#### Scenario: Grouping dimensions are validated
- **GIVEN** an authenticated admin or PM requests a time report
- **WHEN** the `groupBy` value contains an unknown dimension, a duplicate dimension, or more than four dimensions
- **THEN** the backend rejects the request as a validation error

#### Scenario: Dimensions absent from the path stay null
- **GIVEN** an authenticated admin or PM requests a time report with `groupBy: ["project", "user"]`
- **WHEN** matching completed time entries exist
- **THEN** each returned row includes project and user context
- **AND** task context is null on every row

#### Scenario: Report request rejects properties outside the contract
- **GIVEN** an authenticated admin or PM requests a time report
- **WHEN** the request body carries a property the report contract does not define
- **THEN** the backend rejects the request as a validation error

#### Scenario: Report request rejects mistyped properties
- **GIVEN** an authenticated admin or PM requests a time report
- **WHEN** `page` or `limit` is sent as a string, or `groupBy` as a comma-separated string
- **THEN** the backend rejects the request as a validation error

### Requirement: Time Reports Support Shared Filters Search Sorting And Pagination

The backend MUST allow time reports to be filtered by project, user, date window, and case-insensitive search, and MUST return paginated JSON rows with metadata. Pagination MUST operate on top-level groups of the requested grouping path: `page` and `limit` select groups of the first grouping dimension ordered by the requested sort applied to their aggregate totals, and the response MUST include every leaf row belonging to the selected top-level groups so per-level subtotals derived from a page are exact.

#### Scenario: Report filters by project
- **GIVEN** matching completed entries exist across projects
- **WHEN** an admin or scoped PM supplies `projectId`
- **THEN** only entries for that project contribute to report rows and summary totals

#### Scenario: Report filters by user
- **GIVEN** matching completed entries exist across users
- **WHEN** an admin or PM supplies `userId`
- **THEN** only entries owned by that user contribute to report rows and summary totals

#### Scenario: Report search filters rows
- **GIVEN** matching completed entries exist across projects, tasks, and users
- **WHEN** an admin or PM supplies `search`
- **THEN** only entries whose project name, task title, user display name, or user email contains the search text contribute to report rows and summary totals
- **AND** the match is case-insensitive

#### Scenario: Report rows are paginated by top-level group
- **GIVEN** the filtered aggregate result has more top-level groups than the requested limit
- **WHEN** an admin or PM supplies `page` and `limit`
- **THEN** the response includes only leaf rows belonging to the requested page of top-level groups
- **AND** the response metadata reports the total top-level group count and total pages for the filtered result set

#### Scenario: Paginated subtrees are complete
- **GIVEN** a multi-level grouping request where a top-level group has many nested leaf rows
- **WHEN** an admin or PM requests a page that includes that top-level group
- **THEN** the response contains every leaf row of that top-level group
- **AND** no leaf row of an included top-level group is deferred to another page

#### Scenario: Report summary ignores pagination
- **GIVEN** the filtered aggregate result spans multiple pages
- **WHEN** an admin or PM requests a page of the report
- **THEN** the summary totals reflect all filtered matching entries
- **AND** the summary totals are not limited to the current page rows

### Requirement: Time Reports Can Be Exported As CSV

The backend MUST expose a protected export endpoint for detailed report data using the same filters, sorting properties, and authorization scope rules as the JSON time-report endpoint. The export request MUST be submitted as a validated JSON body of named properties rather than a query string, and the backend MUST reject a request carrying any property outside the contract rather than ignoring it. CSV export rows MUST remain detailed at the project-task-user aggregate level for every requested `groupBy` path; the ordered `groupBy` path MUST be preserved as export metadata and MUST NOT collapse CSV row granularity to match the JSON grouped rows.

#### Scenario: Admin exports time report CSV
- **GIVEN** an authenticated admin requests `POST /reports/time/export`
- **WHEN** matching completed entries exist
- **THEN** the backend responds with CSV content
- **AND** the export uses the same filters, sorting properties, and scope rules as `POST /reports/time`
- **AND** each exported row aggregates one project, task, and user combination rather than one JSON report group

#### Scenario: PM exports scoped time report CSV
- **GIVEN** an authenticated PM requests `POST /reports/time/export`
- **WHEN** matching completed entries exist inside and outside the PM report scope
- **THEN** the CSV includes only detailed aggregate rows within the PM report scope

#### Scenario: CSV groupBy does not collapse detailed rows
- **GIVEN** matching completed entries share a project but have different task or user context
- **WHEN** an authenticated admin or PM exports a CSV report with any `groupBy` path, including a multi-level path such as `groupBy: ["project", "user"]`
- **THEN** the CSV emits separate rows for each matching project-task-user combination
- **AND** each row records the ordered `groupBy` path in the CSV group-by column

#### Scenario: Member cannot export reports
- **GIVEN** an authenticated member belongs to a workspace
- **WHEN** the member requests `POST /reports/time/export`
- **THEN** the backend responds with 403 Forbidden

#### Scenario: Export request rejects properties outside the contract
- **GIVEN** an authenticated admin or PM requests an export
- **WHEN** the request body carries a property the export contract does not define
- **THEN** the backend rejects the request as a validation error
- **AND** no export is produced

#### Scenario: Exported cells cannot execute as spreadsheet formulas
- **GIVEN** a project, task, or member name beginning with a formula character
- **WHEN** an authenticated admin or PM exports a CSV report
- **THEN** the exported cell is neutralised so a spreadsheet reads it as text
- **AND** no exported field begins with a formula-initiating character
- **AND** every field is quoted so a separator inside a value cannot open a new cell

#### Scenario: CSV export includes aggregate columns
- **GIVEN** an authenticated admin or PM exports a time report
- **WHEN** the backend generates the CSV
- **THEN** each exported row includes group-by metadata, project context, task context, user context, total seconds, billable seconds, non-billable seconds, entry count, first started at, and last started at

## ADDED Requirements

### Requirement: Time Reports Can Be Exported As PDF

The backend MUST support `format=pdf` on the report export endpoint, producing a styled PDF document from the same filters, ordered grouping path, date-window defaults, and authorization scope rules as the CSV export. The CSV format MUST remain the default and keep its existing detailed row behavior. The PDF MUST render the grouped report: a document header identifying the product, workspace, and effective period, a summary of the applied filters and grouping path, overall summary totals, one table row per group node of the requested grouping path with per-level subtotals and indentation, an overall total row, and page footers carrying the generation date and page numbers.

#### Scenario: Admin exports a PDF report
- **GIVEN** an authenticated admin requests `POST /reports/time/export` with `format=pdf`
- **WHEN** matching completed entries exist
- **THEN** the backend responds with PDF content and a PDF content type
- **AND** the download filename carries the effective date window and a `.pdf` extension
- **AND** the document reflects the requested ordered grouping path with per-level subtotal rows

#### Scenario: Export format defaults to CSV
- **GIVEN** an authenticated admin requests `POST /reports/time/export` without `format`
- **WHEN** matching completed entries exist
- **THEN** the backend responds with the existing detailed CSV content unchanged

#### Scenario: PM PDF export stays inside report scope
- **GIVEN** an authenticated PM requests a PDF export
- **WHEN** matching completed entries exist inside and outside the PM report scope
- **THEN** the PDF includes only data within the PM report scope

#### Scenario: Member cannot export PDF reports
- **GIVEN** an authenticated member requests `GET /reports/time/export` with `format=pdf`
- **WHEN** the request is authorized
- **THEN** the backend responds with 403 Forbidden

#### Scenario: Invalid export format is rejected
- **GIVEN** an authenticated admin requests the export endpoint
- **WHEN** `format` is neither `csv` nor `pdf`
- **THEN** the backend rejects the request as a validation error
