# @gitiempo/api

Backend REST API for **GI Tiempo**, built with [NestJS 11](https://docs.nestjs.com/), [Drizzle ORM](https://orm.drizzle.team/) and Postgres.

> Auth is **not** wired yet. While that work is pending, the `/users/me` endpoints
> resolve "me" to the **first seeded user (by email asc)** so the frontend has a
> stable identity to talk to. Replace this once Firebase auth lands.

## Stack

| Layer            | Choice                                            |
|------------------|---------------------------------------------------|
| Framework        | NestJS 11                                         |
| Database         | Postgres 16+ via Drizzle ORM (`node-postgres`)    |
| Validation       | Zod via `nestjs-zod` (global `ZodValidationPipe`) |
| Logging          | `nestjs-pino` + request-id correlation            |
| Security         | Helmet, CORS allowlist, rate-limit, body limits   |
| Tests            | Vitest + SWC (unit) + Supertest (e2e)             |
| API contract     | Swagger / OpenAPI (cleaned with `cleanupOpenApiDoc`) |
| Shared schemas   | `@gitiempo/shared` (Zod schemas + types)          |

## Quick start

```bash
# 1. Install deps from repo root
pnpm install

# 2. Configure env
cp apps/api/.env.example apps/api/.env
# edit DATABASE_URL etc.

# 3. Build shared package (required before any API command)
pnpm build

# 4. Apply migrations
pnpm --filter @gitiempo/api db:migrate

# 5. Seed 3 users
pnpm --filter @gitiempo/api db:seed

# 6. Run the API
pnpm --filter @gitiempo/api dev
# → http://localhost:3000
# → Swagger UI: http://localhost:3000/docs
```

## Turborepo

This monorepo uses [Turborepo](https://turbo.build/) to orchestrate tasks
across packages. When you run a command from the repo root via turbo,
all workspace dependencies are built automatically:

```bash
# From repo root — shared package is built first
pnpm typecheck     # turbo run typecheck
pnpm test          # turbo run test
pnpm build         # turbo run build
pnpm lint          # turbo run lint
pnpm openapi:export
```

When running API scripts directly with `pnpm --filter @gitiempo/api`,
you must build `@gitiempo/shared` first:

```bash
pnpm build
# or manually:
pnpm --filter @gitiempo/shared build
```

## NPM scripts

Run via turbo from repo root (`pnpm <script>`) or directly (`pnpm --filter @gitiempo/api <script>`).

| Script              | Description                                        |
|---------------------|----------------------------------------------------|
| `dev`               | Start in watch mode                                |
| `build`             | Build to `dist/`                                   |
| `start:prod`        | Run the compiled build                             |
| `typecheck`         | `tsc --noEmit`                                     |
| `lint`              | ESLint + Prettier auto-fix                         |
| `test`              | Vitest unit tests (`src/**/*.spec.ts`)             |
| `test:watch`        | Vitest in watch mode                               |
| `test:cov`          | Unit tests with coverage                           |
| `test:e2e`          | Vitest e2e tests against a prepared Postgres      |
| `db:generate`       | Drizzle: generate SQL migration from schema diff   |
| `db:migrate`        | Drizzle: apply pending migrations                  |
| `db:check`          | Drizzle: validate migration history                |
| `db:studio`         | Drizzle Studio                                     |
| `db:seed`           | Insert / update 3 seed users                       |
| `openapi:export`    | Write `openapi.json` to `packages/shared/`        |

## Project layout

```
src/
  app.module.ts          ← global pipes, throttler, modules
  main.ts                ← bootstrap (helmet, CORS, swagger)
  config/
    env.validation.ts    ← Zod-validated env (single source of truth)
    logger.config.ts     ← nestjs-pino + x-request-id
  commons/
    controllers/         ← /commons/health{,/live,/ready,status}
    filters/             ← AllExceptionsFilter (custom error envelope)
  db/
    db.module.ts         ← pg.Pool + Drizzle (global)
    schema.ts            ← schema barrel
    seed.ts              ← seed CLI (no Nest bootstrap)
  openapi/
    export.ts            ← writes openapi.json to packages/shared/
  users/
    users.module.ts      ← + ZodSerializerInterceptor (strips internals)
    controllers/         ← GET/PATCH /users/me
    services/
    schemas/             ← drizzle table
    dto/                 ← createZodDto wrappers around shared Zod schemas
  auth/                  ← scaffold only; pending implementation
test/
  app.e2e-spec.ts
  users.e2e-spec.ts
```

## Production-readiness defaults already enabled

- Global `ZodValidationPipe` for `@Body` / `@Query` / `@Param`.
- Global `AllExceptionsFilter` returning a stable error envelope:
  ```json
  { "statusCode": 400, "error": "BadRequest", "message": "...", "requestId": "...", "details": [ ... ] }
  ```
- Global `ZodSerializerInterceptor` so internal fields (e.g. `firebaseUid`) cannot leak into responses.
- Global `ThrottlerGuard` (config: `THROTTLE_TTL_MS`, `THROTTLE_LIMIT`).
- `helmet()` security headers.
- CORS allowlist via `ALLOWED_ORIGINS`.
- Body limits: 1 MB JSON / urlencoded.
- `x-request-id` propagated and correlated in pino logs.
- Compact dev logs by default (`LOG_EXTENDED=true` for full req/res details).
- Liveness / readiness split at `/commons/health/live` and `/commons/health/ready`.
- `enableShutdownHooks` + Drizzle pool close on `OnApplicationShutdown`.

## Endpoints (current)

| Method  | Path                       | Description                       |
|---------|----------------------------|-----------------------------------|
| `GET`   | `/commons/health/live`     | Liveness probe                    |
| `GET`   | `/commons/health/ready`    | Readiness probe (DB ping)         |
| `GET`   | `/commons/health`          | Alias for readiness               |
| `GET`   | `/commons/status`          | Env, swagger flag, uptime         |
| `GET`   | `/users/me`                | Current user (seed user for now)  |
| `PATCH` | `/users/me`                | Update `displayName` / `avatarUrl` |
| `GET`   | `/docs`                    | Swagger UI                        |

## Tests

- **Unit**: `pnpm test` or `pnpm --filter @gitiempo/api test` — no DB required.
- **E2E**: `pnpm test:e2e` or `pnpm --filter @gitiempo/api test:e2e` — requires a reachable Postgres, applied migrations, and deterministic seed data.

Automated e2e runs must use an isolated ephemeral PostgreSQL database provisioned by the test runner or GitHub Actions. They must not use a developer local database, staging database, production database, or shared persistent CI database. See `../../docs/testing.md`.

The current direct e2e script uses Node's native `--env-file=.env` flag and is a local fallback until the isolated Docker test runner is added.

## API contract for the frontend

- Generate fresh OpenAPI: `pnpm openapi:export` → `packages/shared/openapi.json`.
- Import from frontend: `import spec from '@gitiempo/shared/openapi.json'`.
- Shared Zod schemas live in `packages/shared/src/contracts/` and are the
  single source of truth for both backend DTOs and frontend validators.

## Bruno

A Bruno collection with example requests lives under `bruno/` at the repo root.
Open the folder in Bruno and select the **local** environment to talk to
`http://localhost:3000`.
