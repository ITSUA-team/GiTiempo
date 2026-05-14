## ADDED Requirements

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

The backend MUST support report grouping by `project`, `task`, or `user`, with `project` as the default grouping.

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

### Requirement: Time Reports Support Shared Filters Search Sorting And Pagination

The backend MUST allow time reports to be filtered by project, user, date window, and case-insensitive search, and MUST return paginated JSON rows with metadata.

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

#### Scenario: Report rows are paginated
- **GIVEN** the filtered aggregate result has more rows than the requested limit
- **WHEN** an admin or PM supplies `page` and `limit`
- **THEN** the response includes only the requested row page
- **AND** the response metadata reports the total aggregate row count and total pages for the filtered result set

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

### Requirement: Time Reports Can Be Exported As CSV

The backend MUST expose a protected CSV export endpoint for the same report data available through the JSON time-report endpoint.

#### Scenario: Admin exports time report CSV
- **GIVEN** an authenticated admin requests `GET /reports/time/export`
- **WHEN** matching completed entries exist
- **THEN** the backend responds with CSV content
- **AND** the export uses the same filters, grouping, sorting, and scope rules as `GET /reports/time`

#### Scenario: PM exports scoped time report CSV
- **GIVEN** an authenticated PM requests `GET /reports/time/export`
- **WHEN** matching completed entries exist inside and outside the PM report scope
- **THEN** the CSV includes only aggregate rows within the PM report scope

#### Scenario: Member cannot export reports
- **GIVEN** an authenticated member belongs to a workspace
- **WHEN** the member requests `GET /reports/time/export`
- **THEN** the backend responds with 403 Forbidden

#### Scenario: CSV export includes aggregate columns
- **GIVEN** an authenticated admin or PM exports a time report
- **WHEN** the backend generates the CSV
- **THEN** each exported row includes group context, total seconds, billable seconds, non-billable seconds, entry count, first started at, and last started at
