## Context

`apps/user-web` and `apps/admin-web` currently duplicate several frontend auth and navigation leaves almost line-for-line: auth HTTP client helpers, current-user client helpers, refresh-token storage, workspace-link resolution, and matching auth runtime wiring. The two login pages and authenticated shells also contain smaller structurally similar UI regions, but they are not fully identical products and should not be forced into a single large abstraction.

The nearest app guidance already requires both SPAs to stay aligned on auth direction, while `docs/TECHNICAL-REQUIREMENTS.md` treats shared frontend behavior as a product expectation across both web apps. This change is frontend-only and must not alter backend endpoints, contracts, or auth semantics.

## Goals / Non-Goals

**Goals:**
- Remove duplicated frontend leaf code that is already identical across `user-web` and `admin-web`.
- Create one shared frontend location for browser-only runtime helpers and small reusable UI pieces consumed by both SPAs.
- Keep auth behavior, redirect rules, and cross-app navigation semantics unchanged while reducing drift risk.
- Evaluate current shell/login similarity and extract only the parts with two real call sites and stable behavior.

**Non-Goals:**
- Changing backend auth, API contracts, or shared Zod schemas.
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

### D3. Treat shared Vue components as optional second-wave extraction, not a prerequisite

- Shared Vue components should be introduced only for the small login/shell regions that are materially the same after comparing both apps, such as a shared auth-panel structure or shared shell identity/cross-link block.
- Full-page login views and full authenticated shells remain app-local composition surfaces.
- **Why:** the two current pages are similar enough to justify reviewing component reuse, but not similar enough to justify a single monolithic shared page component.
- **Alternatives considered:** sharing the entire login page or shell component (rejected because copy, nav structure, icons, and app-specific route composition already differ).

### D4. Preserve app-local orchestration boundaries

- `stores/auth.ts`, `router/index.ts`, route maps, and app-specific pages remain local even when they consume shared leaf modules.
- **Why:** this preserves debuggability and keeps each SPA free to evolve product behavior without coupling all auth/router decisions together.
- **Alternatives considered:** extracting a shared auth store/router package immediately (rejected as premature abstraction for only two call sites).

### D5. Require bilateral verification during extraction

- Any shared extraction must be validated in both `apps/user-web` and `apps/admin-web` with lint, typecheck, and focused auth/router tests.
- **Why:** the main risk is silent divergence or import-surface breakage across the two apps.
- **Alternatives considered:** verifying only the app that first adopts the shared module (rejected because this refactor exists specifically to keep both apps aligned).

## Risks / Trade-offs

- **[Risk] New shared frontend package adds one more dependency surface in the monorepo.** -> Mitigation: keep its scope narrow and limited to browser/runtime helpers and tiny UI building blocks with clear exports.
- **[Risk] Over-extracting UI could make future app-specific UX changes slower.** -> Mitigation: keep route-level views and major layout composition local; only extract components with two stable call sites.
- **[Risk] Partial migration can leave old and new helper patterns coexisting.** -> Mitigation: migrate both SPAs within the same change and remove superseded local copies before closing the work.

## Migration Plan

1. Create the shared frontend package and expose only the initial leaf APIs.
2. Migrate `user-web` and `admin-web` to the shared leaf modules in the same branch.
3. Compare login/shell regions and extract only any justified shared micro-components.
4. Remove duplicated local helpers once both SPAs compile and tests pass.

## Open Questions

- Whether the shared UI extraction should stop at utility/composable level in the first pass if the login/shell markup starts to diverge during implementation.
