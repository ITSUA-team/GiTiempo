# GI Tiempo

Time-tracking application for teams working with GitHub Issues and Projects.

## Monorepo Structure

```
/
├── apps/
│   ├── api/              ← NestJS backend (@gitiempo/api)
│   ├── landing-web/      ← Astro public landing site (landing-web)
│   ├── user-web/         ← Vue 3 SPA for members (user-web)
│   ├── admin-web/        ← Vue 3 SPA for admins + PMs (admin-web)
│   └── chrome-ext/       ← Chrome extension (planned)
├── packages/
│   ├── shared/           ← shared types, Zod schemas (@gitiempo/shared)
│   └── web-config/       ← shared UI theme and config (@gitiempo/web-config)
├── pnpm-workspace.yaml
├── turbo.json
└── package.json          ← root workspace scripts
```

## Prerequisites

- Node.js 24 LTS
- pnpm 10+ (managed via corepack)

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

## Quick Start

```bash
# Install all dependencies
pnpm install

# Copy API env file and fill in values
cp apps/api/.env.example apps/api/.env

# Run all dev servers in parallel
pnpm dev
```

## Commands

All commands are run from the repository root unless noted otherwise.

### Development

```bash
pnpm dev                # Start all apps in watch/dev mode (parallel)
```

Run a single app:

```bash
pnpm --filter @gitiempo/api dev
pnpm --filter landing-web dev
pnpm --filter user-web dev
pnpm --filter admin-web dev
```

### Build

```bash
pnpm build              # Build all packages and apps (respects dependency order)
```

Build a single app:

```bash
pnpm --filter @gitiempo/api build
pnpm --filter landing-web build
pnpm --filter user-web build
```

### Type Checking

```bash
pnpm typecheck          # Type-check all packages
```

### Linting

```bash
pnpm lint               # Lint all packages
```

### Testing

```bash
pnpm test               # Run tests across all packages
pnpm test:e2e           # Run e2e tests through the configured workspace task
```

API integration/e2e automation must use an isolated PostgreSQL database, not a developer, staging, or production database. See [docs/testing.md](docs/testing.md).

## Deployment

The canonical staging deployment and rollback guide is [docs/deployment.md](docs/deployment.md). Implementation and local verification do not publish a live deployment.

## Working with Packages

### Adding a dependency to a specific app

```bash
# Production dependency
pnpm --filter @gitiempo/api add <package-name>

# Dev dependency
pnpm --filter @gitiempo/api add -D <package-name>

# Examples
pnpm --filter @gitiempo/api add @nestjs/config
pnpm --filter user-web add -D @types/lodash
```

### Adding a dependency to shared package

```bash
pnpm --filter @gitiempo/shared add <package-name>
```

### Adding a root dev dependency

```bash
pnpm add -D -w <package-name>
```

### Using workspace packages

Packages within the monorepo reference each other via `workspace:*`:

```json
{
  "dependencies": {
    "@gitiempo/shared": "workspace:*"
  }
}
```

Turbo ensures dependencies build before dependents via `"dependsOn": ["^build"]`.

## Adding a New App

1. Create the directory under `apps/`:

```bash
mkdir apps/new-app
```

2. Initialize with a `package.json` containing scripts matching turbo tasks:

```json
{
  "name": "new-app",
  "private": true,
  "scripts": {
    "dev": "...",
    "build": "...",
    "typecheck": "...",
    "test": "...",
    "lint": "..."
  }
}
```

3. Run `pnpm install` to link it into the workspace.

## Dependency Updates

```bash
# Check what's outdated
ncu

# Update package.json to latest versions
ncu -u

# Install the updated versions
pnpm install
```

A 7-day minimum age policy is configured in `.npmrc` — freshly published packages (< 7 days) will be rejected to mitigate supply-chain risks.

## Environment Variables

API environment variables are documented in `apps/api/.env.example`. Copy it to `apps/api/.env` and fill in the values before starting the backend.

## Deployment

Frontend apps deploy independently to Cloudflare Workers Static Assets. The API deploys to a VPS as a Docker image managed by Docker Compose. See [docs/deployment.md](docs/deployment.md).

### Frontend Staging Deploys

The staging frontend deploys publish two separate Vue SPAs to Cloudflare Workers Static Assets:

| App | Staging URL | Worker config |
|---|---|---|
| `user-web` | `https://gitiempo.itsua.dev` | `apps/user-web/wrangler.toml` |
| `admin-web` | `https://gitiempo-admin.itsua.dev` | `apps/admin-web/wrangler.toml` |

Wrangler owns the staging custom-domain bindings in the Cloudflare-managed `itsua.dev` zone. Both configs serve the Vite `dist/` directory with SPA fallback so direct route refreshes return `index.html`.

Required GitHub Environment: `staging`.

Required staging values:

| Name | Type | Notes |
|---|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | environment variable | Cloudflare account that owns the Workers and `itsua.dev` zone |
| `CLOUDFLARE_API_TOKEN` | environment secret | Cloudflare API token for Workers deploys and custom-domain/route updates |
| `VITE_API_BASE_URL` | environment variable | `https://gitiempo-api.itsua.dev` |
| `VITE_ADMIN_APP_URL` | environment variable | `https://gitiempo-admin.itsua.dev` |
| `VITE_USER_APP_URL` | environment variable | `https://gitiempo.itsua.dev` |
| `VITE_FIREBASE_API_KEY` | environment variable | Firebase client config used at Vite build time |
| `VITE_FIREBASE_APP_ID` | environment variable | Firebase client config used at Vite build time |
| `VITE_FIREBASE_AUTH_DOMAIN` | environment variable | Firebase client config used at Vite build time |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | environment variable | Firebase client config used at Vite build time |
| `VITE_FIREBASE_PROJECT_ID` | environment variable | Firebase client config used at Vite build time |
| `VITE_FIREBASE_STORAGE_BUCKET` | environment variable | Firebase client config used at Vite build time |

The shared staging GitHub Environment example is `deploy/github-environment.staging.example.env`.

Firebase Auth must authorize both staging domains before login can work end-to-end:

- `gitiempo.itsua.dev`
- `gitiempo-admin.itsua.dev`

Automatic deploys run from the `staging` branch:

- `deploy-user-web-staging.yml` runs when `apps/user-web` or shared frontend paths change.
- `deploy-admin-web-staging.yml` runs when `apps/admin-web` or shared frontend paths change.

Manual deploy without merging to `staging`: Actions -> `Deploy frontend staging` -> `Run workflow`, set `target=user-web|admin-web|both` and `ref=<branch|tag|SHA>`.

Implementation safety rule: do not run a live `wrangler deploy` while adding or validating deploy infrastructure. The first live staging deploy is a separate operator action after the GitHub Environment, Firebase authorized domains, and Cloudflare token permissions are ready.

### API Staging Deploys

The staging API deploy publishes `@gitiempo/api` as a Docker image to GHCR and rolls it out on the VPS with Docker Compose.

Staging API URL: `https://gitiempo-api.itsua.dev`.

Required GitHub Environment: `staging`.

Required staging values:

| Name | Type | Notes |
|---|---|---|
| `PUBLIC_API_URL` | environment variable | `https://gitiempo-api.itsua.dev`; used for public readiness checks |
| `API_DEPLOY_PATH` | environment variable | VPS deploy directory; staging currently uses `/root/gitiempo` |
| `VPS_HOST` | environment variable | VPS SSH host |
| `VPS_USER` | environment variable | VPS SSH user |
| `VPS_SSH_KEY` | environment secret | SSH private key for deploy; scoped only to SSH-related workflow steps |

Manual deploy without merging to `staging`: Actions -> `Deploy API` -> `Run workflow`, set `environment=staging`, `run_migrations=true`, `run_seed=false`, `ref=<branch|tag|SHA>`, and leave `image_tag` empty to build a fresh image. Use `run_seed=true` only for explicit database bootstrap or seed refresh.

`image_tag` is only for rollback/prebuilt deploys and accepts this repository's GHCR API image tags or digests. Automatic staging deploys run from the `staging` branch when API deployment paths change.

The workflow performs a temporary GHCR login on the VPS only for `docker compose pull`, using an ephemeral Docker config that is deleted after the pull. If the default `GITHUB_TOKEN` cannot read the private package, set optional `GHCR_READ_TOKEN` secret and `GHCR_USERNAME` variable in the GitHub Environment.

The optional nginx baseline for the staging API is `deploy/api/nginx.staging.example.conf`. It includes port 80 to 443 redirect, TLS certificate placeholders, reverse proxy headers, websocket upgrade headers, request limits, timeouts, and common API security headers. It is not the full production readiness checklist: DNS, certificate renewal, firewall rules, real client IP handling behind any CDN, monitoring, backups, and rollback operations remain environment setup tasks.

The VPS runtime `.env` is based on `deploy/api/.env.example` and must stay uncommitted. It is passed to the `api` and `migrate` Compose services; `POSTGRES_*` initializes the database container on first start, while `DATABASE_URL` connects API/migrations to that same database. `APP_URL` is the backend's public callback base URL, and `PUBLIC_API_URL` remains a GitHub Environment value for deploy readiness checks. The shared staging GitHub Environment example is `deploy/github-environment.staging.example.env`. Full deployment details are in [docs/deployment.md](docs/deployment.md).

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS, Drizzle ORM, PostgreSQL |
| Frontend | Vue 3, Pinia, PrimeVue, Tailwind CSS |
| Build | Turborepo, pnpm workspaces, Vite |
| Auth | Firebase Auth |
| GitHub | GitHub App (user-to-server) |
| Extension | Chrome Manifest V3 |
