## 1. Route RBAC Metadata

- [x] 1.1 Extend `apps/admin-web/src/router/route-meta.d.ts` with typed `allowedRoles?: readonly WorkspaceRole[]` metadata.
- [x] 1.2 Add a small admin-router RBAC helper that accepts route `allowedRoles` plus the current profile role and returns whether access is allowed.
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
