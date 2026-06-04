## 1. Audit And Scope

- [ ] 1.1 Read `docs/ui/INDEX.md`, the smallest relevant `docs/ui/*` files, app `AGENTS.md` files, and approved `.pen` screens for each UI surface selected for cleanup.
- [ ] 1.2 Audit `apps/user-web/src`, `apps/admin-web/src`, and `packages/web-shared/src` for raw standard controls, raw visual values, `!important` utilities, deep selectors, and duplicated documented UI surfaces.
- [ ] 1.3 Identify which findings are in scope for this implementation pass and group them by `apps/user-web`, `apps/admin-web`, `packages/web-config`, and `packages/web-shared`.

## 2. Shared Theme And Component Prerequisites

- [ ] 2.1 Verify both web apps import shared Tailwind tokens and register `packages/web-shared/src` with Tailwind `@source` so shared SFC and `pt` classes are generated.
- [ ] 2.2 Update `packages/web-config` token or PrimeVue preset gaps when multiple instances need the same brand, surface, focus, border, radius, shadow, or component-token behavior.
- [ ] 2.3 Replace any broad app-local PrimeVue internal styling duplication with shared preset rules when the behavior is common across both SPAs.

## 3. Shared Vue Leaves

- [ ] 3.1 Review repeated page headers, section headers, card shells, stat cards, management table chrome, loading blocks, empty states, request-error states, and mobile record-card shells for shared-leaf extraction.
- [ ] 3.2 Extract only stable, small PrimeVue-based leaves into `packages/web-shared` with focused props, slots, and emits while keeping route orchestration and app actions local.
- [ ] 3.3 Migrate consuming app surfaces to extracted shared leaves without changing product copy, route ownership, API loading, or action behavior.
- [ ] 3.4 Keep `apps/chrome-ext` Tailwind-only; reuse only extension-safe token styling or contract-safe helpers and do not import PrimeVue or SPA runtime modules.

## 4. User-Web Cleanup

- [ ] 4.1 Replace in-scope raw buttons, inputs, textareas, selects, date/time controls, checkboxes, tables, paginators, tags, avatars, dialogs, confirmations, toasts, and loading surfaces with PrimeVue equivalents where available.
- [ ] 4.2 Replace in-scope raw hex values and one-off visual classes with documented semantic token utilities or shared PrimeVue preset tokens.
- [ ] 4.3 Replace in-scope `!important` utilities and deep selectors with shared preset changes, documented component `pt` overrides, CSS layer fixes, or Tailwind source-registration fixes.
- [ ] 4.4 Preserve user-web approved design parity, mobile behavior, keyboard behavior, accessible labels, loading, empty, and request-error states for each changed surface.

## 5. Admin-Web Cleanup

- [ ] 5.1 Replace in-scope raw buttons, inputs, textareas, selects, date/time controls, checkboxes, tables, paginators, tags, avatars, dialogs, confirmations, toasts, and loading surfaces with PrimeVue equivalents where available.
- [ ] 5.2 Replace in-scope raw hex values and one-off visual classes with documented semantic token utilities or shared PrimeVue preset tokens.
- [ ] 5.3 Replace in-scope `!important` utilities and deep selectors with shared preset changes, documented component `pt` overrides, CSS layer fixes, or Tailwind source-registration fixes.
- [ ] 5.4 Preserve admin-web approved design parity, responsive behavior, keyboard behavior, accessible labels, loading, empty, and request-error states for each changed surface.

## 6. Tests And Verification

- [ ] 6.1 Add or update focused component/view tests for changed forms, dialogs, row actions, loading states, empty states, request-error states, and accessible labels.
- [ ] 6.2 Run `pnpm --filter user-web lint && pnpm --filter user-web typecheck`.
- [ ] 6.3 Run `pnpm --filter admin-web lint && pnpm --filter admin-web typecheck`.
- [ ] 6.4 If `packages/web-config` or `packages/web-shared` changed, verify both web apps and run affected frontend tests.
- [ ] 6.5 Document any PrimeVue-only design compromises in the final implementation summary.
