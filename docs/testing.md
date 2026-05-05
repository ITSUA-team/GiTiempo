# Testing

This document defines the target automated testing model for GI Tiempo. Test infrastructure must be reproducible locally and in GitHub Actions.

## Test Layers

| Layer | Command | Database | When |
|---|---|---|---|
| Lint | `pnpm lint` | No | PR, staging branch, deploy workflows |
| Typecheck | `pnpm typecheck` | No | PR, staging branch, deploy workflows |
| Unit tests | `pnpm test` | No | PR, staging branch, deploy workflows |
| API integration/e2e | `pnpm test:e2e` through an isolated runner | Ephemeral PostgreSQL | API/shared PRs and API deploy workflow |
| API container smoke | Deployment workflow command | Ephemeral PostgreSQL | Before pushing or deploying API image |
| Browser e2e | Playwright command once added | Staging environment | Deferred post-MVP |

## API Integration/E2E Database

API integration/e2e tests must not use:

- a developer's local database from `apps/api/.env`
- staging database
- production database
- any shared persistent CI database

Each automated run must create an isolated PostgreSQL database, apply migrations, load deterministic seed data, run tests, and destroy the database state.

The preferred implementation is Docker Compose with an ephemeral `postgres:16` service and a test runner service. A GitHub Actions service container is also acceptable if it follows the same isolation rules.

Required flow:

1. Start isolated PostgreSQL.
2. Wait for database readiness.
3. Set `NODE_ENV=test`.
4. Set `DATABASE_URL` to the isolated database.
5. Run Drizzle migrations.
6. Run deterministic seed data required by e2e tests.
7. Run API e2e specs.
8. Tear down the database and volumes.

Current e2e specs mutate database state and therefore run sequentially across files. Parallel API e2e requires a separate isolation design, such as one schema or database per spec file.

## Local Runs

Developers can run fast checks directly:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

When a frontend change touches shared frontend packages or shared auth/session/runtime helpers, targeted checks must cover every affected SPA, not only the app where the feature UI was edited.

- `packages/web-shared` or `packages/web-config` changes require `user-web` and `admin-web` lint/typecheck.
- Shared auth/session/runtime changes also require `pnpm --filter user-web test` and `pnpm --filter admin-web test` so both SPA integrations stay protected.

API e2e should be run through the isolated database runner once the Docker Compose test infrastructure exists. Until then, direct `pnpm --filter @gitiempo/api test:e2e` is a local fallback only and requires a manually prepared database.

## GitHub Actions Runs

Pull request workflows should run:

- lint, typecheck, and unit tests for all affected packages
- API integration/e2e tests with ephemeral PostgreSQL when `apps/api` or `packages/shared` changes
- frontend build/test checks when `apps/user-web`, `apps/admin-web`, `packages/web-config`, or `packages/web-shared` changes

The `staging` branch workflows should repeat the checks required for deployment. Deployment must not start from a failed test workflow.

## Deployment Checks

The API deploy workflow must run API integration/e2e tests before building and deploying the production image.

The API deploy workflow must also run a container smoke test against the built Docker image and an ephemeral PostgreSQL database. This verifies that the image can boot, connect to the database, and pass `GET /commons/health/ready` before it is rolled out to the VPS.

After production deployment, only non-destructive checks are allowed:

- `GET /commons/health/live`
- `GET /commons/health/ready`
- lightweight authenticated smoke checks only if they do not modify production data

Destructive e2e tests must never run against production.

## Ownership

| Actor | Responsibility |
|---|---|
| Developer | Run targeted checks before pushing or opening PR |
| GitHub Actions | Enforce automated checks and deploy gates |
| VPS | Run deployed services only; not responsible for full test orchestration |
| Production API | Expose health endpoints for post-deploy verification |

Test orchestration belongs in GitHub Actions and local Docker tooling, not on the VPS runtime host.
