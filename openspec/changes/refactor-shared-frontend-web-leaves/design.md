## Context

`apps/user-web` and `apps/admin-web` currently duplicate several frontend auth and navigation leaves almost line-for-line: auth HTTP client helpers, current-user client helpers, refresh-token storage, workspace-link resolution, and matching auth runtime wiring. The two login pages and authenticated shells also contain smaller structurally similar UI regions, the two placeholder-page scaffolds are effectively duplicated, and the user profile page contains standard controls that should use PrimeVue. These regions are candidates for small shared PrimeVue-based components, but the products are not fully identical and should not be forced into a single large abstraction.

The nearest app guidance already requires both SPAs to stay aligned on auth direction, while `docs/TECHNICAL-REQUIREMENTS.md` treats shared frontend behavior as a product expectation across both web apps. This change is frontend-only and must not alter backend endpoints, contracts, or auth semantics.

## Goals / Non-Goals

**Goals:**
- Remove duplicated frontend leaf code that is already identical across `user-web` and `admin-web`.
- Create one shared frontend location for browser-only runtime helpers, browser-only Zod form schemas, and small reusable Vue components consumed by both SPAs.
- Convert shared or repeated standard UI blocks to PrimeVue components with token-based styling.
- Remove deprecated Zod error helper usage from shared frontend validation code.
- Keep auth behavior, redirect rules, and cross-app navigation semantics unchanged while reducing drift risk.
- Evaluate current shell/login similarity and extract only the parts with two real call sites and stable behavior.

**Non-Goals:**
- Changing backend auth, API contracts, or contract-facing shared Zod schemas unless an extracted frontend form is also an API contract.
- Forcing full store, router, shell, or login-page unification.
- Moving product-specific copy, route maps, or role-specific UX into shared code.
- Reworking theme/token ownership in `@gitiempo/web-config` beyond what is needed for shared frontend leaves.

## Decisions

### D1. Put shared browser/runtime code in a dedicated frontend package

- Introduce `@gitiempo/web-shared` as the dedicated shared frontend package for browser-only SPA code instead of overloading `@gitiempo/shared` or `@gitiempo/web-config`.
- `@gitiempo/shared` remains contract-focused and backend-safe; `@gitiempo/web-config` remains theme/bootstrap-focused.
- **Why:** auth clients, storage helpers, and small Vue UI building blocks are frontend runtime concerns, not API-contract or theme concerns.
- **Alternatives considered:**
  - Extending `@gitiempo/web-config` (rejected because it blurs theme/bootstrap ownership with runtime/auth code).
  - Extending `@gitiempo/shared` (rejected because it mixes browser-facing Vue/frontend concerns into a package also consumed by the API).

### D2. Extract only proven-identical leaf modules first

- First-wave extraction should target the duplicated low-level modules that already have matching behavior and signatures in both SPAs:
  - auth HTTP request helpers
  - current-user client helpers
  - auth runtime wiring helpers that combine Firebase sign-in/sign-out with the shared auth/current-user leaves
  - refresh-token storage helpers
  - cross-app workspace-link resolution helpers
- **Why:** these are the highest-confidence drift points and provide the largest maintainability gain with the lowest abstraction risk.
- **Alternatives considered:** extracting entire auth stores or route guards immediately (rejected because app-level orchestration still deserves local ownership).

### D3. Make `@gitiempo/web-shared` component-aware for small shared Vue components

- Shared Vue components should be introduced for the small login/shell/profile regions that are materially the same after comparing both apps, such as a shared auth sign-in form, account identity/avatar block, status tag block, or profile form field block.
- The shared package must support `.vue` source exports and typechecking so both SPAs can import shared components directly.
- Shared components must use PrimeVue for standard controls (`Button`, `InputText`, `Password`, `Tag`, `Avatar`, `Dialog`, `DataTable`, `Select`, loading components) and Tailwind token utilities for layout overrides.
- Shared components must expose explicit typed props/emits contracts and must not import app-local stores, routers, route names, or view-specific copy.
- Full-page login views and full authenticated shells remain app-local composition surfaces.
- **Why:** the two current pages are similar enough to justify reviewing component reuse, but not similar enough to justify a single monolithic shared page component.
- **Alternatives considered:** sharing the entire login page or shell component (rejected because copy, nav structure, icons, and app-specific route composition already differ).

### D3a. Use Zod at shared frontend form and API boundaries

- Contract-facing payload and response schemas remain in `@gitiempo/shared`.
- Browser-only form schemas used by both SPAs belong in `@gitiempo/web-shared` next to the shared form component or a dedicated validation module.
- Shared HTTP clients continue parsing API responses with Zod so both SPAs fail consistently on API drift.
- Login form data should be validated before it crosses the store/Firebase boundary, with validation errors surfaced through PrimeVue `invalid` state and helper text.
- Deprecated `ZodError` helpers such as `.flatten()` and `.format()` should not be used in new shared frontend code; prefer non-deprecated v4 APIs or direct issue mapping for shallow forms.
- **Why:** TypeScript types do not protect runtime form and API boundaries, and duplicating the same schema in two apps creates drift risk.

### D3b. Adopt `@primevue/forms` for shared auth forms

- Shared authentication forms in `@gitiempo/web-shared` should use `@primevue/forms` with the Zod resolver instead of a manually managed native `<form>` validation flow.
- PrimeVue field widgets remain the control surface, while `@primevue/forms` owns submit handling, field state, and validation result mapping.
- This decision applies to the shared auth sign-in form first; app-local forms can stay native until they are shared or otherwise need the same abstraction.
- **Why:** the repo wants PrimeVue-native form orchestration here, not only PrimeVue field widgets.

### D3c. Continue second-wave shared micro-component extraction

- The next shared component candidates after the auth sign-in form and shell identity block are the duplicate placeholder-page scaffold and the login hero/supporting-card micro-blocks.
- Extract these only if the user/admin variants can remain prop-driven without pushing role-specific copy or route semantics into the shared package.
- **Why:** these are the clearest remaining duplicated presentational blocks with two stable call sites.

### D3d. Extract duplicated authenticated header chrome without sharing shell orchestration

- The authenticated headers in `apps/user-web/src/components/layout/AppShell.vue` and `apps/admin-web/src/components/layout/AdminAppShell.vue` should be promoted into a shared `WorkspaceHeader` component when their structure remains identical after parameterization.
- The shared header should own only presentational chrome: the sticky top bar, product mark, product name, workspace name, counterpart workspace link, display name, avatar, and optional settings/profile action.
- Consuming app shells should continue owning auth-store reads, route names, route targets, and counterpart href resolution from `VITE_USER_APP_URL` / `VITE_ADMIN_APP_URL`.
- The shared header should accept typed props for `workspaceName`, `displayName`, `userInitials`, `counterpartHref`, `counterpartLabel`, optional product/logo labels, and an optional internal settings/profile route target.
- The missing top-right settings/profile action required by `docs/ui/layout.md` should be represented by an optional header action so `admin-web` can point to Settings and `user-web` can point to Profile if product direction approves that mapping.
- Full authenticated shells remain app-local; this extraction should not move sidebars, route maps, router views, auth stores, or environment handling into `@gitiempo/web-shared`.
- **Why:** the header is now a stable repeated shell sub-region with two concrete call sites, while the rest of the shell still contains app-specific navigation and route composition.

### D3e. Review new shared header classes for canonical Tailwind utilities

- New or touched shared header components should be checked with `suggestCanonicalClasses` before closure.
- Arbitrary utilities should be replaced with documented canonical classes when an equivalent exists, such as `rounded-[10px]` becoming `rounded-lg`.
- Keep arbitrary utilities only when no documented/canonical equivalent exists or exact design fidelity requires the arbitrary value.
- Apply this review to `WorkspaceHeader`, any retained `WorkspaceHeaderIdentity` markup, and touched header markup in both app shells.
- **Why:** shared components become design-system precedents, so they should prefer canonical token utilities over one-off arbitrary classes.

### D3f. Register shared component sources with Tailwind v4 in consuming apps

- Each SPA stylesheet that imports Tailwind should explicitly register `@gitiempo/web-shared` source files with Tailwind v4 `@source` so classes used only in shared package SFCs are generated in app CSS.
- Add the shared package source path to both `apps/user-web/src/assets/main.css` and `apps/admin-web/src/assets/main.css`.
- Prefer registering `../../../../packages/web-shared/src` rather than only `components` so future shared class-bearing helpers or PrimeVue `pt` strings are also detected.
- Document this requirement in `docs/ui/setup.md` so new shared frontend packages or moved shared components do not silently lose styles.
- **Why:** Tailwind v4 automatic source detection can miss external workspace packages; without explicit `@source`, shared components render DOM with class attributes but the corresponding utility CSS may not be emitted.

### D3g. Extract shared authenticated navigation from user-web text-only shell chrome

- The sidebar and mobile navigation regions in `apps/user-web/src/components/layout/AppShell.vue` and `apps/admin-web/src/components/layout/AdminAppShell.vue` should be promoted into a shared `WorkspaceNavigation` component when they can be parameterized without moving route names, item definitions, active-route logic, or shell composition into shared code.
- Use the current `user-web` navigation as the presentational base for both SPAs.
- The shared navigation should be text-only for both desktop/tablet sidebar and mobile bottom navigation; do not keep icon support in the shared component.
- The shared component should accept typed `items`, preserve optional per-item `to` overrides, and support shared rendering of sidebar plus mobile nav while leaving route ownership and active-state computation in the consuming shell.
- `AdminAppShell.vue` should drop Heroicon-based navigation rendering and adopt the same text-only visual language as `user-web`.
- **Why:** the nav markup is now a repeated shell leaf with two concrete call sites, but route maps and app-specific nav contents still belong to each app.

### D3h. Remove the shared header settings/profile action

- The shared authenticated header should no longer expose an optional internal settings/profile action.
- `WorkspaceHeader` should keep only the product/workspace identity block on the left and the counterpart workspace link, display name, and avatar on the right.
- Consuming shells should stop passing settings/profile route targets into the shared header.
- **Why:** the desired shared shell chrome is a simpler invariant surface, while app-specific settings/profile entry points can be handled elsewhere in each SPA.

### D3i. Add targeted Tailwind ESLint guidance for shared frontend markup

- Add `eslint-plugin-tailwindcss` rules only to the frontend Vue/TS surfaces that render shared UI: `apps/user-web/src`, `apps/admin-web/src`, and `packages/web-shared/src`.
- Start with warning-level rules that are useful without forcing broad visual churn:
  - `tailwindcss/classnames-order`
  - `tailwindcss/enforces-shorthand`
  - `tailwindcss/no-unnecessary-arbitrary-value`
- Use autofix for class ordering first, then do a small manual pass for safe canonical replacements that preserve the current design intent.
- Safe manual replacements include cases such as `h-10 w-10` to `size-10`, `gap-[6px]` to `gap-1.5`, `rounded-[10px]` to `rounded-lg`, and `text-[12px]` to `text-xs` when the resulting token matches current UI expectations.
- Keep arbitrary values such as `border-l-[3px]`, `min-h-[calc(100vh-4rem)]`, and layout-specific width constraints when the canonical Tailwind scale would change the approved layout or visual weight.
- **Why:** the shared components are becoming the precedent for frontend shell and auth markup, so lint should surface non-canonical Tailwind usage early while still allowing exact design fidelity where needed.

### D4. Preserve app-local orchestration boundaries

- `stores/auth.ts`, `router/index.ts`, route maps, and app-specific pages remain local even when they consume shared leaf modules.
- **Why:** this preserves debuggability and keeps each SPA free to evolve product behavior without coupling all auth/router decisions together.
- **Alternatives considered:** extracting a shared auth store/router package immediately (rejected as premature abstraction for only two call sites).

### D5. Require bilateral verification during extraction

- Any shared extraction must be validated in both `apps/user-web` and `apps/admin-web` with lint, typecheck, and focused auth/router tests.
- **Why:** the main risk is silent divergence or import-surface breakage across the two apps.
- **Alternatives considered:** verifying only the app that first adopts the shared module (rejected because this refactor exists specifically to keep both apps aligned).

## Risks / Trade-offs

- **[Risk] Shared Vue exports add component build/typecheck complexity to `@gitiempo/web-shared`.** -> Mitigation: keep components small, export source SFCs deliberately, and verify both consuming SPAs plus the shared package.
- **[Risk] Over-extracting UI could make future app-specific UX changes slower.** -> Mitigation: keep route-level views and major layout composition local; only extract components with two stable call sites.
- **[Risk] Form validation may accidentally become app-specific inside shared components.** -> Mitigation: keep browser-only shared schemas generic and keep app-specific copy, redirects, and store orchestration in consuming views.
- **[Risk] Adding `@primevue/forms` expands package and test surface area.** -> Mitigation: scope adoption to shared auth forms first, wire it with Zod resolvers, and verify both consuming SPAs plus the shared package.
- **[Risk] Partial migration can leave old and new helper patterns coexisting.** -> Mitigation: migrate both SPAs within the same change and remove superseded local copies before closing the work.

## Migration Plan

1. Create the shared frontend package and expose only the initial leaf APIs.
2. Migrate `user-web` and `admin-web` to the shared leaf modules in the same branch.
3. Make `@gitiempo/web-shared` component-aware for small shared Vue SFC exports.
4. Compare login/shell/profile regions and extract only justified shared PrimeVue micro-components.
5. Add or move shared browser-only Zod form schemas for extracted shared forms.
6. Remove deprecated Zod helper usage from the shared validation path.
7. Evaluate duplicate placeholder/login-presentational blocks for extraction into `@gitiempo/web-shared`.
8. Evaluate duplicated authenticated header chrome for extraction into a shared prop-driven header component.
9. Run canonical Tailwind class review on new/touched shared header markup and replace canonical equivalents before closure.
10. Register shared component source paths with Tailwind in both SPA CSS entries and document the requirement.
11. Evaluate duplicated authenticated navigation for extraction into a shared text-only navigation component using `user-web` as the base.
12. Remove the shared header settings/profile action and update consuming shells/tests accordingly.
13. Add targeted Tailwind ESLint rules for shared frontend markup and verify lint output stays scoped to the frontend packages.
14. Autofix class ordering warnings in `@gitiempo/web-shared`, `user-web`, and `admin-web`, then apply a small manual pass for safe canonical replacements.
15. Re-run focused frontend lint checks and confirm any remaining warnings are intentional fidelity exceptions.
16. Remove duplicated local helpers and markup once both SPAs compile and tests pass.

## Open Questions

- Which first shared UI component should lead the migration: the auth sign-in form is the strongest candidate because both SPAs have the same structure and behavior with only copy/placeholder differences.
- Whether the login hero/supporting-card region remains stable enough for a shared prop-driven component once the real product copy starts to diverge.
- Whether the user app header settings icon should link to Profile, while the admin app header icon links to Settings.
- Whether shared mobile bottom navigation should keep the current admin limit of five items or render all text-only items consistently with the chosen user-web base.
- Whether `WorkspaceHeaderIdentity.vue` still deserves a separate shared component after the header simplification, or should be folded into `WorkspaceHeader` during the Tailwind cleanup pass.
