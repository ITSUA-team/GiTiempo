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
```

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

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS, Kysely, PostgreSQL |
| Frontend | Vue 3, Pinia, PrimeVue, Tailwind CSS |
| Build | Turborepo, pnpm workspaces, Vite |
| Auth | Firebase Auth |
| GitHub | GitHub App (user-to-server) |
| Extension | Chrome Manifest V3 |
