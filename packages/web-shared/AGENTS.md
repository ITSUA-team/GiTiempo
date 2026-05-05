# Web Shared Agent Notes

## Scope

- Use this file for `packages/web-shared` only.
- This package is for shared browser/runtime helpers, browser-only validation, and reusable Vue components used by both `apps/user-web` and `apps/admin-web`.
- For shared Vue UI work, follow `../../docs/ui/INDEX.md` first, then inspect the minimal relevant `../../docs/ui/*` files and the app `AGENTS.md` files for every app that renders the component.

## What Belongs Here

- Shared auth HTTP helpers.
- Shared current-user client helpers.
- Shared refresh-token storage helpers.
- Shared counterpart-workspace link helpers.
- Browser-only shared Zod schemas.
- Small PrimeVue-based Vue components with stable props/emits contracts and at least two real SPA call sites.
- Small PrimeVue-based Vue components that are already defined by docs as shared cross-page or cross-app patterns, even if only one implementation exists today.

## What Stays App-Local

- `stores/auth.ts` orchestration.
- `router/index.ts` and route maps.
- Route-level views and page composition.
- Product-specific shell and login composition.
- Any abstraction that is not already proven behaviorally identical in both SPAs.

## Package Boundaries

- Keep `@gitiempo/shared` backend-safe and contract-focused. Contract-facing request and response schemas belong there.
- Keep `@gitiempo/web-config` focused on shared PrimeVue preset, tokens, and frontend bootstrap/theme wiring.
- Do not move browser/runtime frontend helpers into `@gitiempo/shared` or `@gitiempo/web-config`.
- Prefer extracting the smallest proven-identical leaf instead of forcing full-page or full-store sharing.
- A component MAY be extracted before two live call sites exist when docs already define it as a shared standard pattern, its contract is small and stable, and the extraction clearly prevents likely duplication.

## Auth And Router Regression Coverage

- When changing shared auth/session helpers, protect normalized session behavior, not just route presence.
- Cover bootstrap restore, invalid refresh-token fallback, email/password login, Google login, failed login stale-state cleanup, logout cleanup, protected-route redirect preservation, authenticated guest-route redirect, and invalid redirect fallback.
- If a change touches shared auth HTTP helpers or current-user client helpers, add fetch-boundary tests for request path, headers, payload shape, response parsing, and error propagation.
- Prefer behavior assertions over router internals or implementation traces.

## Verification

- Run `pnpm --filter user-web lint && pnpm --filter user-web typecheck`.
- Run `pnpm --filter admin-web lint && pnpm --filter admin-web typecheck`.
- If auth/session/router leaves changed, also run `pnpm --filter user-web test` and `pnpm --filter admin-web test`.

## Execution Rule

- In the first progress update before shared frontend edits, name the `docs/ui/*` files you used for the task.
