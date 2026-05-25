# Chrome Extension Agent Notes

## Scope

- Use this file for `apps/chrome-ext` only.
- Keep the extension runtime independent from the Vue SPAs.

## Source Of Truth

- UI behavior and visual requirements: `../../docs/ui/INDEX.md`, `../../docs/ui/chrome-ext.md`, and the approved `../../GITiempo.pen` extension frames.
- Shared contract schemas: `../../packages/shared/src/contracts/*`.
- Shared token CSS import path: `@gitiempo/web-config/styles/tokens.css`.

## Constraints

- Manifest V3 only.
- Tailwind-only UI. Do not import PrimeVue, Vue Router, Pinia, or SPA bootstrap modules.
- Keep browser-extension storage, messaging, and runtime orchestration extension-owned.
- Shared imports are limited to browser-safe contract and token surfaces.

## Verification

- Run `pnpm --filter chrome-ext typecheck`.
- Run `pnpm --filter chrome-ext test`.
- Run `pnpm --filter chrome-ext build`.
- If shared frontend packages change, verify the affected SPA commands required by the repo rules too.
