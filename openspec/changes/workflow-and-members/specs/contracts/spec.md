## MODIFIED Requirements

### Requirement: Shared Public User Contract
The shared contracts MUST define a public user shape that both frontend applications and the backend can rely on.

#### Scenario: Current user response uses shared public schema
- **GIVEN** the backend returns current-user data
- **WHEN** frontend code consumes the response
- **THEN** the payload matches the shared public user contract
- **AND** the contract includes workspace role
- **AND** the contract excludes internal-only auth provider identifiers

## ADDED Requirements

### Requirement: Shared Workspace Contract
The shared contracts SHALL define stable workspace and workspace-settings shapes for backend and frontend consumers.

#### Scenario: Workspace response uses shared schema
- **GIVEN** the backend returns current workspace or workspace settings data
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload matches the shared workspace contract for that endpoint

### Requirement: Shared Workspace Member Contract
The shared contracts SHALL define stable shapes for listing workspace members and changing member roles.

#### Scenario: Workspace member admin flow uses shared schema
- **GIVEN** the backend accepts or returns workspace member administration data
- **WHEN** the payload is validated or consumed
- **THEN** it matches the shared workspace member contract

### Requirement: Shared Workspace Invite Contract
The shared contracts SHALL define stable shapes for invite creation, listing, cancellation, and acceptance.

#### Scenario: Invite flow uses shared schema
- **GIVEN** the backend accepts or returns workspace invite data
- **WHEN** the payload is validated or consumed
- **THEN** it matches the shared workspace invite contract
