## ADDED Requirements

### Requirement: Shared Project Contract
The shared contracts SHALL define stable project request and response shapes for backend validation and future frontend clients.

#### Scenario: Project response uses shared schema
- **GIVEN** the backend returns project data
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload matches the shared project response contract
- **AND** the payload includes core provider-neutral project fields
- **AND** the payload excludes provider-specific external reference fields

#### Scenario: Project create request uses shared schema
- **GIVEN** a client constructs a project create request
- **WHEN** the request payload is validated against the shared project create schema
- **THEN** the payload accepts valid mutable project fields
- **AND** the payload rejects unknown additional fields

#### Scenario: Project update request uses shared schema
- **GIVEN** a client constructs a project update request
- **WHEN** the request payload is validated against the shared project update schema
- **THEN** the payload requires at least one mutable project field
- **AND** the payload rejects unknown additional fields

### Requirement: Shared Project Assignment Contract
The shared contracts SHALL define stable project assignment request and response shapes for backend validation and future frontend clients.

#### Scenario: Project assignment response uses shared schema
- **GIVEN** the backend returns project assignment data
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload matches the shared project assignment response contract
- **AND** the payload identifies the project, assigned user, assigned role, and assignment metadata

#### Scenario: Project assignment create request uses shared schema
- **GIVEN** a client constructs a project assignment request
- **WHEN** the request payload is validated against the shared assignment create schema
- **THEN** the payload requires a target user identifier
- **AND** the payload rejects unknown additional fields

### Requirement: Shared Task Contract
The shared contracts SHALL define stable task request and response shapes for backend validation and future frontend clients.

#### Scenario: Task response uses shared schema
- **GIVEN** the backend returns task data
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload matches the shared task response contract
- **AND** the payload includes core provider-neutral task fields
- **AND** the payload excludes provider-specific external reference fields

#### Scenario: Task create request uses shared schema
- **GIVEN** a client constructs a task create request
- **WHEN** the request payload is validated against the shared task create schema
- **THEN** the payload requires a valid task title
- **AND** the payload rejects unknown additional fields

#### Scenario: Task update request uses shared schema
- **GIVEN** a client constructs a task update request
- **WHEN** the request payload is validated against the shared task update schema
- **THEN** the payload requires at least one mutable task field
- **AND** the payload rejects unknown additional fields
