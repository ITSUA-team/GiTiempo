# Deployment

This document describes the deployment workflow for GI Tiempo. It is the source of truth for deployment intent; implementation files such as Dockerfiles, Compose files, Wrangler configs, and GitHub Actions workflows must stay aligned with it.

## Deployment Targets

| Component | Target | Deployment unit |
|---|---|---|
| `apps/user-web` | Cloudflare Workers Static Assets | Separate Worker/static asset deployment |
| `apps/admin-web` | Cloudflare Workers Static Assets | Separate Worker/static asset deployment |
| `apps/api` | VPS | Docker image started by Docker Compose |
| PostgreSQL | VPS | Docker Compose service with persistent volume |
| Chrome Extension | Chrome Web Store | Manual publish |

Frontend and backend deploy independently. A frontend-only change must not restart the API, and an API-only change must not redeploy either SPA.

## Frontend Deploys

`apps/user-web` and `apps/admin-web` deploy as separate Cloudflare Workers Static Assets projects.

Each frontend app owns its own Wrangler configuration and GitHub Actions workflow. The app build output is the Vite `dist/` directory, served with SPA fallback so unknown routes return `index.html`.

Production frontend builds use build-time `VITE_*` variables:

| App | Required deployment values |
|---|---|
| `user-web` | `VITE_API_BASE_URL`, Firebase client variables, `VITE_ADMIN_APP_URL` |
| `admin-web` | `VITE_API_BASE_URL`, Firebase client variables, `VITE_USER_APP_URL` |

Do not read production frontend config from repository `.env` files. GitHub Actions must inject environment-specific values from GitHub Environments or repository secrets/variables. The staging Environment example at `deploy/github-environment.staging.example.env` documents the shared frontend and API values.

### Frontend Manual Triggers

Frontend deploy workflows must support `workflow_dispatch` with:

| Input | Values | Purpose |
|---|---|---|
| `target` | `user-web`, `admin-web`, `both` | Choose which SPA to deploy |
| `environment` | `staging`, `production` | Choose secret set and Cloudflare target |
| `ref` | branch, tag, or SHA | Optional source revision |

Manual production deploys should require GitHub Environment approval once environments are configured.

### Frontend Automatic Triggers

Automatic frontend deploys run from the `staging` branch.

Recommended path filters:

| Workflow | Trigger paths |
|---|---|
| `deploy-user-web` | `apps/user-web/**`, `packages/shared/**`, `packages/web-config/**`, `packages/web-shared/**`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json` |
| `deploy-admin-web` | `apps/admin-web/**`, `packages/shared/**`, `packages/web-config/**`, `packages/web-shared/**`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json` |

The workflow must run lint/typecheck/tests for the affected app before deployment.

## API Deploys

`@gitiempo/api` deploys to a VPS as a Docker image. GitHub Actions owns release orchestration; the VPS only runs Docker and Docker Compose.

The production Compose stack must include:

| Service | Responsibility |
|---|---|
| `api` | Runs the compiled NestJS application |
| `postgres` | PostgreSQL 16 database with persistent named volume |
| `migrate` | One-shot migration step before API rollout |

Ingress and TLS stay outside the portable API Compose stack. Staging currently uses external nginx to proxy `gitiempo-api.itsua.dev` to the configured localhost API bind, but production can use a different ingress implementation without changing the API image or Compose contract.

PostgreSQL must stay on an internal Docker network. Do not publish the database port to the public internet.

### API Staging Ingress

The optional staging nginx example lives at `deploy/api/nginx.staging.example.conf`. It is a production-like baseline for the current VPS ingress and includes:

- port 80 ACME challenge handling and HTTP to HTTPS redirect
- port 443 TLS with Let's Encrypt-style certificate placeholders
- reverse proxying to the Compose-published localhost API port
- standard forwarded headers and websocket upgrade headers
- request body limit and proxy timeout defaults
- common API security headers

This file is not the complete production readiness checklist. Operators still need to configure DNS, certificate issuance and renewal, firewall rules, host patching, monitoring/alerting, log retention, database backups, rollback runbooks, and real client IP handling if a CDN or load balancer sits in front of nginx.

Do not add nginx, Caddy, Traefik, or TLS automation to `deploy/api/compose.yml`; ingress remains an environment concern.

### API Staging

Staging API public URL: `https://gitiempo-api.itsua.dev`.

The staging VPS Compose stack lives in the path configured by `API_DEPLOY_PATH`; the current staging value is `/root/gitiempo`. The repository must not hard-code that path as a global constant because production may use a different directory.

The runtime environment file is created on the VPS from `deploy/api/.env.example` as `.env` next to `compose.yml`. Real values and secrets must not be committed.

The Compose stack passes `.env` to the `api` and one-shot `migrate` services with `env_file`. For repository-side Compose validation only, set `API_ENV_FILE=.env.example` so Compose renders against the checked-in template. The API container listens on internal port `3000`; `API_HOST_BIND` and `API_HOST_PORT` only control the host-side port exposed for nginx or another ingress.

`DATABASE_URL` is the application and migration connection string. `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` initialize the official PostgreSQL container when its data volume is empty, so they must match the database, user, and password encoded in `DATABASE_URL`.

`APP_URL` is an API runtime value used when the backend builds its own OAuth callback URL. `PUBLIC_API_URL` is a GitHub Environment variable used by the deploy workflow for the final public readiness check; it does not belong in the VPS runtime `.env` unless a future runtime feature needs it.

Staging defaults to `NODE_ENV=development` unless the environment overrides it.

### API Manual Triggers

API deploy workflows must support `workflow_dispatch` with:

| Input | Values | Purpose |
|---|---|---|
| `environment` | `staging`, `production` | Choose VPS, secrets, and compose project |
| `run_migrations` | `true`, `false` | Default `true`; skip only for emergency rollback or no-schema releases |
| `ref` | branch, tag, or SHA | Optional source revision |
| `image_tag` | API image tag or digest | Optional prebuilt image; must resolve to this repository's `ghcr.io/<owner>/<repo>/api` image |

Manual production deploys should require GitHub Environment approval once environments are configured.

### API Automatic Triggers

Automatic API deploys run from the `staging` branch.

Recommended path filters:

| Workflow | Trigger paths |
|---|---|
| `deploy-api` | `apps/api/**`, `packages/shared/**`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`, `.dockerignore`, API Docker/Compose files, deployment files, API helper scripts, and API workflow files |

### API Release Order

The API deploy workflow must follow this order:

1. Resolve the selected API image under `ghcr.io/<owner>/<repo>/api`.
2. For newly built images, install dependencies and build workspace packages.
3. For newly built images, run lint, typecheck, and unit tests.
4. For newly built images, run API integration/e2e tests against an ephemeral PostgreSQL database with `pnpm api:e2e:docker`.
5. For newly built images, build the API Docker image.
6. Log in to GHCR on the GitHub runner.
7. Smoke-test the selected image against ephemeral PostgreSQL with `scripts/api-smoke-docker.sh`.
8. Push the image to GHCR as `ghcr.io/<owner>/<repo>/api:<tag>` only when the workflow built it.
9. Connect to the VPS over SSH.
10. Update environment and Compose files if needed.
11. Pull the selected image.
12. Run migrations explicitly.
13. Recreate the API service with Docker Compose.
14. Check `GET /commons/health/ready` through the public API URL.

Production deploys must not run destructive e2e tests against the production database. Only health and smoke checks are allowed after production rollout.

## Secrets And Runtime Config

GitHub Actions stores deploy credentials and environment-specific values.

| Secret or variable | Owner | Notes |
|---|---|---|
| Cloudflare API token/account/zone data | GitHub Environment | Used by Wrangler deploys |
| `VITE_*` frontend values | GitHub Environment | Injected at frontend build time |
| `PUBLIC_API_URL` | GitHub Environment variable | Public API base URL used for readiness checks |
| `API_DEPLOY_PATH` | GitHub Environment variable | Remote VPS deploy directory |
| `VPS_HOST`, `VPS_USER` | GitHub Environment variables | SSH target used by API deploy workflow |
| `VPS_SSH_KEY` | GitHub Environment secret | SSH private key used only by SSH validation/configuration steps |
| `API_IMAGE` | VPS runtime env / workflow env | Selected GHCR image for Compose rollout and Compose interpolation |
| `APP_URL` | VPS runtime env | Public API URL used by backend OAuth callback generation |
| Registry credentials | GitHub Actions / GHCR integration | The runner logs into GHCR to push and smoke-test images; the VPS must already be logged into GHCR for private image pulls or the API package must be public |
| API runtime env | VPS secret store or Compose `.env` on server | Not committed to git |
| `DATABASE_URL` and `POSTGRES_*` | VPS secret store or Compose `.env` on server | `POSTGRES_*` initializes the database container on first start; `DATABASE_URL` connects API/migrations to that database |

Repository `.env.example` files document names and safe placeholders only. They must not contain real credentials. The VPS runtime example lives in `deploy/api/.env.example`; the shared staging GitHub Environment example lives in `deploy/github-environment.staging.example.env`.

## Health Checks

The API exposes:

| Endpoint | Purpose |
|---|---|
| `GET /commons/health/live` | Liveness probe; no external dependency check |
| `GET /commons/health/ready` | Readiness probe; verifies database connectivity |
| `GET /commons/health` | Backwards-compatible readiness alias |

Docker Compose health checks and external deployment smoke checks should use `/commons/health/ready` for traffic readiness.

## Rollback

Rollback deploys should redeploy a previously published Docker image or Cloudflare Worker version.

Database migrations are not automatically reversible. Any schema rollback requires an explicit migration plan before production rollout.

Frontend rollback is independent per app. Rolling back `user-web` must not roll back `admin-web` unless both were part of the same incident.
