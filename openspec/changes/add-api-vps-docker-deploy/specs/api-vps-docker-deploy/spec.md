## ADDED Requirements

### Requirement: API Docker Image
The system SHALL build `@gitiempo/api` as a Docker image from the monorepo with all runtime artifacts required to start the compiled NestJS API.

#### Scenario: API image starts with runtime artifacts
- **WHEN** the API Docker image is built from a valid repository checkout
- **THEN** the image contains the compiled API application, required workspace runtime package artifacts, and committed database migrations
- **AND** the default container command starts the API HTTP server on the configured `PORT`

#### Scenario: API image runs without development tooling
- **WHEN** the API Docker image starts in its default runtime mode
- **THEN** it does not require repository source files, local `node_modules`, `drizzle-kit`, or a developer `.env` file from the host

### Requirement: VPS Runtime Compose Stack
The system SHALL provide a Docker Compose runtime stack for the VPS with separate `api`, `postgres`, and one-shot `migrate` services.

#### Scenario: PostgreSQL stays private
- **WHEN** the VPS runtime Compose stack starts
- **THEN** PostgreSQL runs on a Docker network reachable by API runtime services
- **AND** PostgreSQL does not publish its database port to the public internet

#### Scenario: API exposes only the configured host bind
- **WHEN** the VPS runtime Compose stack starts the API service
- **THEN** the API service publishes container port `3000` through the configured host bind and host port
- **AND** the default host bind is localhost-only

#### Scenario: Runtime compose excludes ingress services
- **WHEN** the VPS runtime Compose stack is inspected
- **THEN** it does not define nginx, Caddy, Traefik, or another TLS reverse proxy service
- **AND** external ingress can proxy to the configured API host bind without changing the API image

### Requirement: Explicit Migration Service
The system SHALL run database migrations as an explicit one-shot release step separate from API startup.

#### Scenario: Migrations run before API rollout
- **WHEN** the deploy workflow runs with migrations enabled
- **THEN** it runs the Compose migration service before recreating the API service
- **AND** the API service rollout proceeds only after the migration step succeeds

#### Scenario: Emergency deploy can skip migrations
- **WHEN** an operator manually runs the API deploy workflow with migrations disabled
- **THEN** the workflow skips the migration service
- **AND** the workflow still deploys the selected API image and performs the public readiness check

### Requirement: Docker-Backed API E2E Tests
The system SHALL run API e2e tests against an isolated Docker-backed PostgreSQL database for automated checks.

#### Scenario: E2E uses ephemeral PostgreSQL
- **WHEN** the Docker-backed API e2e command runs
- **THEN** it creates an isolated PostgreSQL database service for that run
- **AND** it sets `NODE_ENV=test` and `DATABASE_URL` for the isolated database
- **AND** it applies migrations, loads deterministic seed data, runs the existing API e2e specs, and destroys the database state after the run

#### Scenario: E2E does not use host database configuration
- **WHEN** the Docker-backed API e2e command runs in CI or locally
- **THEN** it does not depend on `apps/api/.env`
- **AND** it does not connect to a developer local database, staging database, production database, or shared persistent CI database

### Requirement: API Image Smoke Test
The system SHALL smoke-test the built API image against ephemeral PostgreSQL before the image is pushed or deployed.

#### Scenario: Smoke test verifies readiness
- **WHEN** the API image smoke test runs for a built image
- **THEN** it starts ephemeral PostgreSQL, applies migrations, starts the API container, and checks `GET /commons/health/ready`
- **AND** it fails if the image cannot boot, cannot connect to the database, or does not report readiness

#### Scenario: Smoke test avoids business mutations
- **WHEN** the API image smoke test runs
- **THEN** it does not run destructive business e2e specs against staging or production databases
- **AND** it limits verification to container boot, database connectivity, migrations, and readiness

### Requirement: API GitHub Actions Checks
The system SHALL provide GitHub Actions checks for API-relevant changes before deployment.

#### Scenario: API checks run for relevant changes
- **WHEN** a pull request or staging branch push changes API, shared contract, package, Docker, Compose, or API workflow files
- **THEN** the API checks workflow runs lint, typecheck, unit tests, and Docker-backed API e2e tests

#### Scenario: API checks block failed isolated e2e
- **WHEN** Docker-backed API e2e tests fail in the API checks workflow
- **THEN** the workflow fails
- **AND** no deploy job in that workflow publishes or rolls out an API image

### Requirement: API GitHub Actions Deploy
The system SHALL provide a GitHub Actions deployment workflow that builds, verifies, publishes, and deploys API images to a VPS through Docker Compose.

#### Scenario: Manual deploy accepts environment settings
- **WHEN** an operator manually runs the API deploy workflow
- **THEN** the workflow accepts an environment selection, optional source ref, optional image tag, and migration toggle
- **AND** it reads VPS SSH settings, public API URL, and remote deploy path from the selected GitHub Environment

#### Scenario: Staging deploy publishes and rolls out GHCR image
- **WHEN** the API staging deploy workflow runs without a prebuilt image tag
- **THEN** it builds and smoke-tests an API image
- **AND** it pushes the image to GHCR
- **AND** it connects to the configured VPS over SSH, updates the configured deploy directory, pulls the selected image, runs migrations when enabled, recreates the API service, and verifies public readiness through `GET /commons/health/ready`

#### Scenario: Automatic staging deploy uses path filters
- **WHEN** a push to the `staging` branch changes API deployment-relevant files
- **THEN** the API deploy workflow runs for the staging environment
- **AND** unrelated frontend-only changes are not required to redeploy the API

### Requirement: Staging API Runtime Configuration
The system SHALL document and support staging API runtime configuration without committing real secrets.

#### Scenario: Staging deploy path is environment-driven
- **WHEN** the staging deploy workflow runs
- **THEN** it uses the deploy path configured in the staging GitHub Environment
- **AND** the repository does not hard-code `/root/gitiempo` as a universal deploy path for every environment

#### Scenario: Staging runtime uses development mode
- **WHEN** the staging API service starts with the documented staging runtime env
- **THEN** it runs with `NODE_ENV=development`
- **AND** it uses the configured database, CORS origins, app URLs, JWT secrets, Firebase values, and integration secrets from the VPS runtime environment

#### Scenario: Runtime secrets remain outside git
- **WHEN** runtime environment examples are added to the repository
- **THEN** they contain safe placeholders only
- **AND** real VPS `.env` files remain ignored and uncommitted
