## MODIFIED Requirements

### Requirement: Shared Frontend Extraction Preserves App-Level Ownership

The frontend codebase MUST keep route-level composition and app-specific orchestration local unless a larger abstraction has at least two stable call sites and no product-specific behavior leakage.

#### Scenario: App-specific orchestration remains local

- **WHEN** the two SPAs consume shared frontend leaves
- **THEN** each app still owns its own route map, route names, route metadata, auth store orchestration, and page composition
- **AND** shared extraction does not force a single monolithic store, route inventory, shell, or login page across both apps
- **AND** behaviorally identical protected-router guard and factory logic may be implemented by a shared frontend leaf when both SPAs inject their app-local route groups, shell component, Pinia instance, and auth-store accessor

## ADDED Requirements

### Requirement: Shared Protected Router Factory

The frontend codebase SHALL use one shared protected-router factory for auth bootstrap, protected-route redirects, guest-only redirects, default authenticated redirects, and optional role-denial redirects when that behavior is identical across `user-web` and `admin-web`.

#### Scenario: Shared factory preserves app-owned route structure

- **WHEN** `user-web` or `admin-web` creates its router
- **THEN** it passes app-local route groups, route names, and shell component into the shared protected-router factory
- **AND** app-specific route components, route names, route metadata, and shell composition remain defined by the consuming SPA

#### Scenario: Shared factory preserves auth redirect behavior

- **WHEN** an anonymous session opens a protected route in either SPA
- **THEN** the shared router guard waits for auth bootstrap and redirects to the app's login route with the requested destination preserved
- **AND** when an authenticated session opens a guest-only route, the guard redirects to a valid preserved in-app redirect target or to the app's default authenticated route

#### Scenario: Shared factory preserves public authenticated guest flows

- **WHEN** `user-web` defines public invite or password-setup routes that are not guest-only routes
- **THEN** the shared router factory keeps those routes outside the authenticated shell route group
- **AND** the shared router guard does not redirect an already-authenticated session away from those routes solely because the session is authenticated
- **AND** the shared router guard does not apply product-role restrictions to those public guest-flow routes

#### Scenario: Shared factory supports admin role denials without affecting user-web

- **WHEN** an authenticated `admin-web` user opens a protected route with `allowedRoles` metadata that excludes the current profile role
- **THEN** the shared router guard redirects to the app-provided forbidden route
- **AND** protected routes without `allowedRoles`, including `user-web` routes and standalone admin error routes, keep their existing authenticated routing behavior
