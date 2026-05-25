## Context

The web apps currently use Vue 3 Composition API, Pinia for application/auth state, PrimeVue/Tailwind for UI, and app-local HTTP clients for API boundaries. Server-state is mostly managed manually inside route composables: explicit `loading`/`requestError` refs, imperative load functions, mutation functions that reload data, and one-off reconciliation logic.

The worst offenders are in `apps/user-web/src/composables`: `useTimeEntriesPage.ts` is 909 lines, `useProjectsPage.ts` is 668 lines, `useTopBarTimer.ts` is 603 lines, and `useDashboardOverview.ts` is 471 lines. Admin composables are smaller but still contain mixed responsibilities such as dashboard data derivation, reports data loading, and settings save orchestration. These modules are hard to reason about because a developer changing filters or formatters must read code for API loading, validation, toasts, dialog state, and cache refresh behavior.

TanStack Vue Query v5 is the right fit for the server-state portion of this problem. Current docs show Vue apps installing `VueQueryPlugin`, optionally with an app-provided `QueryClient`/`queryClientConfig`; composables use `useQuery`, `useMutation`, reactive query keys, reactive `enabled`, `useQueryClient`, and `invalidateQueries` after successful mutations.

This change is frontend-only. Existing backend endpoints, contracts, auth direction, UI designs, and PrimeVue surfaces remain the source of truth. The nearest app instructions for `apps/user-web`, `apps/admin-web`, and `packages/web-shared` apply: route-level page composition remains app-local, shared extraction is limited to stable small leaves, and both SPAs must be verified when shared frontend helpers change.

## Goals / Non-Goals

**Goals:**

- Install and configure TanStack Vue Query independently in both SPAs.
- Make server-state reads and mutations explicit through focused query/mutation composables and stable query-key factories.
- Split god-composables into single-responsibility modules for data, filters, dialogs/forms, validation, timer ticking, mutation side effects, and pure formatters.
- Keep route/view public return contracts stable where practical while moving internals behind focused composables.
- Preserve existing user-visible behavior, including loading skeletons, empty states, request-error states, toasts, confirmation dialogs, save/cancel flows, pagination, filters, and timer behavior.
- Improve testability with focused tests for query keys, enabled query behavior, mutation invalidation, pure helpers, and page assembly.

**Non-Goals:**

- No backend, database, seed, migration, OpenAPI, or shared contract changes.
- No visual redesign and no approved `.pen` screen changes.
- No migration from Pinia for auth/application state; TanStack Query owns server state only.
- No replacement of local form/dialog/filter state with TanStack Query cache state.
- No broad shared abstraction that merges user/admin page orchestration across apps.

## Decisions

1. Use TanStack Query for server state only.

   Server data, paginated lists, detail summaries, and mutation reconciliation move into `useQuery`/`useMutation`. Local UI state such as dialog visibility, form drafts, validation errors, selected date ranges, confirm prompts, timer elapsed ticks, and table-only discovery filters stays in focused Vue composables or pure utilities.

   Alternative considered: move everything into TanStack Query to minimize local refs. Rejected because query cache is not a form/dialog state container and would make transient UI state harder to reset, validate, and test.

2. Configure one app-local QueryClient per SPA.

   `apps/user-web/src/main.ts` and `apps/admin-web/src/main.ts` install `VueQueryPlugin` with a local `QueryClient` or `queryClientConfig`. Each app owns defaults such as retry policy and stale time so app-specific UX remains local. Tests use per-test QueryClient instances with retries disabled to avoid cache leakage and flaky async timing.

   Alternative considered: place QueryClient configuration in `packages/web-config`. Rejected initially because no shared behavior is proven yet beyond dependency setup; shared extraction can happen later only if both apps converge on identical configuration.

3. Add query-key factories near feature data ownership.

   Query keys should be typed arrays created by feature-local factories such as `timeEntriesKeys`, `timerKeys`, `projectsKeys`, `dashboardKeys`, `reportsKeys`, and `settingsKeys`. Keys include all server-scope inputs that affect the request, such as auth/workspace identity, filters, pagination, and report date windows. Reactive refs or computed inputs are passed in ways compatible with Vue Query reactive query keys.

   Alternative considered: inline string keys in each composable. Rejected because invalidation becomes fragile and duplicated across mutations.

4. Keep fetch-boundary clients as the only API transport layer.

   Query functions call existing app clients or narrow client interfaces. This preserves current request paths, auth headers, payload validation, response parsing, and repository error-message behavior. Query composables should not duplicate URL construction or JSON parsing.

   Alternative considered: create a generic shared fetch helper while doing the refactor. Rejected because this change is already broad; transport consolidation should only happen when it removes a concrete duplicate boundary without changing API semantics.

5. Split by feature responsibility, not by framework primitive.

   The target shape for large areas is small modules with names that describe business responsibility:

   - Time entries: data/query module, filter/query-state module, dialog/form module, mutation/actions module, grouping/formatting utilities.
   - Top-bar timer: timer summary query, task-picker data query, task-picker state, task creation mutation, timer start/stop mutations, elapsed-time ticker/formatter.
   - User projects: visible projects/tasks query, combined search/filter module, task dialog module, task mutation/delete module, grouping helpers.
   - User dashboard: overview queries, weekly summary derivation, recent-entry mapping, state assembly.
   - Admin dashboard: role-scoped query modules, metric derivation, activity mapping.
   - Reports: setup state, report data query, export mutation/action, table-only discovery filters.
   - Settings: workspace/settings queries, form state/validation, save mutation orchestration.

   Alternative considered: split files mechanically by line count. Rejected because smaller files with mixed responsibilities still preserve the god-composable problem.

6. Preserve page assembly through thin route-level composition.

   Existing views should compose focused modules and pass state to presentational components. Where compatibility wrappers remain useful, the old route composable names may stay as thin aggregators, but they should stop owning data fetching, validation, formatting, and mutation side effects directly.

   Alternative considered: rewrite views to consume every leaf composable directly immediately. Rejected where it would create noisy view churn without improving behavior; a thin aggregator can reduce implementation risk during migration.

7. Invalidation beats manual reloads by default.

   Mutations invalidate the specific affected keys through `queryClient.invalidateQueries`. Use direct `setQueryData` only for small authoritative updates where the mutation response fully determines the cache change. Creation, deletion, timer start/stop, settings save, report export, and task mutations must keep existing toast/error semantics while allowing Query to refresh affected server state.

   Alternative considered: call existing `loadX()` functions from mutation success handlers. Rejected because it keeps imperative cache orchestration and undercuts the Query migration.

8. Shared extraction remains leaf-only and evidence-based.

   Pure formatters and test helpers can move to `packages/web-shared` when both SPAs need identical behavior. Product-specific route orchestration, view-level composables, route maps, auth stores, and shell composition stay app-local.

   Alternative considered: create one shared frontend query package for all user/admin server state. Rejected because user/admin domains differ enough that a broad shared layer would hide product-specific rules and increase coupling.

## Risks / Trade-offs

- Broad refactor may cause behavior regressions -> Implement by vertical slices, preserve existing specs, and add page-level integration tests around assembled behavior.
- Query cache can leak between tests -> Use a per-test QueryClient provider/helper with retries disabled and clear cache after each test.
- Reactive query keys can become stale if plain values are captured too early -> Use Vue Query reactive keys and unwrap values inside query functions with the current reactive source.
- Mutations can over-invalidate and refetch too much -> Centralize key factories and invalidate only affected scopes.
- Toasts or confirms can duplicate across query callbacks and wrappers -> Keep user-visible side effects in one action/mutation owner per feature.
- Initial loading and background fetching states differ from existing manual booleans -> Map Query states deliberately so first-load skeletons, retryable failures, empty states, and background refetches remain distinct.
- Adding a new dependency may be blocked by `.npmrc` minimum-release-age -> Use a version already older than 7 days and verify lockfile changes through pnpm.
- Splitting every touched composable can grow public exports -> Keep exports narrow, prefer feature folders, and avoid barrels that expose internal transport/query primitives broadly.

## Migration Plan

1. Install `@tanstack/vue-query` in both web apps and wire `VueQueryPlugin` in each app bootstrap.
2. Add app-local or shared test helpers for QueryClient providers with retries disabled.
3. Refactor one vertical slice at a time, starting with query-key factories and read-only queries before mutations.
4. Convert mutations to `useMutation` and invalidate or update affected keys.
5. Split pure utilities and local-state modules from the largest composables before removing duplicated logic.
6. Keep existing route composable entry points as thin compatibility aggregators until views/tests are updated safely.
7. Run focused tests after each slice, then both app lint/typecheck/test suites.

Rollback is straightforward because this is frontend-only: revert the dependency, plugin setup, and refactored modules. No persisted data or backend contract migration is required.

## Open Questions

- None blocking. The implementation may choose exact stale-time/retry defaults per app after inspecting current UX expectations and tests.
