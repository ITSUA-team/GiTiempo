## MODIFIED Requirements

### Requirement: Shared Pagination And Filter Vocabulary

List and report endpoints MUST use a consistent shared query vocabulary for pagination and filtering.

#### Scenario: Paginated list request

- GIVEN a client requests a paginated list endpoint
- WHEN pagination is supplied
- THEN the request uses the shared `page` and `limit` parameters

#### Scenario: Time-oriented filtered request

- GIVEN a client filters time entries or reports
- WHEN date filtering is supplied
- THEN the request uses the shared `dateFrom` and `dateTo` parameter names

#### Scenario: Time-entry list started-at filtering

- GIVEN a client filters own or project time-entry lists by date
- WHEN `dateFrom` or `dateTo` is supplied
- THEN `dateFrom` includes entries whose start time is equal to the boundary
- AND `dateTo` excludes entries whose start time is equal to the boundary

#### Scenario: Report date defaults use current calendar month

- GIVEN a client requests a report endpoint without one or both date filters
- WHEN the backend resolves the effective report date window
- THEN an omitted `dateFrom` defaults to the start of the current UTC calendar month
- AND an omitted `dateTo` defaults to the start of the next UTC calendar month

#### Scenario: Report started-at filtering is closed-open

- GIVEN a client filters reports by the effective date window
- WHEN the backend applies report date filtering
- THEN `dateFrom` includes entries whose start time is equal to the boundary
- AND `dateTo` excludes entries whose start time is equal to the boundary

#### Scenario: Report grouping uses shared groupBy parameter

- GIVEN a client requests an aggregate report endpoint
- WHEN grouping is supplied
- THEN the request uses the shared `groupBy` parameter
