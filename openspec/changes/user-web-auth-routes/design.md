## Context

`apps/user-web` currently mounts Vue Router inline in `src/main.ts` with an empty route list. The project docs already define the user-facing pages, the shared shell layout, and the auth architecture: Firebase Auth runs on the frontend, the backend exchanges a Firebase ID token for an API access/refresh token pair, the access token stays in memory, and the refresh token persists in `localStorage`.

Issue #73 asks for the user-web auth route and session bootstrap flow so later page implementation can mount into a stable app structure instead of placeholders. The approved Login screen in `GITiempo.pen` also defines the expected entry surface: a dedicated `/login` route with a split hero/form layout and both email/password and Google SSO affordances.

This change is confined to `apps/user-web`, but it must stay aligned with existing backend auth behavior and the documented UI shell requirements in `docs/ui/layout.md` and `docs/ui/pages-user.md`.

## Goals / Non-Goals

**Goals:**

- Establish a concrete route inventory for `apps/user-web` that covers login and all authenticated user pages.
- Define a single auth bootstrap path that runs before protected navigation settles.
- Define how route guards use auth bootstrap state to avoid redirect flicker and inconsistent startup behavior.
- Define the ownership split between the public login route and the protected app-shell route tree.
- Keep the frontend auth plan consistent with the documented token lifecycle and the approved Login screen.

**Non-Goals:**

- Implement backend auth endpoints or change backend token semantics.
- Define full API client architecture beyond the minimum auth service/store contract needed for routing.
- Implement all user pages in detail; protected pages can start as route stubs mounted inside the app shell.
- Add role-based route branching for admin or PM flows; this change is only for `user-web` member-facing routing.

## Decisions

### 1. Extract router setup from `src/main.ts` into `src/router/index.ts`

The router should become a dedicated module so route inventory, metadata, and guards have a single home. `main.ts` should remain responsible for app creation, Pinia install, router install, PrimeVue install, and mounting.

Why this approach:

- It matches the documented app structure expectation in `apps/user-web/AGENTS.md`.
- It keeps route definitions and auth guard logic out of bootstrap wiring.
- It gives later page work a stable place to extend route metadata and nested routes.

Alternative considered:

- Keep the router inline in `main.ts`. Rejected because auth guard logic and route metadata would quickly make bootstrap code harder to reason about.

### 2. Model the route tree as one public login route plus one protected shell route

The route plan should use:

- `/login` as the only public route.
- A protected root route (`/`) that renders an authenticated shell layout.
- Child routes under the shell for dashboard, timer, time entries, project view, and profile.

This aligns with `docs/ui/layout.md`, which describes a shared top bar, sidebar, and main-content area for user pages. Putting protected pages under a single shell avoids duplicating shell chrome or forcing each view to decide how to mount itself.

Alternative considered:

- Put every authenticated page at the top level and let each page render its own shell wrapper. Rejected because it duplicates chrome structure and weakens guard/layout ownership.

### 3. Use explicit route metadata for auth requirements

Each route should declare whether it requires authentication or guest-only behavior using route metadata, and a single global `beforeEach` guard should enforce it.

Expected behavior:

- Protected routes (`requiresAuth: true`) redirect anonymous users to `/login`.
- The login route (`guestOnly: true`) redirects authenticated users to the dashboard entry route.
- The redirect should preserve the originally requested destination so the app can resume intended navigation after successful login.

Alternative considered:

- Hardcode path-based checks inside the guard. Rejected because it couples guard logic to route strings and becomes brittle as the route tree grows.

### 4. Bootstrap the session before protected navigation resolves

The auth store should expose a single bootstrap action that runs once during startup and resolves one of three states:

- authenticated session restored
- anonymous session confirmed
- bootstrap failed and anonymous fallback applied

The router guard should await bootstrap completion before deciding whether a protected route is allowed. This avoids the common SPA failure mode where the first navigation redirects to `/login` before a stored refresh token can restore the session.

Why this approach:

- It matches the documented refresh-token persistence model in `docs/TECHNICAL-REQUIREMENTS.md`.
- It keeps startup behavior deterministic.
- It avoids a race between initial route resolution and refresh-token restoration.

Alternative considered:

- Start navigation immediately and let pages self-heal after mount. Rejected because it produces redirect flicker and spreads auth responsibility across pages.

### 5. Keep access token in-memory and refresh token in `localStorage` through the auth store boundary

The auth store should be the only place that reads or writes the refresh token and the only place that owns the current access token. Service functions can perform API calls, but route guards and views should consume high-level store state such as `isAuthenticated`, `isBootstrapping`, and `bootstrapComplete`.

Why this approach:

- It matches the documented token-storage rules.
- It keeps token persistence and cleanup logic centralized.
- It reduces the chance that route code or view code bypasses rotation/logout rules.

Alternative considered:

- Read refresh token directly inside router code. Rejected because it leaks storage concerns into navigation logic.

### 6. Implement the login page to match the `.pen` screen while keeping auth wiring minimal

The login page should follow the approved `Login` screen structure:

- Left hero panel with product branding, hero copy, and two feature cards.
- Right auth panel with email field, password field, primary sign-in button, secondary Google continuation button, and policy footer.

The initial implementation should focus on the approved structure and the auth store integration. Password reset, workspace selection, and non-happy-path auth UX can remain out of scope unless already required elsewhere.

Alternative considered:

- Use a temporary minimal form without matching the approved design. Rejected because the issue explicitly calls for alignment with the documented UI requirements and strict `.pen` design.

## Risks / Trade-offs

- [Bootstrap blocks first protected navigation] -> Keep bootstrap limited to refresh-token restoration and auth state normalization; do not load unrelated user data during startup.
- [Login implementation may outpace finalized API client contracts] -> Define the store against the existing documented auth endpoints and keep API calls behind a thin local service boundary.
- [Redirect loops if route metadata is inconsistent] -> Keep public/guest/protected ownership centralized in router definitions and cover guard behavior with route-level tests.
- [Approved Login screen includes affordances like "Forgot?" that may not have backend support yet] -> Render unsupported secondary affordances as non-navigating placeholders until a recovery flow is specified.
- [Future role-aware routing may need additional branching] -> Keep this change focused on `user-web` member routes and design the metadata so more route policies can be added later without rewriting the tree.

## Migration Plan

This is a frontend-only additive change with no data migration.

1. Add router, auth store, login view, and protected shell structure in `apps/user-web`.
2. Register startup bootstrap through the app bootstrap and route guard path.
3. Verify the route tree, login entry flow, and anonymous redirect behavior locally.
4. If rollout needs to pause, revert the user-web route/auth files without affecting backend behavior or persisted data.

## Open Questions

- Should the "Forgot?" affordance on the Login screen remain visually present but inactive for M1, or should it be hidden until password recovery is specified?
- Should post-login redirect default to the dashboard root only, or should it restore a previously requested protected route whenever possible?
- Is a loading gate or splash state required while bootstrap is running, or is an unrendered route transition acceptable for M1?
