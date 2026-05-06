# ADR 007: Ephemeral PostgreSQL for API Integration and E2E Tests

**Status:** Approved  
**Date:** 2026-05-01

## Context

API integration/e2e tests exercise the real NestJS application and a real PostgreSQL database. Current e2e specs depend on migrations, seed data, and mutable database state. Reusing a developer's local database or any persistent shared database would make tests flaky and dangerous.

## Decision

Run API integration/e2e tests against an isolated ephemeral PostgreSQL database for each automated run.

The test workflow must:

- create a temporary PostgreSQL 16 database service
- set `NODE_ENV=test`
- inject `DATABASE_URL` for that isolated database
- run Drizzle migrations
- load deterministic seed data required by the e2e specs
- run the e2e suite
- destroy the database state after the run

The implemented local and CI entrypoint is `pnpm api:e2e:docker`, backed by Docker Compose with a PostgreSQL service and a test runner service. GitHub Actions service containers remain acceptable for future workflows if they preserve the same isolation guarantees.

API image smoke testing reuses the same isolation pattern through `pnpm api:smoke:docker`.

## Alternatives Considered

### Developer Local Database

Using `apps/api/.env` and a manually prepared local database is convenient for early development, but it is not acceptable for automation. Tests can mutate data, depend on order, and accidentally target the wrong database.

### Shared CI Database

A shared CI database avoids container startup time, but it creates cross-run contamination and requires cleanup logic that is easy to get wrong.

### Mocked Database

Mocked persistence is useful for unit tests, but it does not validate migrations, Drizzle queries, transaction behavior, PostgreSQL constraints, or readiness behavior.

### Testcontainers

Testcontainers is a valid future option, but Docker Compose is the simpler first step because the project already needs Compose for API deployment and container smoke tests.

## Consequences

- API e2e tests are reproducible in CI and locally once the Compose runner exists.
- Automated test runs cannot corrupt local, staging, or production data.
- E2E startup is slower because migrations and seed run each time.
- Current e2e specs remain sequential until a stronger per-spec isolation model is introduced.
- Deployment workflows can reuse the same isolation pattern for pre-deploy container smoke tests.
