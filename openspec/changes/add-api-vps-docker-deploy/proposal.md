## Why

The repository already documents API deployment to a VPS with Docker Compose and isolated Docker-backed API e2e tests, but the implementation infrastructure is missing. Adding it now makes staging deploys repeatable, prevents e2e runs from touching the developer or VPS host database, and gives the frontend staging apps a real API origin at `https://gitiempo-api.itsua.dev`.

## What Changes

- Add production-oriented Docker image support for `@gitiempo/api` in the monorepo.
- Add a Docker Compose runtime stack for the VPS with `api`, `postgres`, and explicit one-shot `migrate` services.
- Keep reverse proxy/TLS outside the portable Compose stack; provide only an optional staging nginx example for the current VPS.
- Add a Docker-backed API e2e runner that uses ephemeral PostgreSQL instead of `apps/api/.env` or any host database.
- Add a minimal API image smoke test that starts the built image against ephemeral PostgreSQL and checks `/commons/health/ready`.
- Add GitHub Actions workflows for API checks and staging deploys using GHCR, SSH to the VPS, environment-driven deploy paths, explicit migrations, and public readiness verification.
- Align frontend staging configuration and docs so `VITE_API_BASE_URL` points at `https://gitiempo-api.itsua.dev`.
- Document staging runtime environment values without committing real secrets.

## Capabilities

### New Capabilities
- `api-vps-docker-deploy`: API containerization, Docker Compose runtime, Docker-backed e2e/smoke checks, GHCR publishing, and GitHub Actions deployment to a VPS.

### Modified Capabilities
- `frontend`: Staging frontend configuration must use the dedicated API staging hostname `https://gitiempo-api.itsua.dev` for `VITE_API_BASE_URL`.

## Impact

- Affected areas: `apps/api`, `.github/workflows`, deployment files under `deploy/api`, root package scripts, root ignore rules, and deployment/testing documentation.
- Runtime systems: GHCR, GitHub Environments, staging VPS Docker/Compose, staging VPS external reverse proxy, and PostgreSQL 16.
- Test systems: API e2e moves to Docker-backed ephemeral PostgreSQL for automation; existing e2e specs remain the behavioral coverage and stay sequential.
- No API request/response contract changes are expected.
