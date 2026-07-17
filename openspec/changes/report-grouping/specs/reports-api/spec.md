## MODIFIED Requirements

### Requirement: Time Reports Aggregate By Project Task Or User

The backend MUST support report grouping by an ordered `groupBy` path of one to four unique dimensions drawn from `project`, `task`, and `user`, with `project` as the default grouping. Single-dimension paths MUST keep the same aggregation behavior as the previous single-value `groupBy`. For multi-dimension paths, the backend MUST return one aggregate leaf row per distinct combination of the requested dimensions, and each row MUST carry the identity context for every dimension on the requested path so clients can assemble the hierarchy and derive per-level subtotals.

#### Scenario: Report groups by project by default
- **GIVEN** an authenticated admin or PM requests a time report without `groupBy`
- **WHEN** matching completed time entries exist across projects
- **THEN** the backend returns one aggregate row per matching project

#### Scenario: Report groups by project
- **GIVEN** an authenticated admin or PM requests a time report with `groupBy=project`
- **WHEN** matching completed time entries exist across projects
- **THEN** the backend returns one aggregate row per matching project
- **AND** each row includes project context

#### Scenario: Report groups by task
- **GIVEN** an authenticated admin or PM requests a time report with `groupBy=task`
- **WHEN** matching completed time entries exist across tasks
- **THEN** the backend returns one aggregate row per matching task
- **AND** each row includes task context and parent project context

#### Scenario: Report groups by user
- **GIVEN** an authenticated admin or PM requests a time report with `groupBy=user`
- **WHEN** matching completed time entries exist across users
- **THEN** the backend returns one aggregate row per matching user
- **AND** each row includes user/member context

#### Scenario: Report groups by an ordered multi-level path
- **GIVEN** an authenticated admin or PM requests a time report with `groupBy=project,user,task`
- **WHEN** matching completed time entries exist across projects, users, and tasks
- **THEN** the backend returns one aggregate leaf row per distinct project-user-task combination
- **AND** each row includes project context, user/member context, and task context
- **AND** the response echoes the ordered grouping path

#### Scenario: Grouping dimensions are validated
- **GIVEN** an authenticated admin or PM requests a time report
- **WHEN** the `groupBy` value contains an unknown dimension, a duplicate dimension, or more than four dimensions
- **THEN** the backend rejects the request as a validation error

#### Scenario: Dimensions absent from the path stay null
- **GIVEN** an authenticated admin or PM requests a time report with `groupBy=project,user`
- **WHEN** matching completed time entries exist
- **THEN** each returned row includes project and user context
- **AND** task context is null on every row

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

The backend MUST expose a protected CSV export endpoint for detailed report data using the same filters, sorting parameters, and authorization scope rules as the JSON time-report endpoint. CSV export rows MUST remain detailed at the project-task-user aggregate level for every requested `groupBy` path; the ordered `groupBy` path MUST be preserved as export metadata and MUST NOT collapse CSV row granularity to match the JSON grouped rows.

#### Scenario: Admin exports time report CSV
- **GIVEN** an authenticated admin requests `GET /reports/time/export`
- **WHEN** matching completed entries exist
- **THEN** the backend responds with CSV content
- **AND** the export uses the same filters, sorting parameters, and scope rules as `GET /reports/time`
- **AND** each exported row aggregates one project, task, and user combination rather than one JSON report group

#### Scenario: PM exports scoped time report CSV
- **GIVEN** an authenticated PM requests `GET /reports/time/export`
- **WHEN** matching completed entries exist inside and outside the PM report scope
- **THEN** the CSV includes only detailed aggregate rows within the PM report scope

#### Scenario: CSV groupBy does not collapse detailed rows
- **GIVEN** matching completed entries share a project but have different task or user context
- **WHEN** an authenticated admin or PM exports a CSV report with any `groupBy` path, including a multi-level path such as `groupBy=project,user`
- **THEN** the CSV emits separate rows for each matching project-task-user combination
- **AND** each row records the ordered `groupBy` path in the CSV group-by column

#### Scenario: Member cannot export reports
- **GIVEN** an authenticated member belongs to a workspace
- **WHEN** the member requests `GET /reports/time/export`
- **THEN** the backend responds with 403 Forbidden

#### Scenario: CSV export includes aggregate columns
- **GIVEN** an authenticated admin or PM exports a time report
- **WHEN** the backend generates the CSV
- **THEN** each exported row includes group-by metadata, project context, task context, user context, total seconds, billable seconds, non-billable seconds, entry count, first started at, and last started at
