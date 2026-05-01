# Admin Web Agent Notes

## Scope

- Use this file for `apps/admin-web` only.
- If the task changes API payloads or validators, inspect `../../packages/shared/src/contracts/*` too.
- If the task changes shared theme or tokens, inspect `../../packages/web-config/src/*` too.

## Source Of Truth

- App bootstrap is in `src/main.ts`.
- Shared PrimeVue config comes from `@gitiempo/web-config/theme`.
- Shared CSS tokens are imported in `src/assets/main.css` from `@gitiempo/web-config/styles/tokens.css`.
- For any UI task, follow `../../docs/ui/INDEX.md` first, then read only the smallest relevant section files it routes you to.
- Use PrimeVue components for standard app UI controls instead of raw buttons, inputs, tags, avatars, dialogs, tables, selectors, or loading widgets when PrimeVue has an equivalent.
- Use Zod schemas for shared or contract-facing form/API validation. Put contract schemas in `../../packages/shared/src/contracts/*` and shared browser-only form schemas/helpers in `../../packages/web-shared/src/*`.
- If the task changes shared browser/runtime helpers or shared Vue components used by both SPAs, inspect `../../packages/web-shared/AGENTS.md` too.
- Shared Vue components that are reused by both web SPAs belong in `../../packages/web-shared`, while full route pages and app-specific shell/login composition stay app-local.
- Vite alias `@` points to `./src`.
- Admin auth direction must stay aligned with `apps/user-web`: Firebase Auth on the frontend, backend token exchange, refresh-token bootstrap, and logout cleanup. Do not introduce a separate auth model for `admin-web`.
- After the required UI docs, inspect the relevant approved design source. In this repo that usually means the active `.pen` file screen.
- Desktop UI implementation is expected to be pixel-perfect to the approved design: match fonts, font sizes, spacing, sizing, radii, alignment, and component structure unless the user explicitly asks for a deviation.
- If the docs and design conflict, the docs are the source of truth. Stop and ask only when the conflict is still ambiguous after following the docs.

## Execution Rule

- In the first progress update before frontend edits, name the `docs/ui/*` files you used for the task.

## Commands

- Focused commands: `pnpm --filter admin-web dev|build|lint|typecheck|test`.
- Prefer root Turbo commands if the task also changes shared packages.

## Verification

- Frontend-only changes: `pnpm --filter admin-web lint && pnpm --filter admin-web typecheck`.
- For auth store, router guard, login flow, or session bootstrap changes, also run `pnpm --filter admin-web test`.
- If the task changes `../../packages/web-config` or `../../packages/web-shared`, verify the matching user app too.
- `test` is focused Vitest coverage for store/router behavior. Treat it as meaningful regression protection for that layer, but not as browser-level end-to-end proof.
