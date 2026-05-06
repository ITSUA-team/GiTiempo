# GI Tiempo

Time-tracking application for teams working with GitHub Issues and Projects.

## Monorepo Structure

```
/
├── apps/
│   ├── api/              ← NestJS backend (@gitiempo/api)
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

- Node.js 22+
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
| `CLOUDFLARE_API_TOKEN` | environment secret | Must allow Workers deploys and custom-domain/route updates for `itsua.dev` |
| `VITE_FIREBASE_API_KEY` | environment variable | Firebase client config used at Vite build time |
| `VITE_FIREBASE_APP_ID` | environment variable | Firebase client config used at Vite build time |
| `VITE_FIREBASE_AUTH_DOMAIN` | environment variable | Firebase client config used at Vite build time |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | environment variable | Firebase client config used at Vite build time |
| `VITE_FIREBASE_PROJECT_ID` | environment variable | Firebase client config used at Vite build time |
| `VITE_FIREBASE_STORAGE_BUCKET` | environment variable | Firebase client config used at Vite build time |

The workflow sets these staging URLs during the build:

- `VITE_API_BASE_URL=https://gitiempo.itsua.dev`
- `VITE_ADMIN_APP_URL=https://gitiempo-admin.itsua.dev`
- `VITE_USER_APP_URL=https://gitiempo.itsua.dev`

Firebase Auth must authorize both staging domains before login can work end-to-end:

- `gitiempo.itsua.dev`
- `gitiempo-admin.itsua.dev`

Automatic deploys run from the `staging` branch:

- `deploy-user-web-staging.yml` runs when `apps/user-web` or shared frontend paths change.
- `deploy-admin-web-staging.yml` runs when `apps/admin-web` or shared frontend paths change.

Manual deploys use the `Deploy frontend staging` workflow with `target=user-web`, `target=admin-web`, or `target=both`. The optional `ref` input deploys a branch, tag, or SHA.

Implementation safety rule: do not run a live `wrangler deploy` while adding or validating deploy infrastructure. The first live staging deploy is a separate operator action after the GitHub Environment, Firebase authorized domains, and Cloudflare token permissions are ready.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS, Drizzle ORM, PostgreSQL |
| Frontend | Vue 3, Pinia, PrimeVue, Tailwind CSS |
| Build | Turborepo, pnpm workspaces, Vite |
| Auth | Firebase Auth |
| GitHub | GitHub App (user-to-server) |
| Extension | Chrome Manifest V3 |
