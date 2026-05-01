---
name: gitiempo-frontend-rules
description: Project-specific frontend rules for GiTiempo web apps. Use when building or refactoring UI in apps/user-web, apps/admin-web, or shared frontend theme code in packages/web-config.
license: MIT
metadata:
  author: OpenCode
  version: "1.3.0"
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
- When extracting a shared browser/runtime helper, place it under a neutral package path that matches its actual ownership. Do not keep a non-auth helper under an auth namespace just because the first call site came from auth code.
- Do not land a new shared transport helper while sibling frontend clients keep their own copies of the same request URL, error parsing, or JSON request logic. Either migrate the affected siblings to the shared leaf in the same change, or keep the helper local until the shared consolidation is actually done.
- Route views and full-page feature components must not become mixed orchestration + UI "god components". When a page owns async fetching, timers, form validation, and multiple UI sections, keep the route view thin and move stateful behavior into a focused composable or smaller feature components.
- Do not wrap a composable result in `reactive(...)` only to change template ergonomics. Pick one state representation per feature surface and keep it consistent between component code, tests, and template usage.
- Empty state and error state are separate product states. Never render "no data" messaging after a failed fetch just because the local collection is empty; persist and render request errors distinctly.
- Do not mark a frontend task complete when only transport/client tests exist for a change whose main risk is page or composable behavior. Stateful UI logic such as CTA mode switching, selection reset, derived status labels, and validation rules must have focused tests or remain explicitly incomplete.
- When adding a new frontend fetch path, reuse the existing repository error-message shape (`message`, then `error`, then status fallback) rather than inventing a new parse order or response-handling branch.
- New or changed frontend fetch-boundary helpers must have focused tests for request path, auth headers, payload shape, response parsing, and API error propagation. Composable or page tests do not replace boundary-level coverage.
- For frontend API calls that load, mutate, or reconcile user-visible feature state, provide user-visible toast feedback for the outcome. Use success toasts for completed mutations and error toasts for failed reads or writes; inline empty/error UI can complement this but must not be the only feedback channel.
- For time-based or event-driven UI state, ensure rendered output depends on the reactive source that is actually updated. Do not update a ticking ref, timer, or subscription state if the computed/template output bypasses that reactive value.
- When a running or locked feature state invalidates upstream selectors or filters, enforce that invariant in both places: disable the UI control and block the underlying state mutation in the composable/store action. Do not rely on the template alone to protect feature invariants.
- When the backend returns authoritative feature state such as a running timer, active assignment, or persisted selection owner, resync the dependent local selectors from that server state after initial load and after successful mutations. Do not leave stale local selection values pointing at an idle or superseded context.
- When an API rejects a user action because it conflicts with current authoritative state, surface that exact failure to the user, keep the authoritative state rendered, and avoid clearing or mutating local form inputs as if the action had succeeded.

## Verification

- `pnpm --filter user-web lint && pnpm --filter user-web typecheck`
- `pnpm --filter admin-web lint && pnpm --filter admin-web typecheck`
- If shared frontend code changes, run both app verifications.
