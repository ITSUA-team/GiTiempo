## Why

Several `user-web` and `admin-web` route composables have grown into god-composables that mix server-state fetching, cache reconciliation, filters, dialog state, validation, formatting, toasts, confirmation side effects, and page orchestration. The largest examples are `useTimeEntriesPage.ts` at 909 lines, `useProjectsPage.ts` at 668 lines, and `useTopBarTimer.ts` at 603 lines, making routine changes risky and slow because unrelated responsibilities must be understood together.

This change introduces TanStack Vue Query as the shared server-state approach for both SPAs and refactors large route composables into focused feature modules so page-level composition stays readable and behavior remains testable. “Shared” means common tooling, cache rules, and small proven-identical leaves; product-specific page orchestration and domain behavior remain app/feature-owned.

## What Changes

- Add `@tanstack/vue-query` to both `apps/user-web` and `apps/admin-web` and install `VueQueryPlugin` with app-local `QueryClient` instances.
- Move server-state reads and mutations from page god-composables into focused TanStack Query composables with stable query-key factories and explicit invalidation rules.
- Scope Query migration to the listed high-risk page/server-state surfaces; unrelated server-state owners such as Profile GitHub connection remain outside this change unless explicitly listed in tasks or specs.
- Split page logic by responsibility, including data queries, filters/query params, dialogs/forms/validation, timer ticking, mutation side effects, and pure formatters.
- Keep existing route/component public behavior stable for user dashboard, top-bar timer, time entries, projects list, admin dashboard, reports, settings, and any smaller touched composables.
- Preserve existing fetch-boundary clients, auth-token handling, Zod validation, toast feedback, confirmation flows, loading/empty/request-error states, and design-system UI behavior.
- Add focused tests for query-key behavior, enabled query gating, mutation invalidation, composable boundary behavior, and route/view integration after the split.
- Do not add backend endpoints, database changes, shared API contract changes, or visual redesigns.

## Capabilities

### New Capabilities

- `frontend-server-state-composables`: Defines frontend server-state ownership, TanStack Vue Query usage, and composable boundary expectations for both web SPAs.

### Modified Capabilities

- None. Existing user/admin page requirements should continue to pass with the same visible behavior.

## Impact

- Affected apps: `apps/user-web` and `apps/admin-web`.
- Affected package manifests and lockfile: add `@tanstack/vue-query` to both web apps using pnpm, respecting the repository minimum release age policy.
- Affected bootstraps: `apps/user-web/src/main.ts` and `apps/admin-web/src/main.ts` install `VueQueryPlugin` with app-local QueryClient configuration.
- Affected user composables: `useTimeEntriesPage`, `useTopBarTimer`, `useProjectsPage`, `useDashboardOverview`, and related specs/components that import their types or return shape.
- Affected admin composables: `useAdminDashboardPage`, `useReportsData`, `useAdminSettingsPage`, and related specs/views where server state or mutations are handled.
- Potential shared frontend code: QueryClient test helpers, pure date/time formatters, and browser-only helpers may move to `packages/web-shared` only when behavior is proven identical across both SPAs; broad shared page/domain query orchestration is out of scope.
- Verification impact: both frontend app lint/typecheck/test suites are required; focused composable/view tests must cover the refactor boundaries before the change is complete.
