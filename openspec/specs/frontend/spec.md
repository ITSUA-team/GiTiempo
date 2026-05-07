# Frontend Tooling Specification

## Purpose

Define frontend tooling requirements that preserve supported TypeScript configuration and verify frontend builds after configuration migrations.

## Requirements

### Requirement: Frontend Tooling Must Avoid Deprecated TypeScript Config

Frontend implementation work MUST avoid deprecated TypeScript compiler configuration when a supported replacement exists. The workspace MUST NOT depend on deprecated `baseUrl` usage as the steady-state solution for frontend module resolution.

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

### Requirement: Frontend Staging API Origin

Frontend staging builds SHALL use the dedicated API staging hostname for backend requests from GitHub Environment values.

#### Scenario: User web staging build receives API hostname

- **WHEN** the user-web staging deploy workflow builds the app
- **THEN** the build receives `VITE_API_BASE_URL` from the staging GitHub Environment with value `https://gitiempo-api.itsua.dev`
- **AND** the build continues to receive `VITE_ADMIN_APP_URL` from the staging GitHub Environment with value `https://gitiempo-admin.itsua.dev`

#### Scenario: Admin web staging build receives API hostname

- **WHEN** the admin-web staging deploy workflow builds the app
- **THEN** the build receives `VITE_API_BASE_URL` from the staging GitHub Environment with value `https://gitiempo-api.itsua.dev`
- **AND** the build continues to receive `VITE_USER_APP_URL` from the staging GitHub Environment with value `https://gitiempo.itsua.dev`

#### Scenario: Staging deploy guide documents API hostname

- **WHEN** an operator reads the frontend staging deploy guide
- **THEN** the guide documents `https://gitiempo-api.itsua.dev` as the staging frontend `VITE_API_BASE_URL`

#### Scenario: README documents staging API hostname

- **WHEN** a contributor reads the root `README.md` deployment section
- **THEN** it documents `https://gitiempo-api.itsua.dev` as the staging API base URL for frontend builds
