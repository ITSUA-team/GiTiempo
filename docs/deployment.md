# Deployment

This document describes the target deployment workflow for GI Tiempo. It is the source of truth for deployment intent; implementation files such as Dockerfiles, Compose files, Wrangler configs, and GitHub Actions workflows must follow it once added.

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

Do not read production frontend config from repository `.env` files. GitHub Actions must inject environment-specific values from GitHub Environments or repository secrets/variables.

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
| reverse proxy | TLS termination and routing to `api` if not provided externally |

PostgreSQL must stay on an internal Docker network. Do not publish the database port to the public internet.

### API Manual Triggers

API deploy workflows must support `workflow_dispatch` with:

| Input | Values | Purpose |
|---|---|---|
| `environment` | `staging`, `production` | Choose VPS, secrets, and compose project |
| `run_migrations` | `true`, `false` | Default `true`; skip only for emergency rollback or no-schema releases |
| `ref` | branch, tag, or SHA | Optional source revision |
| `image_tag` | image tag | Optional prebuilt image to deploy |

Manual production deploys should require GitHub Environment approval once environments are configured.

### API Automatic Triggers

Automatic API deploys run from the `staging` branch.

Recommended path filters:

| Workflow | Trigger paths |
|---|---|
| `deploy-api` | `apps/api/**`, `packages/shared/**`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`, Docker/Compose deployment files once added |

### API Release Order

The API deploy workflow must follow this order:

1. Install dependencies and build workspace packages.
2. Run lint, typecheck, and unit tests.
3. Run API integration/e2e tests against an ephemeral PostgreSQL database.
4. Build the API Docker image.
5. Run container smoke tests against the built image and an ephemeral PostgreSQL database.
6. Push the image to the registry.
7. Connect to the VPS over SSH.
8. Update environment and Compose files if needed.
9. Pull the selected image.
10. Run migrations explicitly.
11. Recreate the API service with Docker Compose.
12. Check `GET /commons/health/ready` through the public API URL.

Production deploys must not run destructive e2e tests against the production database. Only health and smoke checks are allowed after production rollout.

## Secrets And Runtime Config

GitHub Actions stores deploy credentials and environment-specific values.

| Secret or variable | Owner | Notes |
|---|---|---|
| Cloudflare API token/account/zone data | GitHub Environment | Used by Wrangler deploys |
| `VITE_*` frontend values | GitHub Environment | Injected at frontend build time |
| VPS SSH host/user/key | GitHub Environment | Used by API deploy workflow |
| Registry credentials | GitHub Actions / registry integration | Used to push and pull API images |
| API runtime env | VPS secret store or Compose `.env` on server | Not committed to git |
| PostgreSQL password | VPS secret store or Compose `.env` on server | Not committed to git |

Repository `.env.example` files document names and safe placeholders only. They must not contain real credentials.

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
