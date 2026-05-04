# ADR 006: API Deployment to VPS with Docker Compose

**Status:** Approved  
**Date:** 2026-05-01

## Context

The backend is a NestJS modular monolith backed by PostgreSQL. The MVP is single-tenant, so one API instance and one PostgreSQL database are sufficient. We need a deployment model that is simple, inspectable, portable, and compatible with GitHub Actions automation.

## Decision

Deploy `@gitiempo/api` to a VPS as a Docker image managed by Docker Compose.

GitHub Actions is responsible for release orchestration:

- run checks and API integration/e2e tests
- build the API Docker image
- run container smoke tests
- push the image to a registry
- connect to the VPS over SSH
- pull the selected image
- run migrations explicitly
- recreate the API service with Docker Compose
- verify public readiness through `GET /commons/health/ready`

The VPS Compose stack owns the production runtime services:

- `api`
- `postgres`
- an explicit one-shot migration step
- reverse proxy/TLS routing if not provided externally

PostgreSQL must run on an internal Docker network and must not expose its port to the public internet.

## Alternatives Considered

### Managed PaaS

Managed platforms reduce server maintenance, but they introduce vendor-specific runtime constraints and may complicate colocating the API with a simple PostgreSQL service for the single-tenant MVP.

### Bare Node.js with systemd

Running the compiled API directly with systemd is simple, but it makes dependency isolation, repeatable releases, rollback, and parity with CI smoke tests weaker than Docker images.

## Consequences

- Dockerfile and Compose files become production infrastructure source of truth.
- GitHub Actions must own deploy credentials, registry credentials, and VPS SSH access.
- Migrations are explicit release steps, not hidden application startup behavior.
- Production rollback can redeploy a previous image, but database rollback still requires an explicit migration plan.
- The same image can be smoke-tested before deployment and then run on the VPS.
