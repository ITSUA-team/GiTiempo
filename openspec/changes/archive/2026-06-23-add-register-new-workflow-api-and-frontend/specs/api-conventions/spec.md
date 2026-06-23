## MODIFIED Requirements

### Requirement: Standard Error Response Shape

The API MUST return a standard error body with status code, error label, and message, and MAY include machine-readable error metadata when the contract defines it.

#### Scenario: Unauthorized request error

- GIVEN a protected request fails authentication
- WHEN the backend returns the error response
- THEN the response body includes `statusCode`, `error`, and `message`

#### Scenario: Contract-defined mapped error includes machine-readable code

- GIVEN an endpoint defines stable frontend-visible or client-visible error identifiers
- WHEN the backend returns one of those mapped failures
- THEN the standard error body includes `code` with the stable identifier
- AND `error` remains the transport-level or HTTP-category label
