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
- `/users/me` is still a dev placeholder backed by the first seeded user ordered by email ascending; frontend assumptions and API tests depend on that.
- `pnpm --filter @gitiempo/api lint` auto-fixes and follows the app-local Prettier config with single quotes.
