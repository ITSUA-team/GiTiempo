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
