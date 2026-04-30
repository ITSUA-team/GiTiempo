## Context

The current frontend cross-workspace link behavior is implemented through `getCounterpartWorkspaceHref` in `packages/web-shared` plus repeated call sites in both SPA shells and login views. Those call sites currently pass hardcoded local ports such as `5173` and `5174`, but the repo does not define those ports in a canonical Vite config or shared frontend config file. As a result, local workspace switching depends on duplicated assumptions spread across runtime code, env examples, and tests.

This change is frontend-only. It touches `apps/user-web`, `apps/admin-web`, and `packages/web-shared`, and follows the repo guidance that shared browser/runtime leaves belong in `packages/web-shared` while app-local orchestration remains in each SPA.

## Goals / Non-Goals

**Goals:**
- Make counterpart workspace URLs explicit and consistent across both SPAs.
- Remove repeated hardcoded localhost port literals from app feature code.
- Keep cross-workspace links working in authenticated shells and login entry surfaces.
- Align frontend tests and env examples with the same source of truth.

**Non-Goals:**
- No backend env validation or `apps/api` runtime changes.
- No changes to invite delivery URLs or API-facing application URLs.
- No redesign of cross-workspace navigation placement or auth behavior.

## Decisions

### 1. Prefer explicit frontend env configuration over implicit inline localhost fallbacks

Both SPAs already support configured counterpart app URLs through `VITE_ADMIN_APP_URL` and `VITE_USER_APP_URL`. This change should make those env values the primary documented source of truth for workspace switching instead of treating inline localhost ports as the de facto contract.

Alternative considered:
- Keep the current behavior and only deduplicate port constants. Rejected because it still leaves local port assumptions implicit and brittle.

### 2. Keep URL-resolution logic shared, but move port or fallback policy out of app views

The shared helper in `packages/web-shared` remains the right place for counterpart URL resolution, but the SPAs should not each carry repeated `localhostPort` literals in their shell and login surfaces. Either the helper should operate from explicit configured URLs only, or any remaining local fallback policy should be centralized behind one shared source rather than repeated at each call site.

Alternative considered:
- Inline counterpart URL composition directly in each app. Rejected because it increases duplication and weakens shared behavior guarantees.

### 3. Update tests to assert against the same configured URL strategy

Current tests hardcode full localhost links in multiple files. They should instead derive expectations from the same helper inputs or shared test constants so a future local URL adjustment only needs one coordinated update.

Alternative considered:
- Leave tests hardcoded while changing runtime behavior. Rejected because it preserves the same drift problem in the test suite.

## Risks / Trade-offs

- [Missing local env values break workspace links during development] -> Mitigate by documenting both counterpart URL env vars in the SPA `.env.example` files and keeping tests explicit about the expected configuration.
- [Changing shared URL-resolution behavior may affect both SPAs at once] -> Mitigate by updating both app shells, both login surfaces, and the shared helper in one change with focused frontend tests.
- [Removing fallback behavior entirely may reduce convenience in ad hoc local runs] -> Mitigate by deciding explicitly whether to keep one centralized local fallback path or require env values in local development, and documenting that choice in the design implementation.
