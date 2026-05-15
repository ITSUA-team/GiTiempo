## MODIFIED Requirements

### Requirement: GET /workspace/settings returns current settings
The system SHALL return the workspace settings for the authenticated user's workspace.

#### Scenario: Admin retrieves settings
- **WHEN** an admin sends GET /workspace/settings with a valid JWT
- **THEN** the system responds with 200 and body containing `{ id, workspaceId, currency, defaultHourlyRate, timeZone, createdAt, updatedAt }`

#### Scenario: Settings reflect seed defaults
- **WHEN** an admin retrieves settings for the seed workspace
- **THEN** currency is "USD" and defaultHourlyRate is 100
- **AND** timeZone is "UTC"

### Requirement: PATCH /workspace/settings updates settings
The system SHALL allow admins to update currency, defaultHourlyRate, and/or timeZone.

#### Scenario: Update currency
- **WHEN** an admin sends PATCH /workspace/settings with `{ "currency": "EUR" }`
- **THEN** the system responds with 200 and the response body contains currency "EUR"
- **THEN** a subsequent GET /workspace/settings returns currency "EUR"

#### Scenario: Update defaultHourlyRate
- **WHEN** an admin sends PATCH /workspace/settings with `{ "defaultHourlyRate": 150 }`
- **THEN** the system responds with 200 and the response body contains defaultHourlyRate 150

#### Scenario: Set defaultHourlyRate to null
- **WHEN** an admin sends PATCH /workspace/settings with `{ "defaultHourlyRate": null }`
- **THEN** the system responds with 200 and the response body contains defaultHourlyRate null

#### Scenario: Update timeZone
- **WHEN** an admin sends PATCH /workspace/settings with `{ "timeZone": "Europe/Kyiv" }`
- **THEN** the system responds with 200 and the response body contains timeZone "Europe/Kyiv"
- **THEN** a subsequent GET /workspace/settings returns timeZone "Europe/Kyiv"

### Requirement: Workspace settings validation rejects invalid input
The system SHALL reject invalid update payloads with 400.

#### Scenario: Empty body on PATCH /workspace/settings
- **WHEN** an admin sends PATCH /workspace/settings with `{}`
- **THEN** the system responds with 400 BadRequest

#### Scenario: Invalid currency format on PATCH /workspace/settings
- **WHEN** an admin sends PATCH /workspace/settings with `{ "currency": "usd" }` (lowercase)
- **THEN** the system responds with 400 BadRequest

#### Scenario: Invalid timeZone on PATCH /workspace/settings
- **WHEN** an admin sends PATCH /workspace/settings with `{ "timeZone": "Not/AZone" }`
- **THEN** the system responds with 400 BadRequest
