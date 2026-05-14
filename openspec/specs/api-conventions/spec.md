# Shared API Conventions Specification

## Purpose

Define the cross-layer API contract conventions that GiTiempo clients and the backend should follow consistently.
## Requirements
### Requirement: JSON REST API Surface

The API SHALL expose JSON-based REST endpoints beneath the `/api` base path.

#### Scenario: Standard API request path

- GIVEN a client calls an application endpoint
- WHEN the endpoint is part of the public application API
- THEN the request path is rooted beneath `/api`
- AND the request and response use JSON payloads unless explicitly documented otherwise

### Requirement: Bearer Token Convention For Protected Endpoints

Protected endpoints MUST use the `Authorization: Bearer <token>` convention.

#### Scenario: Client calls protected endpoint

- GIVEN a client needs to call a protected API route
- WHEN the request is sent
- THEN the access token is supplied via the `Authorization` bearer-token header

### Requirement: Standard Error Response Shape

The API MUST return a standard error body with status code, error label, and message.

#### Scenario: Unauthorized request error

- GIVEN a protected request fails authentication
- WHEN the backend returns the error response
- THEN the response body includes `statusCode`, `error`, and `message`

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

### Requirement: Project Summary Windows Are Calendar Based

The API MUST calculate project tracked-hour summary windows from calendar boundaries.

#### Scenario: Weekly tracked-hour summary uses ISO calendar week

- **GIVEN** a client requests a project summary with weekly tracked hours
- **WHEN** the backend calculates the weekly window
- **THEN** the window starts at Monday 00:00:00 UTC of the current ISO week
- **AND** the window ends at the request time or the start of the next ISO week, whichever is earlier

#### Scenario: Monthly tracked-hour summary starts on first day

- **GIVEN** a client requests a project summary with monthly tracked hours
- **WHEN** the backend calculates the monthly window
- **THEN** the window starts at 00:00:00 UTC on the first day of the current calendar month
- **AND** the window ends at the request time or the start of the next calendar month, whichever is earlier

### Requirement: Scoped Project Summary Counts Are Distinct

The API MUST count scoped project summary values distinctly when a project matches more than one visibility path.

#### Scenario: PM summary counts public assigned project once

- **GIVEN** a `pm` is assigned to an active public project
- **WHEN** the backend calculates management project summary counts for that PM
- **THEN** the project contributes once to `activeProjects`
- **AND** the project contributes once to `publicProjects`

#### Scenario: Management visibility counts exclude inactive projects

- **GIVEN** a project is inactive
- **WHEN** the backend calculates management project summary counts
- **THEN** the project does not contribute to `activeProjects`, `privateProjects`, or `publicProjects`
