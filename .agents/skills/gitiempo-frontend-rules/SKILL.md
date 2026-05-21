---
name: gitiempo-frontend-rules
description: Project-specific frontend rules for GiTiempo web apps. Use when building or refactoring UI in apps/user-web, apps/admin-web, or shared frontend theme code in packages/web-config.
license: MIT
metadata:
  author: OpenCode
  version: "1.5.0"
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
- Inspect the approved `.pen` screen before editing implementation files for any UI task.
- Derive a concrete parity checklist from the approved design before coding: visible states, required fields, field order, actions, spacing, radii, typography, and responsive structure.
- If the task changes shared browser/runtime helpers or reusable Vue components across both SPAs, read `packages/web-shared/AGENTS.md` too.
- Combine with the generic `tailwind-design-system` skill only for reusable Tailwind v4 patterns that do not conflict with these project rules.

## Design Parity Workflow

- Desktop UI MUST match the approved `.pen` design exactly for structure, field presence, field ordering, spacing, radii, typography, alignment, and action layout unless a documented exception applies.
- Treat the approved `.pen` as an implementation checklist, not just visual inspiration.
- Before marking a UI task complete, perform a final design parity review against the approved `.pen` and identify any remaining deltas explicitly.
- Mobile can adapt layout for breakpoint constraints, but the same state model, information hierarchy, and design-token language must still hold.

## Responsive Record-List Workflow

- For record-list surfaces that already use a documented desktop table, preserve that desktop/tablet table branch and switch to stacked mobile cards only below `640px`.
- Use the shared `useIsMobileViewport` helper for the mobile breakpoint check when the task needs distinct desktop/mobile markup branches.
- Prefer the shared `MobileRecordCard` only as a neutral card shell for mobile record rows. Keep record-specific fields, row states, and action behavior app-local.
- Preserve row/card parity: mobile cards must expose the same meaningful fields, highlight states, and action affordances as the corresponding desktop rows unless the active spec says otherwise.
- Do not introduce PrimeVue `responsiveLayout` or another parallel responsive-table convention for surfaces that follow the admin/user record-list pattern.
- Do not replace desktop tables with cards on tablet or desktop unless the docs or active spec explicitly change the surface model.

## PrimeVue Exception Protocol

- The only acceptable reason to deviate from the approved `.pen` design is a conflict with required PrimeVue component behavior, accessibility semantics, or stable component structure.
- When a PrimeVue conflict exists, preserve the design intent as closely as possible: same information architecture, same state model, same visual hierarchy, and same token-based styling.
- Do not replace a standard PrimeVue surface with custom markup only to chase pixel-perfect parity unless the user explicitly approves that tradeoff.
- Any PrimeVue-driven deviation MUST be called out in the final review with three parts: expected design, PrimeVue constraint, and implemented compromise.

## Reuse Detection Workflow

- Before creating or leaving new page-local markup, search for equivalent or near-equivalent components in `packages/web-shared/src/components`, sibling route views in the same app, and the other SPA when relevant.
- This reusable-pattern search is required for page headers, section headers, card shells, status/action panels, empty states, loading states, request-error blocks, and settings/profile form sections.
- If the same UI block already exists in two stable call sites, extract or reuse it instead of duplicating it.
- If docs define a pattern as shared across pages or apps, treat it as an extraction candidate even if only one concrete implementation currently exists.
- Prefer extracting the smallest stable leaf. Example: a shared page header component is a good candidate before extracting an entire route section.
- When a single component renders multiple documented states of the same surface, do not duplicate the same card chrome, heading block, and action-row skeleton across many `v-if` branches unless the structure is materially different. Prefer a small local primitive or state-config-driven render shape so copy-paste drift cannot accumulate.
- For adaptive record-list work, look for the smallest shared leaf first: viewport helper, neutral card shell, row action primitive, or card skeleton. Do not move product-specific row markup into `packages/web-shared` just to force reuse.

## Critical Rules

- Do not create a new app-local or package-local HTTP client by copying request helpers from another frontend file. If a change needs the same fetch-boundary behavior as an existing client, extend or extract the shared helper instead of creating a third variant.
- If an existing shared or app-local domain client already owns an endpoint family, extend that client instead of creating a second overlapping client for the same resource boundary.
- When extracting a shared browser/runtime helper, place it under a neutral package path that matches its actual ownership. Do not keep a non-auth helper under an auth namespace just because the first call site came from auth code.
- Do not land a new shared transport helper while sibling frontend clients keep their own copies of the same request URL, error parsing, or JSON request logic. Either migrate the affected siblings to the shared leaf in the same change, or keep the helper local until the shared consolidation is actually done.
- Route views and full-page feature components must not become mixed orchestration + UI "god components". When a page owns async fetching, timers, form validation, and multiple UI sections, keep the route view thin and move stateful behavior into a focused composable or smaller feature components.
- Do not merge unrelated page sections into one broad composable just because they share a route. Separate composables should remain aligned to concrete feature surfaces or endpoint lifecycles such as identity form, GitHub connection, or filter state.
- Do not wrap a composable result in `reactive(...)` only to change template ergonomics. Pick one state representation per feature surface and keep it consistent between component code, tests, and template usage.
- Empty state and error state are separate product states. Never render "no data" messaging after a failed fetch just because the local collection is empty; persist and render request errors distinctly.
- Do not mark a frontend task complete when only transport/client tests exist for a change whose main risk is page or composable behavior. Stateful UI logic such as CTA mode switching, selection reset, derived status labels, and validation rules must have focused tests or remain explicitly incomplete.
- When a route view assembles multiple tested leaves such as a form surface, a stateful composable, and a destructive action, add at least one focused view-level or feature-integration test for the assembled user-visible behavior. Boundary tests and composable tests alone are not enough to prove route wiring.
- For async UI state machines, tests must cover not only the steady states but also the transition failures that return the user to a retryable state, especially for connect, reconnect, save, and destructive actions.
- When adding a new frontend fetch path, reuse the existing repository error-message shape (`message`, then `error`, then status fallback) rather than inventing a new parse order or response-handling branch.
- New or changed frontend fetch-boundary helpers must have focused tests for request path, auth headers, payload shape, response parsing, and API error propagation. Composable or page tests do not replace boundary-level coverage.
- When a frontend surface promises full-scope summaries, aggregates, focus cards, or export/table data over a paginated backend dataset, load every required page in that accepted scope before deriving the user-visible result. Do not compute week-level, filtered-scope, or all-project summaries from the first page unless the docs/spec explicitly limit the surface to preview data.
- If a backend endpoint is documented or implemented as no-content, use a no-content response shape in boundary tests instead of a convenience JSON body so mocks keep the real contract visible.
- For frontend API calls that load, mutate, or reconcile user-visible feature state, provide user-visible toast feedback for the outcome. Use success toasts for completed mutations and error toasts for failed reads or writes; inline empty/error UI can complement this but must not be the only feedback channel.
- Do not treat disabled placeholder controls as satisfying a documented interactive surface. If docs, spec, or tasks say a surface is editable, saveable, confirmable, or otherwise interactive, the shipped UI must perform that behavior or the task must remain explicitly incomplete.
- When a feature has documented loading, empty, request-error, connected/disconnected, or redirecting states, tests should exercise each user-visible state explicitly instead of inferring coverage from internal refs or a single happy-path flow.
- When a component renders different desktop and mobile DOM branches, tests must cover both viewport modes explicitly. Assert which branch renders, not just shared text content.
- For adaptive record-list tests, verify branch-specific behavior such as icon-only action accessibility, running-entry restrictions, highlighted rows/cards, and the absence of desktop table markup on mobile.
- Destructive actions that require confirmation must have tests for both accepted-success and accepted-failure paths. If cancellation keeps default PrimeVue behavior and no app logic runs on cancel, a dedicated cancel-path test is optional.
- Do not mount global PrimeVue service hosts such as `<ConfirmDialog>` or `<Toast>` inside leaf presentational components. Keep those hosts at the route, page-shell, layout, or app-shell level unless the component is itself the explicit overlay owner.
- Query-driven toast flows such as OAuth callbacks, invite accepts, or magic-link results must test both success and error query variants plus URL cleanup after handling.
- Do not stop at docs compliance if the implementation still differs from the approved `.pen` design. Check both every time.
- If docs and design conflict, docs are the source of truth. If PrimeVue prevents an exact match, keep the docs-compliant behavior and document the PrimeVue-specific compromise.
- Shared extraction is not limited to code that is already duplicated. When docs define a repeated standard pattern and the component contract is already small and stable, extract it proactively instead of waiting for a third copy.
- When docs or specs define one action as primary and another as refresh, retry, or other supporting behavior, preserve that hierarchy in the rendered button variants. Do not ship equal-weight CTA rows that make the required primary action ambiguous.
- Do not export low-level shared transport primitives such as generic JSON request helpers from a root package barrel unless they are intentionally part of the public package contract. Prefer domain clients or a narrow explicit subpath so future features do not bypass app-local/client ownership boundaries.
- For time-based or event-driven UI state, ensure rendered output depends on the reactive source that is actually updated. Do not update a ticking ref, timer, or subscription state if the computed/template output bypasses that reactive value.
- When a running or locked feature state invalidates upstream selectors or filters, enforce that invariant in both places: disable the UI control and block the underlying state mutation in the composable/store action. Do not rely on the template alone to protect feature invariants.
- When the backend returns authoritative feature state such as a running timer, active assignment, or persisted selection owner, resync the dependent local selectors from that server state after initial load and after successful mutations. Do not leave stale local selection values pointing at an idle or superseded context.
- When an API rejects a user action because it conflicts with current authoritative state, surface that exact failure to the user, refresh or reload the authoritative state, keep that state rendered, and avoid clearing or mutating local form inputs as if the action had succeeded.
- Keep error state scoped to the UI/action that produced it. Do not copy one failure into multiple unrelated page-level error refs or render duplicate inline error blocks for the same failed API action; use one local inline state plus toast feedback.
- New Vue UI files should not add fresh lint warning debt. If lint reports auto-fixable class ordering, attribute ordering, or formatting warnings for newly added/rewritten Vue markup, fix them before marking the task complete.
- Do not mark a UI task complete unless design parity review, PrimeVue exception review, and reusable-pattern review have all been completed in addition to the usual verification.
- Do not mark a spec-driven frontend change complete when any behavior required by the active spec remains a static or disabled placeholder. Narrow the spec/task first or keep the task unchecked until the behavior ships.

## Verification

- `pnpm --filter user-web lint && pnpm --filter user-web typecheck`
- `pnpm --filter admin-web lint && pnpm --filter admin-web typecheck`
- If shared frontend code changes, run both app verifications.
- If a spec-driven frontend change touches shared auth/session/runtime leaves, require `pnpm --filter user-web test` and `pnpm --filter admin-web test` before marking the task complete.
- If an OpenSpec or task checklist covers a change that touches shared frontend or shared auth/runtime code, the checklist must explicitly include the cross-app verification scope instead of implying single-app verification.
