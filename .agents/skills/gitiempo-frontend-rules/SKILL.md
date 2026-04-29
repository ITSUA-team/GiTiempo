---
name: gitiempo-frontend-rules
description: Project-specific frontend rules for GiTiempo web apps. Use when building or refactoring UI in apps/user-web, apps/admin-web, or shared frontend theme code in packages/web-config.
license: MIT
metadata:
  author: OpenCode
  version: "1.1.0"
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
- User SPA rules: `apps/user-web/AGENTS.md`.
- Admin SPA rules: `apps/admin-web/AGENTS.md`.

## Shared Frontend Leaves

- Share only proven-identical browser/runtime leaves across `user-web` and `admin-web`.
- Good extraction candidates: auth HTTP clients, current-user clients, refresh-token storage helpers, and counterpart-workspace link helpers.
- Keep `@gitiempo/shared` contract-focused and backend-safe.
- Keep `@gitiempo/web-config` theme/bootstrap-focused.
- Keep app-local ownership of `stores/auth.ts`, `router/index.ts`, route maps, route-level views, and product-specific login/shell composition unless there are stable repeated call sites and an approved design reason to share more.

## Auth And Router Regression Coverage

- For frontend auth or router changes, protect normalized session behavior, not just route presence.
- Cover bootstrap restore, missing/invalid refresh token fallback, email/password login, Google login, failed login clearing stale state, logout cleanup, anonymous protected-route redirect, authenticated guest-route redirect, valid preserved redirect, and invalid redirect fallback.
- If a change touches shared auth HTTP leaves or current-user clients, add fetch-boundary tests for request path, headers, payload shape, response parsing, and error propagation.
- Do not rely only on lint/typecheck for auth or routing changes.

## Core Decisions

- Prefer PrimeVue components for app UI.
- Use Tailwind token utilities such as `bg-brand` and `text-text-muted`, not raw hex values in markup.
- Apply brand styling through the global PrimeVue preset first and `pt` overrides second.
- If a PrimeVue style override fails, fix tokens or CSS layer order before adding deep selectors.
- Dark mode is disabled for MVP.
- Mobile is required, but desktop-first polish is acceptable for MVP.
- Before implementing frontend UI, inspect the matching `docs/ui/*` guidance first, then inspect the relevant approved design, usually from the `.pen` file.
- Desktop implementations should be pixel-perfect to the approved design unless the user explicitly asks for a looser interpretation.
- If the docs and design conflict, follow the docs as the source of truth.

## Source Of Truth

- `docs/ui/INDEX.md`
- `docs/ui/setup.md`
- `docs/ui/components.md`
- `docs/ui/layout.md`
- `docs/ui/patterns.md`
- `docs/ui/accessibility.md`

## Repo Paths

- Shared tokens: `packages/web-config/src/styles/tokens.css`
- Shared PrimeVue preset: `packages/web-config/src/theme/primevue.ts`
- User app bootstrap: `apps/user-web/src/main.ts`
- Admin app bootstrap: `apps/admin-web/src/main.ts`
- User app CSS entry: `apps/user-web/src/assets/main.css`
- Admin app CSS entry: `apps/admin-web/src/assets/main.css`

## How To Use

- Read `AGENTS.md` in this skill for the full rulebook.
- Use `docs/ui/pages-user.md` or `docs/ui/pages-admin.md` only when the task is screen-specific.
- Combine with the generic `tailwind-design-system` skill only for reusable Tailwind v4 patterns that do not conflict with these project rules.

## Verification

- `pnpm --filter user-web lint && pnpm --filter user-web typecheck`
- `pnpm --filter admin-web lint && pnpm --filter admin-web typecheck`
- If shared frontend code changes, run both app verifications.
