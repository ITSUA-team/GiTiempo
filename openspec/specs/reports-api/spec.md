# Reports API Specification

## Purpose

Define protected report endpoints for querying and exporting aggregated workspace time data.

## Requirements

### Requirement: Time Reports Can Be Queried By Admins And Project Managers

The backend MUST expose a protected JSON time-report endpoint for `admin` and `pm` users that aggregates completed time entries within the authenticated user's workspace.

#### Scenario: Admin queries workspace time report
- **GIVEN** an authenticated admin belongs to a workspace with completed time entries
- **WHEN** the admin requests `GET /reports/time`
- **THEN** the backend returns aggregate report rows for matching workspace time entries
- **AND** the response includes summary totals for the full filtered result set

#### Scenario: PM queries scoped time report
- **GIVEN** an authenticated PM belongs to a workspace with completed time entries
- **WHEN** the PM requests `GET /reports/time`
- **THEN** the backend returns aggregate report rows only for projects in the PM report scope
- **AND** the response includes summary totals only for that scoped filtered result set

#### Scenario: Member cannot query reports
- **GIVEN** an authenticated member belongs to a workspace
- **WHEN** the member requests `GET /reports/time`
- **THEN** the backend responds with 403 Forbidden

### Requirement: PM Report Scope Includes Public And Assigned Projects

The backend MUST scope PM reports to active public workspace projects plus active private projects assigned to the PM.

#### Scenario: PM sees active public project time
- **GIVEN** an authenticated PM is not assigned to an active public project
- **AND** that project has matching completed time entries
- **WHEN** the PM requests a time report
- **THEN** the public project's matching time entries contribute to the report

#### Scenario: PM sees assigned private project time
- **GIVEN** an authenticated PM is assigned to an active private project
- **AND** that project has matching completed time entries
- **WHEN** the PM requests a time report
- **THEN** the private project's matching time entries contribute to the report

#### Scenario: PM cannot report on unassigned private project
- **GIVEN** an authenticated PM is not assigned to an active private project
- **AND** that project has matching completed time entries
- **WHEN** the PM requests a time report
- **THEN** the private project's time entries do not contribute to the report

#### Scenario: PM project filter cannot widen scope
- **GIVEN** an authenticated PM supplies `projectId` for an unassigned private project
- **WHEN** the PM requests a time report
- **THEN** the backend does not return that private project's report data

### Requirement: Time Reports Use Calendar-Month Date Defaults

The backend MUST calculate an effective report date window for every report request, defaulting omitted date filters to the current UTC calendar month.

#### Scenario: Report omits date filters
- **GIVEN** an authenticated admin or PM requests a time report without `dateFrom` or `dateTo`
- **WHEN** the backend calculates the report window
- **THEN** `dateFrom` defaults to 00:00:00.000Z on the first day of the current UTC calendar month
- **AND** `dateTo` defaults to 00:00:00.000Z on the first day of the next UTC calendar month

#### Scenario: Report supplies dateFrom only
- **GIVEN** an authenticated admin or PM requests a time report with `dateFrom`
- **WHEN** the backend calculates the report window
- **THEN** the supplied `dateFrom` is used as the inclusive lower started-at boundary
- **AND** `dateTo` defaults to 00:00:00.000Z on the first day of the next UTC calendar month

#### Scenario: Report supplies dateTo only
- **GIVEN** an authenticated admin or PM requests a time report with `dateTo`
- **WHEN** the backend calculates the report window
- **THEN** `dateFrom` defaults to 00:00:00.000Z on the first day of the current UTC calendar month
- **AND** the supplied `dateTo` is used as the exclusive upper started-at boundary

#### Scenario: Report date filtering is closed-open
- **GIVEN** matching completed entries exist before, on, and after the report boundaries
- **WHEN** a report request uses an effective `dateFrom` and `dateTo`
- **THEN** entries with `startedAt` greater than or equal to `dateFrom` are included
- **AND** entries with `startedAt` greater than or equal to `dateTo` are excluded

### Requirement: Time Reports Aggregate By Project Task Or User

The backend MUST accept report requests as a validated JSON body of named properties rather than query-string parameters, rejecting any property outside the contract. It MUST support report grouping by an ordered `groupBy` array of one to four unique dimensions drawn from `project`, `task`, `user`, and `billable`, with `project` as the default grouping. The `billable` dimension is not an entity: it splits a level into a `billable` and a `nonBillable` bucket by whether entries are billable, and a `billable`-grouped row MUST carry that bucket as its identity for the dimension rather than an entity id. Single-dimension paths MUST keep the same aggregation behavior as the previous single-value `groupBy`. For multi-dimension paths, the backend MUST return one aggregate leaf row per distinct combination of the requested dimensions, and each row MUST carry the identity context for every dimension on the requested path so clients can assemble the hierarchy and derive per-level subtotals.

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

#### Scenario: Report groups by the billable dimension
- **GIVEN** an authenticated admin or PM requests a time report with `groupBy: ["billable"]`
- **WHEN** matching completed time entries exist across billable and non-billable entries
- **THEN** the backend returns one aggregate row per billable bucket
- **AND** each row carries its bucket identity as `billable` or `nonBillable`

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

### Requirement: Time Reports Aggregate Completed Entries Only

The backend MUST aggregate only completed time entries with finalized durations.

#### Scenario: Running entries are excluded from reports
- **GIVEN** a matching running time entry has no `endedAt` and no finalized duration
- **WHEN** an admin or PM requests a time report
- **THEN** the running entry does not contribute to rows, entry counts, or summary totals

#### Scenario: Billable and non-billable totals are separated
- **GIVEN** matching completed time entries include billable and non-billable entries
- **WHEN** an admin or PM requests a time report
- **THEN** each row and the summary include total seconds, billable seconds, non-billable seconds, and entry count

### Requirement: Time Reports Can Be Exported As PDF

Report export is produced client-side (WYSIWYG): the browser serializes the CSV itself and builds the on-screen grouped report as a document, so the backend no longer exposes a CSV or combined report-export endpoint. The backend MUST expose a single protected export endpoint, `POST /reports/time/export/pdf`, that accepts a client-built report document and returns a styled PDF of exactly that document. The endpoint MUST only apply PDF styling and MUST NOT re-query report data, so the file matches what the caller had on screen. It MUST enforce the same admin-or-PM authorization scope as the JSON time-report endpoint, and MUST validate the document body against the shared report-document contract, rejecting a request that carries any property outside it. The response MUST be a PDF attachment whose download name ends in `.pdf`.

#### Scenario: Admin renders an on-screen report as PDF
- **GIVEN** an authenticated admin has a filtered, grouped report on screen
- **WHEN** the admin requests `POST /reports/time/export/pdf` with that report as the document body
- **THEN** the backend responds with PDF content and an `application/pdf` content type
- **AND** the response is an attachment whose filename ends in `.pdf`
- **AND** the PDF reflects the supplied document, including its grouping, per-level subtotals, and total rows

#### Scenario: PDF styling never re-queries report data
- **GIVEN** an authenticated admin or PM submits a report document to `POST /reports/time/export/pdf`
- **WHEN** the backend renders the PDF
- **THEN** the backend styles only the supplied document and reads no time entries from the database
- **AND** the PDF content matches the submitted document rather than a freshly queried report

#### Scenario: Member cannot render a report PDF
- **GIVEN** an authenticated member belongs to a workspace
- **WHEN** the member requests `POST /reports/time/export/pdf`
- **THEN** the backend responds with 403 Forbidden

#### Scenario: PDF export request rejects an off-contract document
- **GIVEN** an authenticated admin or PM requests `POST /reports/time/export/pdf`
- **WHEN** the document body carries a property the report-document contract does not define, or omits a required one
- **THEN** the backend rejects the request as a validation error
- **AND** no PDF is produced
