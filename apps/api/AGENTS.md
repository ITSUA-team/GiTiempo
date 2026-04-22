# API Agent Notes

## Scope
- Use this file for NestJS backend, DB, migrations, seed scripts, OpenAPI, and contract-facing API work in `apps/api`.
- If a backend change affects request or response shapes, inspect `../../packages/shared/src/contracts/*` too and regenerate `../../packages/shared/openapi.json`.

## Source Of Truth
- Runtime entrypoints: `src/main.ts` and `src/app.module.ts`.
- DB wiring: `src/db/*` and `drizzle.config.ts`.
- Env source of truth: `src/config/env.validation.ts`. `apps/api/.env.example` contains future vars too; only validated keys are actually wired.
- API DTOs wrap shared Zod contracts with `createZodDto`.

## Commands
- Focused commands: `pnpm --filter @gitiempo/api dev|lint|typecheck|test|test:e2e|db:migrate|db:seed|openapi:export`.
- If you run API scripts directly with `--filter`, build shared first with `pnpm --filter @gitiempo/shared build`.

## Verification
- API-only changes: `pnpm --filter @gitiempo/api lint && pnpm --filter @gitiempo/api typecheck && pnpm --filter @gitiempo/api test`.
- E2E uses a real Postgres DB, loads `apps/api/.env`, and expects `pnpm --filter @gitiempo/api db:migrate` then `pnpm --filter @gitiempo/api db:seed` first.
- `vitest.e2e.config.ts` disables file parallelism; do not assume e2e suites are isolated per file.
- After contract or DTO changes, run `pnpm openapi:export`.

## Gotchas
- `/users/me` resolves the authenticated subject from the verified JWT access token (`@CurrentUser('sub')`) and reads the matching user row; if the user was deleted, the route returns 401, not 404. There is no longer a "first seeded user by email asc" placeholder.
- `NODE_ENV=test` switches the `FIREBASE_ADMIN` provider to `FakeFirebaseAdminService`, which only accepts tokens shaped `test:<uid>:<email>[:<name>]`. The seed creates a user with `firebase_uid=admin-uid` so the canonical fake token is `test:admin-uid:admin@example.com`. `package.json`'s `test:e2e` forces `NODE_ENV=test` on the shell so the fake is used regardless of what `.env` sets.
- Required env for real Firebase: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (literal `\n` is normalized to real newlines in `env.validation.ts`). They are validated-optional only when `NODE_ENV=test`.
- JWT env: `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must be ≥32 chars. `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` accept duration strings (`15m`, `7d`, `3600s`, or bare seconds).
- Global `JwtAuthGuard` protects every route by default. Public endpoints (commons health, `/auth/login`, `/auth/refresh`) must be marked with `@SkipAuth()`. `/auth/logout` stays authenticated so only the session owner can terminate it.
- `ThrottlerGuard` is wired globally via `APP_GUARD` with an explicit `useFactory`; do not replace it with `useClass` — `@nestjs/throttler`'s published metadata can't always resolve `Reflector` through reflect-metadata in this workspace.
- `AllExceptionsFilter` duck-types `HttpException` (checks `getStatus`/`getResponse`) because `@nestjs/throttler` and `apps/api` can resolve different `@nestjs/common` instances, making `instanceof HttpException` unreliable for `ThrottlerException`.
- `pnpm openapi:export` currently runs through `tsx` (esbuild), which does NOT emit `design:paramtypes` decorator metadata. Any provider with a mid-list `@Inject(...)` on a typed param (e.g. `AuthService`) breaks Nest DI under this command. Unit/e2e/`nest build` work because they go through SWC with `decoratorMetadata: true` (`apps/api/.swcrc`). Tracked separately for a tooling fix; until then regenerating `packages/shared/openapi.json` requires the build-based workflow, not `pnpm openapi:export`.
- `pnpm --filter @gitiempo/api lint` auto-fixes and follows the app-local Prettier config with single quotes.
