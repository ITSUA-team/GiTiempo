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

List and report endpoints SHOULD use a consistent shared query vocabulary for pagination and filtering.

#### Scenario: Paginated list request

- GIVEN a client requests a paginated list endpoint
- WHEN pagination is supplied
- THEN the request uses the shared `page` and `limit` parameters

#### Scenario: Time-oriented filtered request

- GIVEN a client filters time entries or reports
- WHEN date filtering is supplied
- THEN the request uses the shared `dateFrom` and `dateTo` parameter names
