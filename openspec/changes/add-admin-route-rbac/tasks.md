## 1. Route RBAC Metadata

- [x] 1.1 Extend `apps/admin-web/src/router/route-meta.d.ts` with typed `allowedRoles?: readonly WorkspaceRole[]` metadata.
- [x] 1.2 Add a small shared RBAC helper that accepts route `allowedRoles` plus the current profile role and returns whether access is allowed.
- [x] 1.3 Annotate authenticated admin product routes with role requirements: admin/PM for Dashboard and Reports, admin-only for Members, Projects, Add Project, Settings, and Invoices.
- [x] 1.4 Keep `/403`, authenticated 404, and login route metadata free from product-page `allowedRoles` restrictions that could create redirect loops.

## 2. Router Guard Behavior

- [x] 2.1 Update `handleAuthNavigation` to run the role check only after auth bootstrap and authenticated-session validation.
- [x] 2.2 Redirect authenticated users with missing or disallowed roles to `routeNames.forbidden`.
- [x] 2.3 Preserve anonymous-user login redirects and existing guest-only authenticated redirects.

## 3. Admin Shell Navigation

- [x] 3.1 Filter sidebar and mobile shell navigation items using resolved route metadata and the shared RBAC helper.
- [x] 3.2 Ensure the profile Settings affordance is hidden or otherwise unavailable when the current role cannot open the Settings route.
- [x] 3.3 Preserve active Projects navigation behavior for allowed users on `/projects/new`.

## 4. Regression Coverage

- [x] 4.1 Add router tests for member denial, PM access to PM-allowed routes, PM denial on admin-only routes, admin access to admin-only routes, and standalone `/403` reachability.
- [x] 4.2 Update route inventory tests to assert expected `allowedRoles` metadata without weakening existing `requiresAuth` and `guestOnly` assertions.
- [x] 4.3 Add shell tests for admin full navigation, PM filtered navigation, and hidden Settings affordance for non-admin roles.

## 5. Verification

- [x] 5.1 Run `pnpm --filter admin-web lint`.
- [x] 5.2 Run `pnpm --filter admin-web typecheck`.
- [x] 5.3 Run `pnpm --filter admin-web test`.
- [x] 5.4 Run `pnpm --filter @gitiempo/web-shared lint`.
- [x] 5.5 Run `pnpm --filter @gitiempo/web-shared typecheck`.
- [x] 5.6 Run `pnpm --filter @gitiempo/web-shared test`.
- [x] 5.7 Run `pnpm --filter user-web lint`.
- [x] 5.8 Run `pnpm --filter user-web typecheck`.

## 6. Shared Protected Router Factory

- [x] 6.1 Update OpenSpec design/specs to allow a shared protected-router leaf while preserving app-owned route maps, shells, and auth stores.
- [x] 6.2 Add `createProtectedRouter()` in `@gitiempo/web-shared` with injected route groups, route names, shell component, Pinia instance, and auth-store accessor.
- [x] 6.3 Refactor `admin-web` router creation to use the shared factory while preserving route inventory, role metadata, auth redirects, and `/403` denial behavior.
- [x] 6.4 Refactor `user-web` router creation to use the shared factory while preserving invite, login, protected-route, and authenticated 403/404 behavior.
- [x] 6.5 Add shared protected-router tests for route assembly, anonymous redirect preservation, authenticated guest redirect handling, invalid redirect fallback, role denial, and unrestricted protected routes.

## 7. Shared Router Verification

- [x] 7.1 Run `pnpm --filter @gitiempo/web-shared lint`.
- [x] 7.2 Run `pnpm --filter @gitiempo/web-shared typecheck`.
- [x] 7.3 Run `pnpm --filter @gitiempo/web-shared test`.
- [x] 7.4 Run `pnpm --filter admin-web lint`.
- [x] 7.5 Run `pnpm --filter admin-web typecheck`.
- [x] 7.6 Run `pnpm --filter admin-web test`.
- [x] 7.7 Run `pnpm --filter user-web lint`.
- [x] 7.8 Run `pnpm --filter user-web typecheck`.
- [x] 7.9 Run `pnpm --filter user-web test`.
