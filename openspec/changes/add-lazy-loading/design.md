## Context

This change affects the Vue Router configuration in `apps/user-web` and `apps/admin-web`. Both apps currently import every route view at the top of `src/router/index.ts`, which makes Vite include all view modules in the initial route bundle even when the first navigation only needs the login page or one authenticated page.

Relevant local guidance is in `apps/user-web/AGENTS.md` and `apps/admin-web/AGENTS.md`. The change is frontend-only, does not alter visible page design, and does not require `docs/ui/*` or approved `.pen` design updates. Auth behavior must stay aligned across both SPAs: Firebase Auth on the frontend, backend token exchange, refresh-token bootstrap, and existing logout cleanup.

Current implementation scope:

- `apps/user-web/src/router/index.ts` eagerly imports `DashboardView`, `TimeEntriesView`, `ProjectView`, `ProfileView`, invite views, `ForbiddenView`, `NotFoundView`, `LoginView`, and `AppShell`.
- `apps/admin-web/src/router/index.ts` eagerly imports all admin product views, `ForbiddenView`, `NotFoundView`, `LoginView`, and `AdminAppShell`.
- Router specs currently assert route inventory, shell grouping, protected-route redirects, guest-only login redirects, and standalone 403/404 behavior.

## Goals / Non-Goals

**Goals:**

- Reduce initial frontend JavaScript by lazy-loading route view components that are not needed for the initial public entry route.
- Preserve every existing route path, name, auth meta field, redirect rule, and shell grouping behavior.
- Keep the implementation idiomatic for Vue Router by using route component loader functions that return dynamic `import()` promises.
- Keep `LoginView` eager because it is the immediate public entry screen for unauthenticated users.
- Keep app shell layout components eager because they are small routing/layout composition surfaces needed for normal authenticated app entry.
- Update tests so they verify lazy route loaders and wait for lazy navigation resolution where needed.

**Non-Goals:**

- No route inventory redesign, route name changes, or navigation guard rewrite.
- No backend, database, OpenAPI, Firebase, or shared Zod contract changes.
- No new loading UI, global route transition indicator, prefetch system, or manual chunk grouping.
- No lazy-loading of non-route leaf components as part of this change.
- No PrimeVue, Tailwind, or visual design changes.

## Decisions

### Use Vue Router dynamic import route loaders

Define lazy route components with direct dynamic imports:

```ts
const DashboardView = () => import("@/views/DashboardView.vue");
```

Use those constants in route records exactly where the imported component is currently used. This follows Vue Router's route-level lazy-loading model and lets Vite/Rollup create separate chunks for route views.

Alternative considered: wrap route views in `defineAsyncComponent`. This is not the right primitive for route records; Vue Router expects a function returning a Promise and handles route component loading itself.

### Keep login and shell components eager

`LoginView` stays as a static import in both SPAs because unauthenticated users can land there directly and should not pay an additional dynamic chunk request before seeing the login screen. `AppShell` and `AdminAppShell` also stay eager because they own authenticated layout composition while child product pages become lazy.

Alternative considered: lazy-load every view, including login and shells. That would minimize static imports but would penalize the most common public entry path and add little value for small layout shells.

### Lazy-load product, invite, and error route views

The implementation should convert these route views to lazy loaders:

- User web: `DashboardView`, `TimeEntriesView`, `ProjectView`, `ProfileView`, `InviteAcceptView`, `InvitePasswordSetupView`, `ForbiddenView`, and `NotFoundView`.
- Admin web: `DashboardView`, `ReportsView`, `InvoicesView`, `MembersView`, `ProjectsView`, `AddProjectView`, `SettingsView`, `ForbiddenView`, and `NotFoundView`.

This keeps rare or non-entry pages out of the initial route bundle while preserving route-level behavior.

Alternative considered: only lazy-load authenticated child routes and keep invite/error views eager. That is less effective and keeps low-frequency routes in the initial bundle without a strong UX benefit.

### Avoid manual chunk grouping initially

Rely on Vite/Rollup's default dynamic import code splitting first. Manual chunks can be added later only after bundle analysis shows too many small chunks or a repeated route group would benefit from explicit grouping.

Alternative considered: create shared `user-views` or `admin-views` chunks immediately. That can accidentally re-bundle unrelated pages together and reduce the benefit of lazy-loading before real bundle data exists.

### Update tests around lazy route functions and navigation timing

Router tests that compare `route.matched[0].components.default` to an imported component must change to assert that the route component is a function and that invoking it resolves to the expected module default.

View tests that submit login or invite flows and expect navigation to a lazy route must wait for the lazy route navigation to settle. Prefer a small test helper that waits for the expected route state over adding arbitrary repeated `flushPromises()` calls.

Alternative considered: remove component identity assertions from router tests. That would avoid lazy-loader mechanics but weaken coverage for standalone error/invite route wiring.

## Risks / Trade-offs

- First navigation to a lazy page adds a dynamic chunk request -> Mitigation: keep login and shell eager, lazy-load only route views, and defer prefetch/manual chunking until bundle data justifies it.
- Tests can become flaky if they assert route state before the lazy component resolves -> Mitigation: update navigation tests to wait for the expected route state and update router tests to resolve lazy loaders explicitly.
- Dynamic import typing can become noisy with `RouteRecordRaw` -> Mitigation: keep loader constants simple and let Vue Router's route component typing infer valid async components.
- Too many tiny chunks could hurt slow networks -> Mitigation: start with default Vite code splitting and evaluate build output later before adding manual chunk groups.
- A route view accidentally left eager will keep pulling page code into the initial bundle -> Mitigation: add focused router tests or review checks that assert non-login route records use lazy component functions.

## Migration Plan

- Replace static route-view imports with dynamic import loader constants in `apps/user-web/src/router/index.ts` and `apps/admin-web/src/router/index.ts`.
- Keep route records, route names, paths, meta, children, and navigation guards unchanged.
- Update router and affected view tests.
- Verify both SPAs with `pnpm --filter user-web lint`, `pnpm --filter user-web typecheck`, `pnpm --filter user-web test`, `pnpm --filter admin-web lint`, `pnpm --filter admin-web typecheck`, and `pnpm --filter admin-web test`.
- Rollback is straightforward: restore the static imports and route record component references if unexpected routing or bundling issues appear.

## Open Questions

- None for the initial implementation. Prefetching or manual chunk grouping should be considered only after build output or runtime metrics show a concrete need.
