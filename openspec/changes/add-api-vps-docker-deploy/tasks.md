## 1. API Container Image

- [ ] 1.1 Add a root `.dockerignore` that keeps Docker build context small and excludes local env files, build outputs, caches, coverage, and dependencies.
- [ ] 1.2 Add `apps/api/Dockerfile` using the monorepo root as build context and producing a runtime image for `@gitiempo/api`.
- [ ] 1.3 Ensure the Docker image includes API build output, required workspace package build output, and committed Drizzle migration files.
- [ ] 1.4 Ensure the runtime image starts the API with `node dist/main.js` from the API workdir and does not require host source files or host `.env` files.

## 2. Runtime Migrations

- [ ] 2.1 Add a compiled runtime migration entrypoint under `apps/api/src/db` that reads `DATABASE_URL` and applies committed migrations with runtime dependencies.
- [ ] 2.2 Add API package scripts for running the compiled migration entrypoint after build.
- [ ] 2.3 Keep existing Drizzle Kit development scripts available for generating/checking migrations.

## 3. Docker-Backed API E2E

- [ ] 3.1 Add an API e2e Compose file with ephemeral PostgreSQL and a test runner service.
- [ ] 3.2 Add a script that runs the Docker-backed e2e flow, propagates the test exit code, and tears down volumes with `docker compose down -v`.
- [ ] 3.3 Update API/root package scripts so the Docker e2e command is easy to run locally and in CI.
- [ ] 3.4 Adjust API e2e/seed scripts so the Docker e2e flow uses Compose-provided env and does not require `apps/api/.env`.
- [ ] 3.5 Preserve the existing API e2e test suite and sequential execution model without adding new business scenarios.

## 4. API Image Smoke Test

- [ ] 4.1 Add an API image smoke Compose file that starts ephemeral PostgreSQL and the built API image.
- [ ] 4.2 Add a smoke command/script that applies migrations, starts the API image, checks `GET /commons/health/ready`, returns a non-zero exit on failure, and cleans up containers/volumes.
- [ ] 4.3 Ensure smoke testing uses only ephemeral infrastructure and does not run destructive business e2e specs.

## 5. VPS Runtime Compose

- [ ] 5.1 Add `deploy/api/compose.yml` with `postgres`, `migrate`, and `api` services.
- [ ] 5.2 Keep PostgreSQL on an internal Docker network without publishing the database port.
- [ ] 5.3 Publish the API through configurable `API_HOST_BIND` and `API_HOST_PORT`, defaulting to localhost-only access.
- [ ] 5.4 Keep nginx, Caddy, Traefik, and TLS automation out of the portable Compose stack.
- [ ] 5.5 Add safe deploy/runtime env examples with placeholders only, including staging defaults for `NODE_ENV=development` and `PUBLIC_API_URL=https://gitiempo-api.itsua.dev`.
- [ ] 5.6 Add an optional staging nginx example that proxies `gitiempo-api.itsua.dev` to the configured localhost API port.

## 6. GitHub Actions CI

- [ ] 6.1 Add an API checks workflow for API/shared/package/Docker/Compose/workflow path changes.
- [ ] 6.2 Configure the checks workflow to run install, lint, typecheck, unit tests, and Docker-backed API e2e tests.
- [ ] 6.3 Ensure failed checks do not publish or deploy an API image.

## 7. GitHub Actions Deploy

- [ ] 7.1 Add an API deploy workflow with `workflow_dispatch` inputs for environment, ref, image tag, and migration toggle.
- [ ] 7.2 Add automatic staging deploy triggers from the `staging` branch with API deployment-relevant path filters.
- [ ] 7.3 Configure the deploy workflow to build, smoke-test, and push API images to GHCR when no prebuilt image tag is supplied.
- [ ] 7.4 Configure the deploy workflow to read VPS SSH settings, remote deploy path, and public API URL from the selected GitHub Environment.
- [ ] 7.5 Configure the deploy workflow to sync Compose files to the VPS, pull the selected image, run migrations when enabled, recreate the API service, and check public readiness.
- [ ] 7.6 Ensure the staging deploy path is environment-driven and can be set to `/root/gitiempo` without hard-coding it as a global project constant.

## 8. Frontend And Documentation Alignment

- [ ] 8.1 Update frontend staging workflow/docs/OpenSpec artifacts so `VITE_API_BASE_URL` is `https://gitiempo-api.itsua.dev`.
- [ ] 8.2 Document required GitHub Environment values for API deploys, including GHCR, VPS SSH, deploy path, and public API URL settings.
- [ ] 8.3 Document required VPS runtime env values and keep real `.env` files ignored.
- [ ] 8.4 Update deployment/testing docs with the Docker e2e and API deploy commands added by this change.

## 9. Verification

- [ ] 9.1 Run API lint, typecheck, and unit tests.
- [ ] 9.2 Run Docker-backed API e2e tests locally.
- [ ] 9.3 Build the API Docker image locally.
- [ ] 9.4 Run the API image smoke test locally.
- [ ] 9.5 Validate the OpenSpec change with `openspec validate add-api-vps-docker-deploy --strict`.
- [ ] 9.6 Do not run a live VPS deploy during implementation verification; first live deploy remains an operator action after GitHub Environment and VPS nginx setup are ready.
