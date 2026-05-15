## MODIFIED Requirements

### Requirement: Single-Tenant Workspace Ownership
The system SHALL operate as a single-tenant MVP with one seeded default workspace that owns operational records.

#### Scenario: Seeded workspace foundation exists for initial deployment
- GIVEN the application is initialized for the first time
- WHEN seed data is applied
- THEN a default workspace is created
- AND a default workspace settings record is created for that workspace
- AND the default workspace settings record includes a non-null time-zone value of `UTC`
- AND an initial admin membership exists in that workspace
- AND operational records attach to that workspace context

## ADDED Requirements

### Requirement: Workspace Settings Persist Calendar Time Zone
The backend data model MUST persist a non-null workspace time-zone setting as an IANA time-zone identifier.

#### Scenario: Workspace settings row stores time zone
- **WHEN** a workspace settings row is stored
- **THEN** the row includes a non-null time-zone value
- **AND** the default value is `UTC`

#### Scenario: Existing workspace settings rows are backfilled
- **WHEN** the time-zone migration is applied to existing workspace settings rows
- **THEN** rows without an explicit time-zone value receive `UTC`
