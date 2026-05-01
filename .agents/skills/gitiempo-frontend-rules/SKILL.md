---
name: gitiempo-frontend-rules
description: Project-specific frontend rules for GiTiempo web apps. Use when building or refactoring UI in apps/user-web, apps/admin-web, or shared frontend theme code in packages/web-config.
license: MIT
metadata:
  author: OpenCode
  version: "1.2.0"
---

# GiTiempo Frontend Rules

Project-specific frontend rules for GiTiempo.

Use this skill when:

- building or refactoring UI in `apps/user-web`
- building or refactoring UI in `apps/admin-web`
- changing shared frontend theme/bootstrap code in `packages/web-config`
- extracting or refactoring shared frontend code across `apps/user-web` and `apps/admin-web`
- implementing PrimeVue theming, Tailwind tokens, layout, dialogs, forms, tables, or accessibility behavior

## Scope

- Framework context: Vue apps using Tailwind CSS v4 and PrimeVue v4 styled mode.
- Shared frontend package: `packages/web-config`.
- Shared browser/runtime and shared Vue package: `packages/web-shared`.
- User SPA rules: `apps/user-web/AGENTS.md`.
- Admin SPA rules: `apps/admin-web/AGENTS.md`.

## Source Of Truth

- `docs/ui/INDEX.md`
- nearest app `AGENTS.md`
- `packages/web-shared/AGENTS.md` when changing shared frontend UI or browser/runtime leaves

## Repo Paths

- Shared tokens: `packages/web-config/src/styles/tokens.css`
- Shared PrimeVue preset: `packages/web-config/src/theme/primevue.ts`
- Shared frontend package notes: `packages/web-shared/AGENTS.md`
- User app bootstrap: `apps/user-web/src/main.ts`
- Admin app bootstrap: `apps/admin-web/src/main.ts`
- User app CSS entry: `apps/user-web/src/assets/main.css`
- Admin app CSS entry: `apps/admin-web/src/assets/main.css`

## How To Use

- Read `docs/ui/INDEX.md` first, then the smallest relevant `docs/ui/*` section files.
- Read the nearest app `AGENTS.md` file for app-local rules.
- If the task changes shared browser/runtime helpers or reusable Vue components across both SPAs, read `packages/web-shared/AGENTS.md` too.
- Combine with the generic `tailwind-design-system` skill only for reusable Tailwind v4 patterns that do not conflict with these project rules.

## Critical Rules

- Do not create a new app-local or package-local HTTP client by copying request helpers from another frontend file. If a change needs the same fetch-boundary behavior as an existing client, extend or extract the shared helper instead of creating a third variant.
- Route views and full-page feature components must not become mixed orchestration + UI "god components". When a page owns async fetching, timers, form validation, and multiple UI sections, keep the route view thin and move stateful behavior into a focused composable or smaller feature components.
- Empty state and error state are separate product states. Never render "no data" messaging after a failed fetch just because the local collection is empty; persist and render request errors distinctly.
- Do not mark a frontend task complete when only transport/client tests exist for a change whose main risk is page or composable behavior. Stateful UI logic such as CTA mode switching, selection reset, derived status labels, and validation rules must have focused tests or remain explicitly incomplete.
- When adding a new frontend fetch path, reuse the existing repository error-message shape (`message`, then `error`, then status fallback) rather than inventing a new parse order or response-handling branch.

## Verification

- `pnpm --filter user-web lint && pnpm --filter user-web typecheck`
- `pnpm --filter admin-web lint && pnpm --filter admin-web typecheck`
- If shared frontend code changes, run both app verifications.
