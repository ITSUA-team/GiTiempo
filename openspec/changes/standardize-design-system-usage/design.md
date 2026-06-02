## Context

GiTiempo's two web SPAs use Vue 3, PrimeVue v4 styled mode, Tailwind CSS v4, and shared frontend theme assets from `packages/web-config`. The active UI source of truth already defines semantic Tailwind tokens in `docs/ui/setup.md`, component conventions in `docs/ui/components.md`, shared interaction patterns in `docs/ui/patterns.md`, and accessibility constraints in `docs/ui/accessibility.md`.

The implementation guardrails are spread across docs, app `AGENTS.md` files, and existing OpenSpec capabilities. The current specs mention token-based styling and PrimeVue conventions, but they do not fully capture the expected hierarchy: shared preset first, PrimeVue component first, `pt` for instance customization, token utilities for project styling, no `!important` or deep selectors for normal styling fixes, and small shared Vue leaves for repeated documented UI patterns.

This change is frontend-only. It affects `apps/user-web`, `apps/admin-web`, `packages/web-config`, and `packages/web-shared`. No backend, database, OpenAPI, auth, or shared API contract coordination is required.

## Goals / Non-Goals

**Goals:**

- Make design-system usage testable through OpenSpec requirements instead of relying only on prose guidance.
- Standardize standard SPA UI on PrimeVue components when PrimeVue has an equivalent.
- Standardize project-specific styling on shared semantic token utilities and the shared PrimeVue preset.
- Make PrimeVue overrides predictable by preferring preset tokens, then component `pt` overrides, before any local wrapper styling.
- Remove normal dependency on `!important` Tailwind utilities, deep selectors, raw hex values in markup, and bespoke controls that duplicate PrimeVue behavior.
- Clarify shared component extraction boundaries for repeated page headers, card shells, section headers, table chrome, loading, empty, and request-error surfaces.
- Preserve the Chrome extension as Tailwind-only and independent from SPA runtime packages.

**Non-Goals:**

- No visual redesign or approved `.pen` screen update.
- No dark-mode work; dark mode remains disabled for MVP.
- No backend endpoint, database, seed, migration, OpenAPI, or shared API contract changes.
- No full-shell, router, store, route map, or route-page extraction into `packages/web-shared`.
- No requirement to introduce a new lint dependency or automated codemod before cleanup can begin.
- No migration of the Chrome extension to PrimeVue, Vue Router, Pinia, or SPA bootstrap code.

## Decisions

1. Modify existing frontend capabilities instead of adding a new design-system capability.

   The existing `components`, `frontend-shared-leaves`, and `layout` specs already own this domain. The change tightens those contracts rather than creating a parallel source of truth.

   Alternative considered: add a new `design-system-usage` capability. Rejected because it would overlap with `components` and make future UI changes check two specs for the same rule.

2. Keep `packages/web-config` as the shared token and PrimeVue preset boundary.

   Tailwind v4 tokens remain in `packages/web-config/src/styles/tokens.css`, and PrimeVue semantic tokens remain in `packages/web-config/src/theme/primevue.ts`. When brand, surface, radius, or shadow values change, those files and the matching `docs/ui/*` guidance must stay aligned.

   Alternative considered: rely only on PrimeVue's generated CSS variables or Tailwind's default palette. Rejected because the repo already exposes project semantic utilities such as `bg-brand`, `text-text-muted`, `border-divider`, `rounded-lg`, and `shadow-card`, and approved designs are written against those tokens.

3. Use PrimeVue equivalents for standard SPA UI.

   Standard buttons, inputs, textareas, selects, date pickers, auto-completes, checkboxes, tables, paginators, tags, badges, avatars, dialogs, confirmation dialogs, toasts, skeletons, and spinners should use PrimeVue. Custom raw controls are reserved for surfaces with no PrimeVue equivalent, approved bespoke controls, or the Chrome extension.

   Alternative considered: allow raw HTML controls as long as token classes match. Rejected because it duplicates accessibility, state, loading, keyboard, and theming behavior that PrimeVue already provides.

4. Use a styling precedence order: shared preset, `pt`, then local wrapper classes.

   Broad brand and component styling belongs in the shared PrimeVue preset. Instance-specific DOM customization uses component `pt` keys verified from PrimeVue documentation. PT values may be strings, objects, or functions returning strings/objects with Vue-compatible `class` and `style` bindings. Local wrapper classes can handle layout around a component, but they should not fight PrimeVue internals.

   Alternative considered: patch PrimeVue internals with deep selectors or `!important` utilities. Rejected because those fixes are brittle, bypass the configured CSS layer model, and make future component upgrades harder.

5. Keep shared Vue extraction small and evidence-based.

   `packages/web-shared` may own small PrimeVue-based leaves such as page/section headers, card shells, management table chrome, stat cards, empty/error/loading blocks, and neutral mobile record cards when the docs already define them as shared patterns or at least two stable call sites prove the same structure. Product-specific copy, data loading, route composition, stores, router behavior, and shell orchestration remain app-local.

   Alternative considered: create broad shared page or shell abstractions. Rejected because user/admin pages differ in product behavior and app-level ownership is already required by the nearest `AGENTS.md` files.

6. Treat accessibility as part of the design-system contract.

   PrimeVue-generated roles, `aria-*`, `tabindex`, and IDs must be preserved when using `pt`. Icon-only actions need accessible labels and tooltips where documented. Custom non-PrimeVue interactions must carry keyboard behavior and visible focus indicators.

   Alternative considered: handle accessibility as a separate follow-up cleanup. Rejected because design-system standardization without accessibility preservation can regress keyboard and screen-reader behavior.

## Planned File Groups

- `apps/user-web`: cleanup of touched route views, page components, and tests to replace raw controls/values with PrimeVue and token-backed conventions.
- `apps/admin-web`: same cleanup for admin route views, management tables, filters, dialogs, settings forms, and tests.
- `packages/web-config`: shared PrimeVue preset and Tailwind token updates when cleanup reveals a broad styling rule belongs globally.
- `packages/web-shared`: small PrimeVue-based leaves and browser-only shared UI helpers with stable props/emits contracts.
- `docs/ui/*`: source-of-truth updates only when the documented design-system rule changes, not for one-off implementation details.

## Risks / Trade-offs

- PrimeVue may not expose the exact DOM hook needed for a design detail -> Verify PT keys from current PrimeVue docs and prefer global preset/token fixes before accepting a documented PrimeVue-only compromise.
- Token and preset values can drift -> Keep `tokens.css`, `primevue.ts`, and `docs/ui/*` aligned when changing shared values.
- Over-extraction can hide product-specific behavior -> Extract only small leaves with stable props/emits and keep route/page orchestration app-local.
- A strict cleanup could become too broad for one implementation pass -> Implement by vertical slices and prioritize touched or duplicated surfaces first.
- Removing `!important` can reveal CSS layer/source-registration issues -> Fix PrimeVue `cssLayer` ordering, shared Tailwind `@source` registration, or preset tokens rather than adding stronger selectors.
- Replacing raw controls can subtly change keyboard or form behavior -> Add focused component/view tests for changed forms, dialogs, tables, and action states.

## Migration Plan

1. Audit `apps/user-web/src`, `apps/admin-web/src`, and `packages/web-shared/src` for raw standard controls, raw visual values, `!important` utilities, deep selectors, and duplicated documented UI surfaces.
2. Fix shared prerequisites first: Tailwind source registration, `packages/web-config` token/preset gaps, and any reusable `packages/web-shared` leaves needed by both SPAs.
3. Convert one UI surface at a time to PrimeVue equivalents and token-backed classes, preserving existing behavior and approved design parity.
4. Move only stable repeated leaves into `packages/web-shared`, with app-local data loading/actions passed through props, slots, and emits.
5. Update or add focused tests for behavior changed by component replacement, especially forms, dialogs, row actions, loading/error states, and accessibility labels.
6. Verify affected apps with lint and typecheck; if shared frontend packages changed, verify both web apps.

Rollback is frontend-only: revert the affected UI/component/theme changes. No persisted data or backend migration is involved.

## Open Questions

- None blocking. Any design mismatch caused solely by PrimeVue limitations should be documented in the implementation final review as required by the app `AGENTS.md` files.
