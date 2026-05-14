## MODIFIED Requirements

### Requirement: Shared Workspace Contract
The shared contracts SHALL define stable workspace and workspace-settings shapes for backend and frontend consumers.

#### Scenario: Workspace response uses shared schema
- **GIVEN** the backend returns current workspace or workspace settings data
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload matches the shared workspace contract for that endpoint

#### Scenario: Workspace settings response includes time zone
- **GIVEN** the backend returns workspace settings data
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload includes `timeZone` as a valid IANA time-zone identifier
- **AND** the payload includes the existing `currency` and `defaultHourlyRate` fields

#### Scenario: Workspace settings update validates time zone
- **GIVEN** a client constructs a workspace settings update payload
- **WHEN** the payload includes `timeZone`
- **THEN** the shared schema accepts valid IANA time-zone identifiers
- **AND** the shared schema rejects invalid time-zone identifiers
