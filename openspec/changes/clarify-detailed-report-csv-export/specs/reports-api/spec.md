## MODIFIED Requirements

### Requirement: Time Reports Can Be Exported As CSV

The backend MUST expose a protected CSV export endpoint for detailed report data using the same filters, sorting parameters, and authorization scope rules as the JSON time-report endpoint. CSV export rows MUST remain detailed at the project-task-user aggregate level for every requested `groupBy` value; the selected `groupBy` MUST be preserved as export metadata and MUST NOT collapse CSV row granularity to match the JSON grouped rows.

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
- **WHEN** an authenticated admin or PM exports a CSV report with `groupBy=project`
- **THEN** the CSV emits separate rows for each matching project-task-user combination
- **AND** each row records the selected `groupBy` value in the CSV group-by column

#### Scenario: Member cannot export reports
- **GIVEN** an authenticated member belongs to a workspace
- **WHEN** the member requests `GET /reports/time/export`
- **THEN** the backend responds with 403 Forbidden

#### Scenario: CSV export includes aggregate columns
- **GIVEN** an authenticated admin or PM exports a time report
- **WHEN** the backend generates the CSV
- **THEN** each exported row includes group-by metadata, project context, task context, user context, total seconds, billable seconds, non-billable seconds, entry count, first started at, and last started at
