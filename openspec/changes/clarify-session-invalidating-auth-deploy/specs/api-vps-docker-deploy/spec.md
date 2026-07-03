## MODIFIED Requirements

### Requirement: Explicit Migration Service

The system SHALL run database migrations as an explicit one-shot release step separate from API startup.

#### Scenario: Migrations run before API rollout

- **WHEN** the deploy workflow runs with migrations enabled
- **THEN** it runs the Compose migration service before recreating the API service
- **AND** the API service rollout proceeds only after the migration step succeeds

#### Scenario: Session-invalidating migration is treated as release behavior

- **GIVEN** a committed migration intentionally invalidates persisted app sessions because existing session rows cannot be upgraded safely
- **WHEN** that migration is included in a deploy
- **THEN** the release/deploy documentation explicitly calls out the forced logout behavior before rollout
- **AND** operators treat post-deploy re-authentication as expected behavior rather than as an incident regression

#### Scenario: Emergency deploy can skip migrations

- **WHEN** an operator manually runs the API deploy workflow with migrations disabled
- **THEN** the workflow skips the migration service
- **AND** the workflow still deploys the selected API image and performs the public readiness check
