## ADDED Requirements

### Requirement: Shared Time Report Request Contract

The shared contracts SHALL define validation rules for time-report query parameters used by backend DTOs and frontend clients.

#### Scenario: Time report query accepts shared filters
- **GIVEN** a client constructs a time-report query
- **WHEN** the query is validated
- **THEN** the query accepts shared pagination fields, `dateFrom`, `dateTo`, `projectId`, `userId`, `groupBy`, `search`, `sortBy`, and `sortOrder`
- **AND** rejects invalid filter values

#### Scenario: Time report query supports report group values
- **GIVEN** a client constructs a time-report query with `groupBy`
- **WHEN** the query is validated
- **THEN** only `project`, `task`, and `user` are valid report group values

#### Scenario: Time report query supports export reuse
- **GIVEN** a client constructs a time-report export query
- **WHEN** the query is validated
- **THEN** the export query uses the same filter, grouping, search, and sorting contract as the JSON report query

### Requirement: Shared Time Report Response Contract

The shared contracts SHALL define stable response shapes for JSON time reports so backend responses and frontend consumers agree on summary, row, and pagination fields.

#### Scenario: Time report response uses shared schema
- **GIVEN** the backend returns a JSON time report
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload matches the shared time-report response contract
- **AND** includes the effective date window, group mode, summary totals, aggregate rows, and pagination metadata

#### Scenario: Time report summary uses shared schema
- **GIVEN** the backend returns a JSON time report
- **WHEN** the report contains matching completed entries
- **THEN** the summary includes `totalSeconds`, `billableSeconds`, `nonBillableSeconds`, `entryCount`, and `billableShare`
- **AND** `billableShare` is either `null` or a number from 0 through 1

#### Scenario: Project report row uses shared schema
- **GIVEN** the backend returns a project-grouped time report
- **WHEN** frontend or backend code consumes a row
- **THEN** the row identifies its group as `project`
- **AND** includes project context and aggregate timing fields

#### Scenario: Task report row uses shared schema
- **GIVEN** the backend returns a task-grouped time report
- **WHEN** frontend or backend code consumes a row
- **THEN** the row identifies its group as `task`
- **AND** includes task context, parent project context, and aggregate timing fields

#### Scenario: User report row uses shared schema
- **GIVEN** the backend returns a user-grouped time report
- **WHEN** frontend or backend code consumes a row
- **THEN** the row identifies its group as `user`
- **AND** includes user context and aggregate timing fields
