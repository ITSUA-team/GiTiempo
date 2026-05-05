## ADDED Requirements

### Requirement: Shared Project Summary Contract
The shared contracts SHALL define stable response shapes for project summary endpoints.

#### Scenario: Management project summary response uses shared schema
- **GIVEN** the backend returns management project summary data
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload matches the shared management project summary contract
- **AND** includes `activeProjects`, `privateProjects`, and `publicProjects`

#### Scenario: User project summary response uses shared schema
- **GIVEN** the backend returns user project summary data
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload matches the shared user project summary contract
- **AND** includes `visibleProjects`, `trackedHoursWeek`, and `trackedHoursMonth`

## MODIFIED Requirements

### Requirement: Shared Project Contract

The shared contracts SHALL define stable project request and response shapes for backend validation and future frontend clients.

#### Scenario: Project response uses shared schema

- **GIVEN** the backend returns project data
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload matches the shared project response contract
- **AND** the payload includes core provider-neutral project fields
- **AND** the payload includes `visibility`, derived `source`, and `totalHours`
- **AND** the payload excludes provider-specific external reference fields

#### Scenario: Project create request uses shared schema

- **GIVEN** a client constructs a project create request
- **WHEN** the request payload is validated against the shared project create schema
- **THEN** the payload accepts valid creation fields including optional project visibility
- **AND** the payload rejects unknown additional fields

#### Scenario: Project update request uses shared schema

- **GIVEN** a client constructs a project update request
- **WHEN** the request payload is validated against the shared project update schema
- **THEN** the payload requires at least one mutable project field
- **AND** the payload accepts `isActive` as the only supplied field for archive or unarchive requests
- **AND** the payload rejects unknown additional fields
