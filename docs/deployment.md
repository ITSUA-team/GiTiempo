# Deployment

This document describes the deployment workflow for GI Tiempo. It is the source of truth for deployment intent; implementation files such as Dockerfiles, Compose files, Wrangler configs, and GitHub Actions workflows must stay aligned with it.

## Deployment Targets

| Component | Target | Deployment unit |
|---|---|---|
| `apps/landing-web` | Cloudflare Workers Static Assets | Separate Worker/static asset deployment |
| `apps/user-web` | Cloudflare Workers Static Assets | Separate Worker/static asset deployment |
| `apps/admin-web` | Cloudflare Workers Static Assets | Separate Worker/static asset deployment |
| `apps/api` | VPS | Docker image started by Docker Compose |
| PostgreSQL | VPS | Docker Compose service with persistent volume |
| Chrome Extension | Chrome Web Store | Manual publish |

Frontend and backend deploy independently. A landing-only change must not redeploy either SPA or restart the API. A change limited to one SPA must not redeploy the landing or the other SPA, and an API-only change must not redeploy any frontend.

## Frontend Deploys

`apps/landing-web`, `apps/user-web`, and `apps/admin-web` deploy as separate Cloudflare Workers Static Assets projects. The landing is a static Astro site; the authenticated apps are Vite SPAs.

Each frontend app owns its own Wrangler configuration. The existing GitHub Actions workflow deploys the two SPAs through the shared `deploy-frontend-staging.yml` workflow and reusable deploy job. The landing deploys through its own `deploy-landing-staging.yml` workflow so its static build and public-only configuration stay isolated from SPA requirements.

All three frontend builds output `dist/`. Only `user-web` and `admin-web` use SPA fallback so unknown routes return `index.html`; the Astro landing must preserve static route semantics.

Frontend builds use build-time environment values. The existing SPAs use `VITE_*`; the landing must use Astro-compatible public environment values for browser-visible URLs.

| App | Required deployment values |
|---|---|
| `landing-web` | Public site URL/canonical origin, user-app entry URL, and admin-app entry URL |
| `user-web` | `VITE_API_BASE_URL`, Firebase client variables, `VITE_ADMIN_APP_URL` |
| `admin-web` | `VITE_API_BASE_URL`, Firebase client variables, `VITE_USER_APP_URL` |

Landing origins and CTA targets:

| Environment | Landing origin | User app entry | Admin app entry |
|---|---|---|---|
| Local | `http://localhost:4321` | `http://localhost:5173/login` | `http://localhost:5174` |
| Staging | `https://gitiempo-landing.itsua.dev` | `https://gitiempo.itsua.dev/login` | `https://gitiempo-admin.itsua.dev` |

The landing implementation must receive all three values from environment-aware configuration. Do not hard-code the staging origins in Astro components.

Do not read production frontend config from repository `.env` files. GitHub Actions must inject environment-specific values from GitHub Environments or repository secrets/variables. The staging Environment example at `deploy/github-environment.staging.example.env` documents the frontend and API values.

For Cloudflare staging deployment, `CLOUDFLARE_ACCOUNT_ID` and the landing `PUBLIC_*` values are GitHub Environment variables. `CLOUDFLARE_API_TOKEN` is a GitHub Environment secret. The example file separates those categories so operators do not duplicate the account ID as a secret.

### Frontend Manual Triggers

The staging frontend deploy workflow supports `workflow_dispatch` with:

| Input | Values | Purpose |
|---|---|---|
| `target` | `user-web`, `admin-web`, `both` | Choose which existing SPA deployment to run |
| `ref` | branch, tag, or SHA | Optional source revision |

Landing uses the separate `deploy-landing-staging` workflow with an optional `ref` input (branch, tag, or SHA). It verifies and deploys only `landing-web`; it does not accept the SPA `target` input. Production frontend deploys are not configured yet. When added, they should require GitHub Environment approval.

### Frontend Automatic Triggers

Automatic frontend deploys run from the `staging` branch. The SPA matrix workflow detects changed files and deploys only the affected SPA targets; the landing workflow uses its own landing-only path filters.

Recommended path filters:

| Workflow | Trigger paths |
|---|---|
| `deploy-frontend-staging` | `apps/user-web/**`, `apps/admin-web/**`, `packages/shared/**`, `packages/web-config/**`, `packages/web-shared/**`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`, shared CI/deploy workflow files |
| `deploy-landing-staging` | `apps/landing-web/**`, `packages/web-config/**`, workspace manifests, Turbo configuration, workspace check action, landing target detector, and landing workflow files |

Landing-only changes do not enter the two-SPA deployment matrix. The landing workflow validates `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `PUBLIC_SITE_URL`, `PUBLIC_USER_APP_URL`, and `PUBLIC_ADMIN_APP_URL`, then runs the landing lint, typecheck, test, and build gates before invoking Wrangler. It does not require Firebase or API values.

Each deployment workflow runs lint/typecheck/tests/build for its affected app before deployment. Shared frontend package changes deploy both SPAs after both app gates pass.

Implementation and local verification do not invoke a live deployment; publishing occurs only through an authorized GitHub Actions staging workflow run.

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

Seed users are optional runtime env values consumed only by the seed command. `SEED_ADMIN_EMAIL` and `SEED_ADMIN_FIREBASE_UID` create or update the initial admin membership. `SEED_MEMBER_EMAIL` and `SEED_MEMBER_FIREBASE_UID` create or update a member and assign that user to the seeded `Demo Client` project so the user app has visible project/task data. These values must match real Firebase Auth users; seed does not create Firebase Auth accounts or passwords.

Staging defaults to `NODE_ENV=development` unless the environment overrides it.

Run seed locally after migrations with:

```bash
pnpm --filter @gitiempo/api db:seed
```

Run seed on the VPS after migrations from `API_DEPLOY_PATH` with:

```bash
API_IMAGE=<selected-image> docker compose run --rm api node dist/src/db/seed.js
```

### API Manual Triggers

API deploy workflows must support `workflow_dispatch` with:

| Input | Values | Purpose |
|---|---|---|
| `environment` | `staging`, `production` | Choose VPS, secrets, and compose project |
| `run_migrations` | `true`, `false` | Default `true`; skip only for emergency rollback or no-schema releases |
| `run_seed` | `true`, `false` | Default `false`; run only for explicit bootstrap or seed refresh |
| `ref` | branch, tag, or SHA | Optional source revision |
| `image_tag` | API image tag or digest | Optional prebuilt image; must resolve to this repository's `ghcr.io/<owner>/<repo>/api` image |

Manual production deploys should require GitHub Environment approval once environments are configured.

### API Automatic Triggers

Automatic API deploys run from the `staging` branch.

Recommended path filters:

| Workflow | Trigger paths |
|---|---|
| `deploy-api` | `apps/api/**`, `packages/shared/**`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`, `.dockerignore`, API Docker/Compose files, deployment files, API helper scripts, shared check action/script files, and API workflow files |

### API Release Order

The API deploy workflow must follow this order:

1. Resolve the selected API image under `ghcr.io/<owner>/<repo>/api`.
2. For newly built images, run lint, typecheck, and unit tests through the shared API workspace check gate.
3. For newly built images, run API integration/e2e tests against an ephemeral PostgreSQL database through the same gate.
4. For newly built images, build the API Docker image.
5. Log in to GHCR on the GitHub runner.
6. Smoke-test the selected image against ephemeral PostgreSQL with `scripts/api-smoke-docker.sh`.
7. Push the image to GHCR as `ghcr.io/<owner>/<repo>/api:<tag>` only when the workflow built it.
8. Connect to the VPS over SSH.
9. Update environment and Compose files if needed.
10. Perform temporary GHCR login on the VPS and pull the selected image.
11. Run migrations explicitly.
   If a committed migration intentionally invalidates persisted sessions because legacy rows cannot be upgraded safely, treat that forced logout as planned release behavior and communicate it before rollout.
12. Run the idempotent seed script only when `run_seed=true`.
13. Recreate the API service with Docker Compose.
14. Check `GET /commons/health/ready` through the public API URL.

Production deploys must not run destructive e2e tests against the production database. Only health and smoke checks are allowed after production rollout.

The shared implementation for PR and deploy package gates is `.github/actions/workspace-check/action.yml`. Do not duplicate install/lint/typecheck/test/build steps in deployment workflows.

## Secrets And Runtime Config

GitHub Actions stores deploy credentials and environment-specific values.

| Secret or variable | Owner | Notes |
|---|---|---|
| Cloudflare API token/account/zone data | GitHub Environment | Used by Wrangler deploys |
| `VITE_*` frontend values | GitHub Environment | Injected at frontend build time |
| `PUBLIC_SITE_URL`, `PUBLIC_USER_APP_URL`, `PUBLIC_ADMIN_APP_URL` | GitHub Environment | Injected at landing build time; canonical origin and direct user/admin app entry URLs |
| `PUBLIC_API_URL` | GitHub Environment variable | Public API base URL used for readiness checks |
| `API_DEPLOY_PATH` | GitHub Environment variable | Remote VPS deploy directory |
| `ALLOWED_ORIGINS` | GitHub Environment variable / VPS runtime env | Comma-separated CORS allow-list written into the VPS `.env`; include web app origins and exact Chrome extension origins such as `chrome-extension://<extension-id>` |
| `VPS_HOST`, `VPS_USER` | GitHub Environment variables | SSH target used by API deploy workflow |
| `VPS_SSH_KEY` | GitHub Environment secret | SSH private key used only by SSH validation/configuration steps |
| `API_IMAGE` | VPS runtime env / workflow env | Selected GHCR image for Compose rollout and Compose interpolation |
| `APP_URL` | VPS runtime env | Public API URL used by backend OAuth callback generation |
| `USER_SPA_URL`, `ADMIN_SPA_URL` | VPS runtime env | Canonical SPA origins used by the API when generating app return links and cross-app redirects |
| Firebase Authorized Domains / action-code config | Firebase project settings | Must include each deployed `USER_SPA_URL` origin required by invite password setup/reset flows |
| `INVITES_EMAIL_CONSOLE_FALLBACK_SHOW_SECRETS` | Development only | Optional debug flag for full invite/setup URLs in console fallback; rejected outside `NODE_ENV=development` |
| Registry credentials | GitHub Actions / GHCR integration | The runner logs into GHCR to push and smoke-test images; the workflow also performs a temporary VPS GHCR login with an ephemeral Docker config only for `docker compose pull` |
| `GHCR_READ_TOKEN`, `GHCR_USERNAME` | Optional GitHub Environment secret/variable | Only needed if the default `GITHUB_TOKEN` cannot read the private GHCR package; the token is passed over SSH stdin and not stored in the VPS default Docker config |
| API runtime env | VPS secret store or Compose `.env` on server | Not committed to git |
| `DATABASE_URL` and `POSTGRES_*` | VPS secret store or Compose `.env` on server | `POSTGRES_*` initializes the database container on first start; `DATABASE_URL` connects API/migrations to that database |
| `SEED_ADMIN_*`, `SEED_MEMBER_*` | VPS runtime env | Optional DB seed users matched to existing Firebase Auth UIDs |

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

Frontend rollback is independent per app. Roll back `landing-web` by redeploying a previously published landing Cloudflare Worker version only; do not redeploy `user-web`, `admin-web`, or the API. Rolling back `user-web` must not roll back `admin-web` unless both were part of the same incident.
