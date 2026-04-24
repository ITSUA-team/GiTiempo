## ADDED Requirements

### Requirement: Frontend Tooling Must Avoid Deprecated TypeScript Config

Frontend implementation work under this change MUST avoid deprecated TypeScript compiler configuration when a supported replacement exists. The workspace MUST NOT depend on deprecated `baseUrl` usage as the steady-state solution for frontend module resolution.

#### Scenario: Frontend alias configuration is migrated

- **GIVEN** a frontend app currently uses a deprecated TypeScript compiler option for alias resolution
- **WHEN** the change is updated or frontend work continues under this change
- **THEN** the deprecated configuration is replaced with a supported configuration
- **AND** existing frontend imports continue to resolve correctly after the migration

#### Scenario: Deprecated config is not reintroduced

- **GIVEN** an agent is implementing frontend work for this change
- **WHEN** the agent updates frontend tsconfig or tooling files
- **THEN** the agent does not add new deprecated TypeScript compiler options
- **AND** the agent does not leave deprecation-suppression-only config behind when the deprecated usage can be removed in the same change

#### Scenario: Frontend verification after migration

- **GIVEN** the frontend tooling configuration has been migrated away from deprecated options
- **WHEN** the frontend typecheck commands run
- **THEN** the affected frontend apps still typecheck successfully
