## 1. API Container Image

- [x] 1.1 Add a root `.dockerignore` that keeps Docker build context small and excludes local env files, build outputs, caches, coverage, and dependencies.
- [x] 1.2 Add `apps/api/Dockerfile` using the monorepo root as build context and producing a runtime image for `@gitiempo/api`.
- [x] 1.3 Ensure the Docker image includes API build output, required workspace package build output, and committed Drizzle migration files.
- [x] 1.4 Ensure the runtime image starts the API with `node dist/src/main.js` from the API workdir and does not require host source files or host `.env` files.

## 2. Runtime Migrations

- [x] 2.1 Add a compiled runtime migration entrypoint under `apps/api/src/db` that reads `DATABASE_URL` and applies committed migrations with runtime dependencies.
- [x] 2.2 Add API package scripts for running the compiled migration entrypoint after build.
- [x] 2.3 Keep existing Drizzle Kit development scripts available for generating/checking migrations.

## 3. Docker-Backed API E2E

- [x] 3.1 Add an API e2e Compose file with ephemeral PostgreSQL and a test runner service.
- [x] 3.2 Add a script that runs the Docker-backed e2e flow, propagates the test exit code, and tears down volumes with `docker compose down -v`.
- [x] 3.3 Update API/root package scripts so the Docker e2e command is easy to run locally and in CI.
- [x] 3.4 Adjust API e2e/seed scripts so the Docker e2e flow uses Compose-provided env and does not require `apps/api/.env`.
- [x] 3.5 Preserve the existing API e2e test suite and sequential execution model without adding new business scenarios.

## 4. API Image Smoke Test

- [x] 4.1 Add an API image smoke Compose file that starts ephemeral PostgreSQL and the built API image.
- [x] 4.2 Add a smoke command/script that applies migrations, starts the API image, checks `GET /commons/health/ready`, returns a non-zero exit on failure, and cleans up containers/volumes.
- [x] 4.3 Ensure smoke testing uses only ephemeral infrastructure and does not run destructive business e2e specs.

## 5. VPS Runtime Compose

- [x] 5.1 Add `deploy/api/compose.yml` with `postgres`, `migrate`, and `api` services.
- [x] 5.2 Keep PostgreSQL on an internal Docker network without publishing the database port.
- [x] 5.3 Publish the API through configurable `API_HOST_BIND` and `API_HOST_PORT`, defaulting to localhost-only access.
- [x] 5.4 Keep nginx, Caddy, Traefik, and TLS automation out of the portable Compose stack.
- [x] 5.5 Add safe deploy/runtime env examples with placeholders only, including staging runtime defaults for `NODE_ENV=development`, `APP_URL=https://gitiempo-api.itsua.dev`, and GitHub Environment `PUBLIC_API_URL=https://gitiempo-api.itsua.dev`.
- [x] 5.6 Add an optional staging nginx example that terminates HTTPS for `gitiempo-api.itsua.dev` and proxies to the configured localhost API port.

## 6. GitHub Actions CI

- [x] 6.1 Add an API checks workflow for API/shared/package/Docker/Compose/workflow path changes.
- [x] 6.2 Configure the checks workflow to run install, lint, typecheck, unit tests, and Docker-backed API e2e tests.
- [x] 6.3 Ensure failed checks do not publish or deploy an API image.

## 7. GitHub Actions Deploy

- [x] 7.1 Add an API deploy workflow with `workflow_dispatch` inputs for environment, ref, image tag, migration toggle, and default-off seed toggle.
- [x] 7.2 Add automatic staging deploy triggers from the `staging` branch with API deployment-relevant path filters.
- [x] 7.3 Configure the deploy workflow to build, smoke-test, and push API images to GHCR when no prebuilt image tag is supplied.
- [x] 7.4 Configure the deploy workflow to read VPS SSH settings, remote deploy path, and public API URL from the selected GitHub Environment.
- [x] 7.5 Configure the deploy workflow to sync Compose files to the VPS, pull the selected image, run migrations when enabled, recreate the API service, and check public readiness.
- [x] 7.6 Ensure the staging deploy path is environment-driven and can be set to `/root/gitiempo` without hard-coding it as a global project constant.

## 8. Frontend And Documentation Alignment

- [x] 8.1 Update frontend staging workflow/docs/OpenSpec artifacts so `VITE_API_BASE_URL` is `https://gitiempo-api.itsua.dev`.
- [x] 8.2 Document required GitHub Environment values for API deploys, including GHCR, VPS SSH, deploy path, and public API URL settings.
- [x] 8.3 Document required VPS runtime env values and keep real `.env` files ignored.
- [x] 8.4 Update deployment/testing docs with the Docker e2e and API deploy commands added by this change.
- [x] 8.5 Align `docs/deployment.md` with the final API Docker/Compose/GitHub Actions implementation, including external ingress, GHCR image flow, required GitHub Environment values, VPS runtime env files, deploy commands, migration flow, rollback notes, and readiness checks.
- [x] 8.6 Align `docs/testing.md` with the final Docker-backed API e2e and API image smoke commands.
- [x] 8.7 Add a short root `README.md` deployment instruction for staging API deploys and link to `docs/deployment.md`.
- [x] 8.8 Review ADR 006 and ADR 007 for stale future-tense or reverse-proxy wording introduced by the implementation.

## 9. Verification

- [x] 9.1 Run API lint, typecheck, and unit tests.
- [x] 9.2 Run Docker-backed API e2e tests locally.
- [x] 9.3 Build the API Docker image locally.
- [x] 9.4 Run the API image smoke test locally.
- [x] 9.5 Validate the OpenSpec change with `openspec validate add-api-vps-docker-deploy --strict`.
- [x] 9.6 Do not run a live VPS deploy during implementation verification; first live deploy remains an operator action after GitHub Environment and VPS nginx setup are ready.

## 10. Review Hardening

- [x] 10.1 Restrict manual prebuilt `image_tag` deploys to this repository's GHCR API image tags or digests.
- [x] 10.2 Smoke-test every selected API image, including prebuilt rollback tags, before SSH rollout.
- [x] 10.3 Scope `VPS_SSH_KEY` only to SSH validation/configuration steps.
- [x] 10.4 Add temporary VPS GHCR login for private image pulls without storing registry credentials in the VPS default Docker config.
- [x] 10.5 Move the staging GitHub Environment example to `deploy/` and merge frontend/API values.
- [x] 10.6 Read frontend staging URL values from GitHub Environment variables instead of workflow constants.
- [x] 10.7 Expand the optional staging nginx example and docs with a TLS reverse-proxy baseline and production-readiness caveats.
