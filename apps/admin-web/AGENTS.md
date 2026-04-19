# Admin Web Agent Notes

## Scope
- Use this file for `apps/admin-web` only.
- If the task changes API payloads or validators, inspect `../../packages/shared/src/contracts/*` too.
- If the task changes shared theme or tokens, inspect `../../packages/web-config/src/*` too.

## Source Of Truth
- App bootstrap is in `src/main.ts`.
- Shared PrimeVue config comes from `@gitiempo/web-config/theme`.
- Shared CSS tokens are imported in `src/assets/main.css` from `@gitiempo/web-config/styles/tokens.css`.
- Vite alias `@` points to `./src`.

## Commands
- Focused commands: `pnpm --filter admin-web dev|build|lint|typecheck|test`.
- Prefer root Turbo commands if the task also changes shared packages.

## Verification
- Frontend-only changes: `pnpm --filter admin-web lint && pnpm --filter admin-web typecheck`.
- `test` is `vitest run --passWithNoTests`; treat it as a weak signal, not meaningful coverage.
