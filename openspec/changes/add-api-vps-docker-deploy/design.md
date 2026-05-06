## Context

`docs/deployment.md`, ADR 006, `docs/testing.md`, and ADR 007 define the target infrastructure: `@gitiempo/api` runs on a VPS as a Docker image managed by Docker Compose, API e2e tests use isolated ephemeral PostgreSQL, and deploy workflows are owned by GitHub Actions. The repository currently has NestJS build/start scripts, Drizzle migrations, seed data, and health endpoints, but no Dockerfile, Compose files, Docker-backed e2e runner, API image smoke test, or API deploy workflow.

The nearest app guidance is `apps/api/AGENTS.md`: API runtime entrypoints are `src/main.ts` and `src/app.module.ts`, database wiring is under `src/db/*`, env validation lives in `src/config/env.validation.ts`, and API-only verification is lint, typecheck, and tests. This change also touches root monorepo scripts, `.github/workflows`, deployment docs, and frontend staging configuration because the frontend apps need a dedicated staging API URL.

Staging API will be published at `https://gitiempo-api.itsua.dev`. The current staging VPS already has nginx, but nginx must not become a portable project requirement because production ingress may differ. The portable Compose stack therefore owns only application runtime services and exposes the API on a configurable localhost port for whichever external ingress the environment provides.

## Goals / Non-Goals

**Goals:**

- Build a repeatable production-oriented Docker image for `@gitiempo/api` from the monorepo.
- Add a VPS Compose stack with `api`, `postgres`, and explicit one-shot `migrate` services.
- Use GHCR as the image registry.
- Deploy through GitHub Actions over SSH using GitHub Environment variables and secrets.
- Keep the VPS deploy path environment-driven; staging will use `/root/gitiempo`, but the repository must not hard-code that path as a universal constant.
- Run staging API with `NODE_ENV=development` unless an environment overrides it.
- Run existing API e2e specs against Docker-backed ephemeral PostgreSQL instead of a host or developer database.
- Add a minimal image smoke test before pushing/deploying the API image.
- Align frontend staging `VITE_API_BASE_URL` and docs to `https://gitiempo-api.itsua.dev`.
- Keep `docs/deployment.md`, `docs/testing.md`, ADRs, and the root `README.md` aligned with the implemented API deploy and test commands.

**Non-Goals:**

- Do not add nginx, Caddy, or Traefik as a service in the portable API Compose stack.
- Do not implement production-specific ingress or TLS automation.
- Do not add new business e2e coverage, browser e2e tests, Testcontainers, or per-spec database isolation.
- Do not run destructive e2e tests against staging or production databases.
- Do not change API request/response contracts.
- Do not commit real runtime secrets or VPS `.env` files.

## Decisions

### Keep ingress outside the API Compose stack

The runtime Compose stack will publish the API only to a configurable host bind, defaulting to `127.0.0.1:${API_HOST_PORT:-3000}:3000`. PostgreSQL will remain on an internal Docker network and will not publish a host port.

Rationale: staging can use the nginx already installed on the VPS, while production remains free to use nginx, Caddy, Traefik, Cloudflare Tunnel, or managed load balancing without changing the API image or Compose contract.

Alternatives considered:

- Add Caddy to Compose: simpler for a clean VPS, but it would conflict with the existing staging nginx and make one ingress implementation look required.
- Add Traefik to Compose: useful for many dynamic Docker services, but excessive for one API service and one database.
- Add nginx to Compose: familiar, but still over-couples portable runtime to staging ingress.

### Use GHCR and environment-driven VPS deploy settings

GitHub Actions will build and push `ghcr.io/<owner>/<repo>/api:<tag>` using `GITHUB_TOKEN` package permissions. Manual prebuilt deploys will accept only a short tag, full tag, or digest for this repository's `ghcr.io/<owner>/<repo>/api` image. The deploy workflow will read the remote path from a GitHub Environment variable, with staging configured as `/root/gitiempo`.

Rationale: GHCR avoids extra registry credentials, constraining prebuilt image inputs prevents external image rollout or shell injection through image references, and environment-driven deploy paths keep staging and production independent.

Alternatives considered:

- Docker Hub or a private registry: adds credentials without current benefit.
- Hard-code `/root/gitiempo`: matches staging but makes production migration harder.

### Add a runtime-safe migration entrypoint

The API image will include a compiled migration entrypoint that runs Drizzle migrations using runtime dependencies. The Compose `migrate` service will run this entrypoint as a one-shot release step before `api` is recreated.

The VPS runtime `.env` will be passed to the `api` and `migrate` services with Compose `env_file`. The API container will still force internal `PORT=3000` so host ingress configuration cannot drift from the container healthcheck and published container port. `API_HOST_BIND` and `API_HOST_PORT` remain Compose interpolation values for the host-side bind only.

The official PostgreSQL image will initialize an empty data volume from `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD`; no `init.sql` is required for the base database/user setup. `DATABASE_URL` remains explicit for API and migration connections and must match those `POSTGRES_*` values.

Rationale: existing `db:migrate` uses `drizzle-kit`, which is a devDependency. Shipping dev tooling in the runtime image just to run production migrations increases image size and coupling. A compiled migrator keeps migrations explicit while preserving a lean runtime image.

Alternatives considered:

- Run `drizzle-kit migrate` inside the runtime image: simple but requires dev dependencies in production.
- Run migrations on the VPS host: leaks release orchestration onto the host and weakens image parity.
- Run migrations on API startup: violates ADR 006's explicit migration step and makes rollback behavior harder to reason about.

### Keep Docker e2e critical-only

The Docker e2e runner will execute the current API e2e suite after starting ephemeral PostgreSQL, applying migrations, and loading deterministic seed data. It will not introduce additional test cases or stronger per-file isolation.

Rationale: the critical gap is database isolation, not test coverage expansion. Existing specs already cover the API behavior currently used as e2e protection, and `vitest.e2e.config.ts` already serializes files.

Alternatives considered:

- Testcontainers: valid later, but more moving parts than Compose for this repo.
- Per-spec database/schema isolation: stronger but unnecessary for the current sequential suite.
- GitHub Actions service containers only: acceptable, but Compose keeps local and CI flows aligned and can be reused for image smoke tests.

### Smoke the selected image before publishing or deploying

The deploy workflow will start the selected image against ephemeral PostgreSQL, run migrations, and check `/commons/health/ready`. This applies to both newly built images and prebuilt rollback tags. The smoke test will not exercise business flows.

Rationale: this proves the artifact can boot, validate env, connect to Postgres, apply migrations, and report readiness without adding slow or destructive behavior.

### Treat staging as development runtime for now

Staging deploys will set `NODE_ENV=development` by default through the VPS environment file. Production can set `NODE_ENV=production` later and supply the stricter production-only variables required by `env.validation.ts`.

Rationale: the current staging environment is not production-like enough to require production mode, and using `development` avoids expanding scope into production secret readiness.

Trade-off: staging may not catch `NODE_ENV=production` validation gaps. The image smoke test can still run with a minimal controlled environment, and production readiness can be tightened in a later change.

## Risks / Trade-offs

- Staging `NODE_ENV=development` may hide production-only env validation failures → Keep production deploy as a separate future hardening step and document required production env values.
- External nginx or TLS misconfiguration can break public health checks even when Compose services are healthy → Provide an optional staging nginx HTTPS reverse-proxy example and keep workflow's final check against GitHub Environment `PUBLIC_API_URL`.
- Compiled migration entrypoint can drift from `drizzle-kit` behavior → Use Drizzle's runtime migrator against the same committed migration directory and verify with e2e/smoke flows.
- Existing e2e tests mutate shared test state → Keep Docker DB isolated per run and preserve sequential file execution.
- Deploy workflow SSH steps can be brittle across VPS distributions → Keep remote commands small, environment-driven, and focused on Docker Compose operations only.
- Deploy secrets can leak into untrusted build/test code if scoped too broadly → Keep `VPS_SSH_KEY` limited to SSH validation/configuration steps and do not pass GitHub registry tokens to the VPS.

## Migration Plan

1. Add Dockerfile, `.dockerignore`, runtime migrator, Compose files, scripts, workflows, and docs.
2. Validate locally with lint/typecheck/unit tests, Docker-backed API e2e, API image build, and API image smoke test.
3. Configure GitHub Environment `staging` using `deploy/github-environment.staging.example.env`, including frontend `VITE_*` URLs, Firebase client values, VPS SSH settings, `PUBLIC_API_URL=https://gitiempo-api.itsua.dev`, and deploy path `/root/gitiempo`.
4. Create the VPS runtime `.env` from `deploy/api/.env.example`, ensuring `APP_URL=https://gitiempo-api.itsua.dev` and `DATABASE_URL` matches `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD`.
5. Configure external staging nginx to terminate HTTPS for `gitiempo-api.itsua.dev` and proxy to `127.0.0.1:3000`.
6. Run the API staging deploy workflow manually before relying on automatic staging branch deploys.
7. After API staging is healthy, deploy frontend staging so `VITE_API_BASE_URL` points at the dedicated API hostname.
8. Review deployment, testing, ADR, and README documentation for stale future-tense or ingress assumptions before considering the change complete.

Rollback uses the deploy workflow with a previous GHCR image tag. Migrations are not automatically reversible; any schema rollback requires an explicit migration plan before production use. Emergency image rollback can set `run_migrations=false` only when the target image is compatible with the current database schema.

## Open Questions

- Should production later use `NODE_ENV=production` with a separate GitHub Environment approval gate in the same workflow, or should production deploy get a separate workflow?
- Should the optional staging nginx example live under `deploy/api/` or in documentation only?
