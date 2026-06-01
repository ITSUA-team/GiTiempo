## Context

`admin-web` already has authenticated routing, a standalone `/403` page, a shared application shell, and a Pinia auth store that exposes the bootstrapped user profile. The missing layer is route-level authorization: product routes only check `requiresAuth`, while the backend already enforces role boundaries for admin-only and PM-safe endpoints.

While adding the admin role check, the `admin-web` and `user-web` routers now share materially identical auth bootstrap, guest-only redirect, redirect-target normalization, history selection, and router-factory logic. The app-specific route maps, route names, shells, Pinia instances, and auth stores remain local, but the protected-router leaf can move to `@gitiempo/web-shared` so both SPAs keep one implementation of the identical guard behavior.

Affected frontend rules come from `apps/admin-web/AGENTS.md`, `docs/ui/INDEX.md`, `docs/ui/layout.md`, and `docs/ui/pages-admin.md`. The approved design already includes an `Admin 403 Forbidden` standalone screen in `GITiempo.pen`, and the current `ForbiddenView` uses the shared route error panel to match that pattern.

## Goals / Non-Goals

**Goals:**

- Enforce route-level `admin-web` role access after session bootstrap and before mounting restricted product pages.
- Keep the existing standalone `/403` route as the role-denial destination for authenticated users.
- Hide admin shell navigation entries that the current profile role cannot open.
- Extract identical protected-router factory and auth-guard flow into `@gitiempo/web-shared` without moving app route maps or auth store orchestration.
- Keep route definitions, router tests, and shell tests as the primary regression coverage for this behavior.

**Non-Goals:**

- Do not replace backend RBAC or treat frontend checks as the security boundary.
- Do not change API contracts, database schema, OpenAPI, or backend guards.
- Do not add PM-safe versions of admin-only pages in this change.
- Do not change `user-web` routing behavior beyond moving the identical protected-router factory logic into a shared leaf.

## Decisions

1. Use `meta.allowedRoles` on `admin-web` routes.

   Route meta is already the router's source of truth for `requiresAuth` and `guestOnly`, and Vue Router exposes merged route meta for nested route records. Adding `allowedRoles?: readonly WorkspaceRole[]` keeps role requirements beside the route they protect. The app-owned `adminRouteAllowedRoles` matrix is typed as an exhaustive record for admin product route names while intentionally excluding login, `/403`, and 404 routes so future product routes must make an explicit role decision.

   Alternative considered: a separate `routeAccessPolicy` map keyed by route name. That can work if policy becomes larger, but it introduces an extra synchronization point and likely requires moving `routeNames` to avoid import cycles. The route meta approach is smaller and matches existing router conventions.

2. Check roles only after authentication succeeds.

   The guard should continue to bootstrap any `requiresAuth` or `guestOnly` route first. Anonymous users still go to login with redirect preservation. Only authenticated users with a resolved profile role are eligible for the `allowedRoles` check; missing, null, or disallowed roles route to `/403` as authorization failures rather than login.

   Alternative considered: redirect unknown roles to login. That would blur auth and authorization failures and could loop for valid authenticated users whose role is simply insufficient.

3. Treat `/403` and `/404` as authenticated standalone exceptions without `allowedRoles`.

   Error pages must remain reachable for any signed-in workspace member after bootstrap. Adding `allowedRoles` to `/403` would risk redirect loops when the user already lacks access to the original destination.

4. Filter shell navigation from resolved route metadata.

   `AdminAppShell` should derive visible nav items by resolving each route name and applying the same role helper used by the router guard. This keeps nav visibility aligned with route authorization without duplicating role arrays in the shell.

   The profile settings link also needs role-aware treatment because Settings is reached from the shell header rather than the sidebar. If the shared header cannot omit the settings item today, the implementation should either extend the shared component with a minimal optional setting or pass an alternate allowed route that does not expose a denied settings link. The smaller acceptable implementation is preferred if tests prove no denied Settings entry is visible for non-admin users.

5. Start with current page capabilities rather than ideal future role scopes.

   Dashboard and Reports are available to `admin` and `pm`. Members, Settings, Add Project, and current Projects page behavior are admin-only because they call admin-only member/workspace endpoints. Invoices remains admin-only until invoice requirements define PM access.

6. Share the protected-router factory, not the route map.

   `createProtectedRouter()` should live in `@gitiempo/web-shared` and accept app-owned route groups, `routeNames`, a shell component, an app Pinia instance, and an auth-store accessor. The shared factory owns only the identical history selection, route assembly, auth bootstrap, guest-only redirect, redirect normalization, and optional `allowedRoles` denial to the provided forbidden route. Each SPA still owns route names, route components, route metadata, shell composition, and auth store implementation.

   Alternative considered: keep app-local router factories and only move small helpers such as redirect normalization. That removes less duplication but still leaves two guard implementations that can drift when auth bootstrap or redirect behavior changes.

## Risks / Trade-offs

- Role metadata can drift from API permissions -> Cover route inventory and role-denial scenarios in router tests, and keep role arrays based on current page endpoint usage.
- Filtering navigation can hide a route while a direct URL still redirects -> This is intentional; direct access must hit the guard and land on `/403`.
- Missing profile after token restore could deny an otherwise valid user -> The existing session layer attempts to load `/users/me`; treating missing role as denied is safer than mounting restricted admin UI.
- Settings lives in the shared header, not the sidebar -> Add focused shell coverage to ensure non-admin users do not see a denied Settings affordance.
- Frontend RBAC may be mistaken for security enforcement -> Keep backend guards unchanged and document that frontend checks improve UX only.
- Shared router factory could blur app boundaries -> Keep only the proven-identical protected-router leaf shared, require app-local route groups and auth-store accessors, and cover both SPAs with router tests.
