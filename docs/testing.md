# Testing

This document defines the target automated testing model for GI Tiempo. Test infrastructure must be reproducible locally and in GitHub Actions.

## Test Layers

| Layer | Command | Database | When |
|---|---|---|---|
| Lint | `pnpm lint` | No | PR, staging branch, deploy workflows |
| Typecheck | `pnpm typecheck` | No | PR, staging branch, deploy workflows |
| Unit tests | `pnpm test` | No | PR, staging branch, deploy workflows |
| API integration/e2e | `pnpm api:e2e:docker` | Ephemeral PostgreSQL | API/shared PRs and API deploy workflow |
| API container smoke | `pnpm api:smoke:docker` | Ephemeral PostgreSQL | Before pushing or deploying a selected API image |
| Browser e2e | Playwright command once added | Staging environment | Deferred post-MVP |

## API Integration/E2E Database

API integration/e2e tests must not use:

- a developer's local database from `apps/api/.env`
- staging database
- production database
- any shared persistent CI database

Each automated run must create an isolated PostgreSQL database, apply migrations, load deterministic seed data, run tests, and destroy the database state.

The implemented runner uses Docker Compose with an ephemeral `postgres:16` service and a test runner service. A GitHub Actions service container is also acceptable for future workflows if it follows the same isolation rules.

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

Run API e2e through the isolated Docker runner:

```bash
pnpm api:e2e:docker
```

Run the API image smoke check after building an image tagged as `gitiempo-api:local` or by setting `API_IMAGE`:

```bash
pnpm api:smoke:docker
```

Both commands use ephemeral PostgreSQL and must not rely on `apps/api/.env`, a developer local database, staging database, production database, or any shared persistent CI database.

## GitHub Actions Runs

Pull request workflows should run:

- lint, typecheck, and unit tests for all affected packages
- API integration/e2e tests with ephemeral PostgreSQL when `apps/api` or `packages/shared` changes
- frontend build/test checks when `apps/user-web`, `apps/admin-web`, `packages/web-config`, or `packages/web-shared` changes

The `staging` branch workflows should repeat the checks required for deployment. Deployment must not start from a failed test workflow.

## Deployment Checks

When the API deploy workflow builds a new image, it must run API integration/e2e tests before the image build and rollout. Manual prebuilt image deploys rely on prior image provenance and still run the container smoke check before rollout.

The API deploy workflow must also run `scripts/api-smoke-docker.sh` against the selected Docker image and an ephemeral PostgreSQL database. This applies to both newly built images and prebuilt rollback tags, verifying that the image can boot, connect to the database, and pass `GET /commons/health/ready` before it is rolled out to the VPS.

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
